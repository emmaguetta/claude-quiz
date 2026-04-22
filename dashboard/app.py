"""
Claude Quiz — Dashboard local.
Run: streamlit run app.py
"""
from __future__ import annotations

import os
from pathlib import Path
from datetime import datetime, timezone, timedelta

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import requests
import streamlit as st
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(ENV_PATH)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

EXCLUDED_EMAILS = {"emma.guetta@student-cs.fr", "emmaguetta@icloud.com"}

st.set_page_config(
    page_title="Claude Quiz — Dashboard",
    page_icon="📊",
    layout="wide",
)


def _headers() -> dict:
    return {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    }


def _fetch_table(table: str, select: str = "*") -> list[dict]:
    rows: list[dict] = []
    page = 0
    size = 1000
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers={**_headers(), "Range": f"{page*size}-{page*size+size-1}"},
            params={"select": select},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        rows.extend(data)
        if len(data) < size:
            break
        page += 1
    return rows


def _fetch_auth_users() -> list[dict]:
    users: list[dict] = []
    page = 1
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=_headers(),
            params={"page": page, "per_page": 1000},
            timeout=30,
        )
        r.raise_for_status()
        payload = r.json()
        batch = payload.get("users", payload if isinstance(payload, list) else [])
        if not batch:
            break
        users.extend(batch)
        if len(batch) < 1000:
            break
        page += 1
    return users


def _as_list(v) -> list:
    """Safe list cast: handles NaN, None, numpy arrays, lists."""
    if v is None:
        return []
    if isinstance(v, float):
        return []
    if isinstance(v, list):
        return v
    try:
        return list(v)
    except TypeError:
        return []


@st.cache_data(ttl=120, show_spinner="Chargement des données depuis Supabase...")
def load_data() -> dict:
    users_raw = _fetch_auth_users()
    users = pd.DataFrame([
        {
            "id": u["id"],
            "email": u.get("email"),
            "created_at": u.get("created_at"),
            "last_sign_in_at": u.get("last_sign_in_at"),
            "provider": (u.get("app_metadata") or {}).get("provider"),
        }
        for u in users_raw
    ])

    excluded_ids = set(users.loc[users.email.isin(EXCLUDED_EMAILS), "id"].tolist())

    profiles = pd.DataFrame(_fetch_table("profiles"))
    quiz_attempts = pd.DataFrame(_fetch_table("quiz_attempts"))
    deep_analysis = pd.DataFrame(_fetch_table("deep_analysis_usage"))
    ai_usage = pd.DataFrame(_fetch_table("ai_usage_logs"))
    questions = pd.DataFrame(_fetch_table("questions"))
    reports = pd.DataFrame(_fetch_table("reports"))

    users = users[~users.id.isin(excluded_ids)].copy()
    if not profiles.empty:
        profiles = profiles[~profiles.id.isin(excluded_ids)].copy()
    if not quiz_attempts.empty:
        quiz_attempts = quiz_attempts[~quiz_attempts.user_id.isin(excluded_ids)].copy()
    if not deep_analysis.empty:
        deep_analysis = deep_analysis[~deep_analysis.user_id.isin(excluded_ids)].copy()
    # ai_usage_logs: exclude rows where user_id matches excluded accounts.
    # NULL user_id = avant migration tracking → ne peut pas être filtré, on garde.
    if not ai_usage.empty and "user_id" in ai_usage.columns:
        ai_usage = ai_usage[
            ai_usage.user_id.isna() | ~ai_usage.user_id.isin(excluded_ids)
        ].copy()

    for df, col in [
        (users, "created_at"),
        (users, "last_sign_in_at"),
        (profiles, "created_at"),
        (quiz_attempts, "answered_at"),
        (deep_analysis, "created_at"),
        (ai_usage, "created_at"),
        (questions, "created_at"),
        (reports, "created_at"),
    ]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], utc=True, errors="coerce")

    return {
        "users": users,
        "profiles": profiles,
        "quiz_attempts": quiz_attempts,
        "deep_analysis": deep_analysis,
        "ai_usage": ai_usage,
        "questions": questions,
        "reports": reports,
        "excluded_count": len(excluded_ids),
    }


def _within(df: pd.DataFrame, col: str, delta: timedelta) -> pd.DataFrame:
    if df.empty or col not in df.columns:
        return df
    cutoff = datetime.now(timezone.utc) - delta
    return df[df[col] >= cutoff]


def _daily_counts(df: pd.DataFrame, ts_col: str, label: str) -> pd.DataFrame:
    """Return a df with columns [day (str), label (int)] sorted ascending.
    Fills missing days with 0 from min day found to today."""
    if df.empty or ts_col not in df.columns:
        return pd.DataFrame({"day": pd.Series(dtype=str), label: pd.Series(dtype=int)})
    d = df.dropna(subset=[ts_col]).copy()
    d["_day"] = pd.to_datetime(d[ts_col], utc=True).dt.strftime("%Y-%m-%d")
    counts = (
        d.groupby("_day").size().reset_index(name=label)
        .rename(columns={"_day": "day"})
    )
    if counts.empty:
        return pd.DataFrame({"day": pd.Series(dtype=str), label: pd.Series(dtype=int)})
    today = datetime.now(timezone.utc).date()
    all_days = pd.date_range(
        start=counts["day"].min(), end=today.isoformat(), freq="D"
    ).strftime("%Y-%m-%d").tolist()
    full_df = pd.DataFrame({"day": all_days})
    out = full_df.merge(counts, on="day", how="left")
    out[label] = out[label].fillna(0).astype(int)
    out = out.sort_values("day").reset_index(drop=True)
    return out


# ─── UI ──────────────────────────────────────────────────────────────────────

st.title("📊 Claude Quiz — Dashboard")

with st.sidebar:
    st.caption("Actions")
    if st.button("🔄 Rafraîchir les données", use_container_width=True):
        load_data.clear()
        st.rerun()
    st.caption("Comptes exclus :\n- " + "\n- ".join(sorted(EXCLUDED_EMAILS)))
    with st.expander("ℹ️ Méthodologie"):
        st.markdown(
            "**Sources Supabase :**\n"
            "- `auth.users` → inscriptions (admin API)\n"
            "- `profiles` → onboarding (activités, objectifs, usage_level)\n"
            "- `quiz_attempts` → chaque réponse à une question (+ session_id)\n"
            "- `deep_analysis_usage` → chaque deep analysis avec la **query** textuelle\n"
            "- `ai_usage_logs` → 1 ligne par appel IA (search, explain, deep-analyze)\n\n"
            "**Définitions :**\n"
            "- **DAU** = utilisateurs uniques avec ≥ 1 action (quiz ou deep analysis) dans les dernières 24h\n"
            "- **WAU** = pareil sur 7 jours\n"
            "- **MAU** = pareil sur 30 jours\n"
            "- **Stickiness** = DAU / MAU (plus c'est haut, plus les users reviennent)\n\n"
            "**Recherches MCP** = count de `ai_usage_logs.endpoint = '/api/mcp/search'`. "
            "Chaque recherche déclenche un embedding OpenAI qui est loggué. "
            "⚠️ Le **texte** de la query et l'**user_id** ne sont pas stockés pour les recherches normales — "
            "seules les **deep analyses** gardent la query complète."
        )

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    st.error(
        f"Impossible de trouver les credentials Supabase dans `{ENV_PATH}`. "
        "Vérifie que NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définis."
    )
    st.stop()

data = load_data()
users = data["users"]
profiles = data["profiles"]
attempts = data["quiz_attempts"]
deep = data["deep_analysis"]
ai = data["ai_usage"]
questions = data["questions"]
reports = data["reports"]

search_calls = ai[ai.endpoint == "/api/mcp/search"] if not ai.empty else pd.DataFrame()
explain_calls = ai[ai.endpoint == "/api/mcp/explain"] if not ai.empty else pd.DataFrame()

# Stats on pre-tracking logs (user_id NULL = recherches avant la migration user_id)
searches_with_user = search_calls[search_calls.user_id.notna()] if not search_calls.empty and "user_id" in search_calls.columns else pd.DataFrame()
searches_anonymous = search_calls[search_calls.user_id.isna()] if not search_calls.empty and "user_id" in search_calls.columns else pd.DataFrame()

st.caption(
    f"Données à jour · {len(users)} utilisateurs (après exclusion de "
    f"{data['excluded_count']} compte(s))"
)

tab_overview, tab_users, tab_personas, tab_quiz, tab_search = st.tabs([
    "🏠 Vue d'ensemble",
    "👤 Utilisateurs",
    "🧭 Personas & Onboarding",
    "❓ Quiz",
    "🔍 Recherches & IA",
])


# ─── Vue d'ensemble ──────────────────────────────────────────────────────────
with tab_overview:
    st.subheader("Indicateurs clés")
    day, week, month = timedelta(days=1), timedelta(days=7), timedelta(days=30)

    c1, c2, c3, c4, c5, c6 = st.columns(6)
    c1.metric(
        "Utilisateurs", len(users), f"+{len(_within(users, 'created_at', week))} / 7j",
        help="Count de `auth.users` (hors comptes exclus).",
    )
    c2.metric(
        "Onboardés", int(profiles.onboarded.sum()) if "onboarded" in profiles else 0,
        help="Count de `profiles` où `onboarded = true`.",
    )
    c3.metric(
        "Tentatives quiz", len(attempts), f"+{len(_within(attempts, 'answered_at', week))} / 7j",
        help="Nombre de lignes dans `quiz_attempts` (chaque réponse à une question).",
    )
    c4.metric(
        "Recherches MCP", len(search_calls), f"+{len(_within(search_calls, 'created_at', week))} / 7j",
        help="Appels à `/api/mcp/search` dans `ai_usage_logs`, hors comptes exclus (filtrés par user_id).",
    )
    c5.metric(
        "Deep analyses", len(deep), f"+{len(_within(deep, 'created_at', week))} / 7j",
        help="Nombre de lignes dans `deep_analysis_usage`. Contient user_id + query complète.",
    )
    cost = round(ai.cost_usd.sum(), 4) if not ai.empty else 0
    c6.metric("Coût IA (USD)", f"${cost}", help="Somme de `ai_usage_logs.cost_usd`.")

    st.divider()

    col_a, col_b = st.columns(2)

    with col_a:
        st.subheader("Activité (utilisateurs actifs)")
        st.caption(
            "**DAU** = Daily Active Users · **WAU** = Weekly · **MAU** = Monthly. "
            "Un user est « actif » s'il a fait ≥ 1 quiz ou ≥ 1 deep analysis sur la période."
        )
        actions = []
        if not attempts.empty:
            actions.append(attempts[["user_id", "answered_at"]].rename(columns={"answered_at": "ts"}))
        if not deep.empty:
            actions.append(deep[["user_id", "created_at"]].rename(columns={"created_at": "ts"}))
        active_actions = pd.concat(actions) if actions else pd.DataFrame(columns=["user_id", "ts"])
        if not active_actions.empty:
            dau = active_actions[active_actions.ts >= datetime.now(timezone.utc) - day].user_id.nunique()
            wau = active_actions[active_actions.ts >= datetime.now(timezone.utc) - week].user_id.nunique()
            mau = active_actions[active_actions.ts >= datetime.now(timezone.utc) - month].user_id.nunique()
            m1, m2, m3 = st.columns(3)
            m1.metric("DAU", dau, help="Daily Active Users — users uniques actifs sur les 24 dernières heures.")
            m2.metric("WAU", wau, help="Weekly Active Users — users uniques actifs sur les 7 derniers jours.")
            m3.metric("MAU", mau, help="Monthly Active Users — users uniques actifs sur les 30 derniers jours.")
            stickiness = round(100 * dau / mau, 1) if mau else 0
            st.caption(f"Stickiness DAU/MAU : {stickiness}% (> 20% = très collant)")
        else:
            st.info("Aucune activité enregistrée.")

    with col_b:
        st.subheader("Funnel d'activation")
        signed_up = len(users)
        onboarded = int(profiles.onboarded.sum()) if "onboarded" in profiles else 0
        did_quiz = attempts.user_id.nunique() if not attempts.empty else 0
        did_search_mcp = searches_with_user.user_id.nunique() if not searches_with_user.empty else 0
        did_deep = deep.user_id.nunique() if not deep.empty else 0
        steps = [
            ("Inscrits", signed_up),
            ("Onboardés", onboarded),
            ("Ont fait le quiz", did_quiz),
            ("Ont fait une recherche MCP", did_search_mcp),
            ("Ont fait une deep analysis", did_deep),
        ]
        base = max(signed_up, 1)
        labels_list = [s[0] for s in steps]
        values_list = [int(s[1]) for s in steps]
        texts_list = [f"{n} ({round(100 * n / base, 1)}%)" for n in values_list]
        fig = go.Figure(data=[go.Bar(
            y=labels_list[::-1],
            x=values_list[::-1],
            orientation="h",
            text=texts_list[::-1],
            textposition="outside",
            marker=dict(
                color=values_list[::-1],
                colorscale="Blues",
                cmin=0,
                cmax=max(values_list) if max(values_list) > 0 else 1,
            ),
            cliponaxis=False,
        )])
        fig.update_layout(
            height=340,
            margin=dict(l=0, r=0, t=10, b=0),
            xaxis=dict(title="utilisateurs", range=[0, max(values_list) * 1.15 if max(values_list) > 0 else 1]),
            yaxis=dict(title=""),
        )
        st.plotly_chart(fig, use_container_width=True)

    st.divider()

    def _render_daily(title: str, caption: str, source_df: pd.DataFrame, ts_col: str, label: str):
        daily = _daily_counts(source_df, ts_col, label)
        st.subheader(title)
        st.caption(caption)
        if daily.empty:
            st.info("Aucune donnée.")
            return None
        # Force native Python types to avoid plotly's binary typed-array encoding bug
        days = daily["day"].astype(str).tolist()
        values = [int(v) for v in daily[label].tolist()]
        fig = go.Figure(data=[go.Bar(
            x=days,
            y=values,
            text=[str(v) for v in values],
            textposition="outside",
            marker_color="#1f77b4",
            cliponaxis=False,
        )])
        fig.update_layout(
            height=340,
            margin=dict(l=0, r=0, t=10, b=0),
            xaxis=dict(type="category", title="date"),
            yaxis=dict(title=label),
        )
        st.plotly_chart(fig, use_container_width=True)
        with st.expander(f"📋 Données brutes ({label}) — total = {sum(values)}"):
            st.dataframe(daily, use_container_width=True, hide_index=True)
        return daily

    daily_signups = _render_daily(
        "Inscriptions par jour",
        "Logique : on prend chaque ligne de `auth.users`, on extrait la date de `created_at`, "
        "on compte combien de users inscrits par jour. Les jours sans inscription sont à 0.",
        users, "created_at", "inscriptions",
    )

    st.subheader("Inscriptions cumulées")
    st.caption(
        "Logique : somme cumulative (`cumsum`) des inscriptions par jour. "
        "La valeur finale doit être égale au total d'utilisateurs."
    )
    if daily_signups is not None and not daily_signups.empty:
        cumul = daily_signups.copy()
        cumul["total"] = cumul["inscriptions"].cumsum().astype(int)
        days = cumul["day"].astype(str).tolist()
        totals = [int(v) for v in cumul["total"].tolist()]
        fig = go.Figure(data=[go.Scatter(
            x=days, y=totals,
            mode="lines+markers+text",
            fill="tozeroy",
            text=[str(v) for v in totals],
            textposition="top center",
            line=dict(color="#1f77b4"),
        )])
        fig.update_layout(
            height=320,
            margin=dict(l=0, r=0, t=10, b=0),
            xaxis=dict(type="category", title="date"),
            yaxis=dict(title="total inscrits"),
        )
        st.plotly_chart(fig, use_container_width=True)
        st.caption(f"Total aujourd'hui : **{totals[-1]}** utilisateurs — doit matcher le KPI « Utilisateurs » ({len(users)}).")

    _render_daily(
        "Tentatives quiz par jour",
        "Logique : 1 ligne = 1 réponse à une question. On groupe par date de `answered_at`.",
        attempts, "answered_at", "tentatives",
    )

    _render_daily(
        "Recherches MCP par jour",
        "Logique : lignes de `ai_usage_logs` avec `endpoint = '/api/mcp/search'` (chaque recherche déclenche 1 embedding OpenAI qui est loggué).",
        search_calls, "created_at", "recherches",
    )


# ─── Utilisateurs ────────────────────────────────────────────────────────────
with tab_users:
    st.subheader("Tous les utilisateurs")

    merged = users.merge(profiles, left_on="id", right_on="id", how="left", suffixes=("", "_p"))

    if not attempts.empty:
        stats = attempts.groupby("user_id").agg(
            tentatives=("id", "count"),
            correctes=("is_correct", "sum"),
            sessions=("session_id", "nunique"),
            derniere_tentative=("answered_at", "max"),
        ).reset_index()
        stats["precision_%"] = (100 * stats["correctes"] / stats["tentatives"]).round(1)
        merged = merged.merge(stats, left_on="id", right_on="user_id", how="left")
    if not deep.empty:
        search_stats = deep.groupby("user_id").agg(deep_analyses=("id", "count")).reset_index()
        merged = merged.merge(search_stats, left_on="id", right_on="user_id", how="left", suffixes=("", "_s"))

    for col in ["tentatives", "correctes", "sessions", "deep_analyses"]:
        if col in merged.columns:
            merged[col] = merged[col].fillna(0).astype(int)

    q = st.text_input("🔍 Filtrer (email, nom, société)", "")
    if q:
        mask = merged.apply(
            lambda r: q.lower() in str(r.get("email", "")).lower()
            or q.lower() in str(r.get("first_name", "")).lower()
            or q.lower() in str(r.get("last_name", "")).lower()
            or q.lower() in str(r.get("company", "")).lower(),
            axis=1,
        )
        merged = merged[mask]

    display_cols = [
        c for c in [
            "email", "first_name", "last_name", "company", "usage_level",
            "activities", "goals", "onboarded", "created_at", "last_sign_in_at",
            "tentatives", "precision_%", "sessions", "deep_analyses",
        ] if c in merged.columns
    ]
    sort_col = "tentatives" if "tentatives" in merged.columns else "created_at"
    st.dataframe(
        merged[display_cols].sort_values(sort_col, ascending=False),
        use_container_width=True,
        height=400,
    )

    st.divider()
    st.subheader("Zoom sur un utilisateur")

    labels = {
        row["id"]: f"{row.get('email') or '(no email)'} — {(row.get('first_name') or '')} {(row.get('last_name') or '')}".strip()
        for _, row in merged.iterrows()
    }
    if labels:
        selected = st.selectbox("Utilisateur", options=list(labels.keys()), format_func=lambda x: labels[x])
        if selected:
            u_row = merged[merged.id == selected].iloc[0]
            col1, col2 = st.columns(2)
            with col1:
                st.markdown("**Identité**")
                st.write({
                    "email": u_row.get("email"),
                    "nom": f"{u_row.get('first_name') or ''} {u_row.get('last_name') or ''}".strip(),
                    "display_name": u_row.get("display_name"),
                    "company": u_row.get("company"),
                    "linkedin": u_row.get("linkedin_url"),
                    "inscrit le": str(u_row.get("created_at")),
                    "dernière connexion": str(u_row.get("last_sign_in_at")),
                })
            with col2:
                st.markdown("**Onboarding**")
                st.write({
                    "usage_level": u_row.get("usage_level"),
                    "activities": _as_list(u_row.get("activities")),
                    "goals": _as_list(u_row.get("goals")),
                    "onboarded": bool(u_row.get("onboarded")) if pd.notna(u_row.get("onboarded")) else False,
                })

            u_attempts = attempts[attempts.user_id == selected] if not attempts.empty else pd.DataFrame()
            u_searches = deep[deep.user_id == selected] if not deep.empty else pd.DataFrame()

            st.markdown(f"**Quiz** · {len(u_attempts)} tentatives · {u_attempts.session_id.nunique() if not u_attempts.empty else 0} sessions")
            if not u_attempts.empty and not questions.empty:
                merged_q = u_attempts.merge(
                    questions[["id", "question", "category", "difficulty", "lang"]],
                    left_on="question_id", right_on="id", how="left",
                )
                st.dataframe(
                    merged_q[["answered_at", "category", "difficulty", "lang", "question", "is_correct"]]
                    .sort_values("answered_at", ascending=False),
                    use_container_width=True, height=300,
                )

            st.markdown(f"**Deep analyses** · {len(u_searches)}")
            if not u_searches.empty:
                st.dataframe(
                    u_searches[["created_at", "query"]].sort_values("created_at", ascending=False),
                    use_container_width=True,
                )


# ─── Personas & Onboarding ───────────────────────────────────────────────────
with tab_personas:
    total_p = len(profiles)
    st.caption(f"Basé sur **{total_p}** profils onboardés (hors comptes exclus).")

    st.subheader("Niveau d'usage de Claude Code")
    if not profiles.empty and "usage_level" in profiles.columns:
        order = ["never", "sometimes", "often", "daily"]
        vc = profiles.usage_level.value_counts().to_dict()
        cats = [c for c in order if c in vc]
        vals = [int(vc[c]) for c in cats]
        labels = [f"{n} ({round(100*n/total_p,1) if total_p else 0}%)" for n in vals]
        fig = go.Figure(data=[go.Bar(
            x=cats, y=vals, text=labels, textposition="outside",
            marker_color="#1f77b4", cliponaxis=False,
        )])
        fig.update_layout(
            height=340, margin=dict(l=0, r=0, t=10, b=0),
            xaxis=dict(title="usage_level", type="category"),
            yaxis=dict(title="users"),
        )
        st.plotly_chart(fig, use_container_width=True)

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Activités (qui sont-ils ?)")
        if not profiles.empty and "activities" in profiles.columns:
            exploded = profiles.assign(activities=profiles.activities.apply(_as_list)).explode("activities").dropna(subset=["activities"])
            counts = exploded.activities.value_counts()
            # Tri ascendant pour bar horizontal (plus grand en haut avec go.Bar sur y)
            counts = counts.sort_values(ascending=True)
            ys = counts.index.tolist()
            xs = [int(v) for v in counts.values.tolist()]
            labels = [f"{n} ({round(100*n/total_p,1) if total_p else 0}%)" for n in xs]
            fig = go.Figure(data=[go.Bar(
                y=ys, x=xs, orientation="h", text=labels, textposition="outside",
                marker_color="#1f77b4", cliponaxis=False,
            )])
            fig.update_layout(
                height=400, margin=dict(l=0, r=0, t=10, b=0),
                xaxis=dict(title="users", range=[0, max(xs)*1.2 if xs else 1]),
                yaxis=dict(title=""),
            )
            st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.subheader("Objectifs (que veulent-ils faire ?)")
        if not profiles.empty and "goals" in profiles.columns:
            exploded = profiles.assign(goals=profiles.goals.apply(_as_list)).explode("goals").dropna(subset=["goals"])
            counts = exploded.goals.value_counts().sort_values(ascending=True)
            ys = counts.index.tolist()
            xs = [int(v) for v in counts.values.tolist()]
            labels = [f"{n} ({round(100*n/total_p,1) if total_p else 0}%)" for n in xs]
            fig = go.Figure(data=[go.Bar(
                y=ys, x=xs, orientation="h", text=labels, textposition="outside",
                marker_color="#1f77b4", cliponaxis=False,
            )])
            fig.update_layout(
                height=400, margin=dict(l=0, r=0, t=10, b=0),
                xaxis=dict(title="users", range=[0, max(xs)*1.2 if xs else 1]),
                yaxis=dict(title=""),
            )
            st.plotly_chart(fig, use_container_width=True)

    st.divider()
    st.subheader("Matrice persona : activité × objectif")
    if not profiles.empty:
        rows = []
        for _, row in profiles.iterrows():
            for a in _as_list(row.get("activities")):
                for g in _as_list(row.get("goals")):
                    rows.append({"activité": a, "objectif": g})
        if rows:
            crosstab = pd.DataFrame(rows)
            pivot = crosstab.pivot_table(index="activité", columns="objectif", aggfunc="size", fill_value=0)
            # Native Python lists to avoid plotly binary encoding bug
            z_values = [[int(v) for v in row] for row in pivot.values.tolist()]
            x_labels = [str(c) for c in pivot.columns.tolist()]
            y_labels = [str(r) for r in pivot.index.tolist()]
            fig = go.Figure(data=[go.Heatmap(
                z=z_values,
                x=x_labels,
                y=y_labels,
                colorscale="Blues",
                text=[[str(v) for v in row] for row in z_values],
                texttemplate="%{text}",
                textfont=dict(size=11),
                hovertemplate="activité=%{y}<br>objectif=%{x}<br>n=%{z}<extra></extra>",
            )])
            fig.update_layout(
                height=440, margin=dict(l=0, r=0, t=10, b=0),
                xaxis=dict(title="objectif", side="bottom"),
                yaxis=dict(title="activité", autorange="reversed"),
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Aucun profil n'a à la fois des activités et des objectifs renseignés.")

    st.divider()
    st.subheader("Combos activité × usage_level")
    if not profiles.empty:
        rows = []
        for _, row in profiles.iterrows():
            for a in _as_list(row.get("activities")):
                rows.append({"activité": a, "usage_level": row.get("usage_level")})
        if rows:
            combo = pd.DataFrame(rows).groupby(["activité", "usage_level"]).size().reset_index(name="n")
            combo = combo.sort_values("n", ascending=False)
            st.dataframe(combo, use_container_width=True, height=300)


# ─── Quiz ────────────────────────────────────────────────────────────────────
with tab_quiz:
    st.subheader("Stats globales")
    if not attempts.empty:
        total = len(attempts)
        acc = round(100 * attempts.is_correct.sum() / total, 1)
        sessions = attempts.session_id.nunique()
        qps = round(total / sessions, 1) if sessions else 0
        # Average session accuracy
        per_session = attempts.groupby("session_id").agg(
            n=("is_correct", "count"),
            correct=("is_correct", "sum"),
        )
        per_session["acc"] = 100 * per_session["correct"] / per_session["n"]
        avg_session_acc = round(per_session["acc"].mean(), 1) if not per_session.empty else 0

        c1, c2, c3, c4, c5 = st.columns(5)
        c1.metric("Tentatives", total)
        c2.metric("Précision globale", f"{acc}%")
        c3.metric("Sessions", sessions)
        c4.metric("Questions/session", qps)
        c5.metric("Précision moy. session", f"{avg_session_acc}%")

    st.divider()
    st.subheader("Filtres les plus utilisés (déduits par session)")
    st.caption(
        "Un filtre est déduit si toutes les questions d'une session partagent la même valeur "
        "(sinon = « tous »). Tu vois le nombre de sessions et la précision moyenne par combo."
    )
    if not attempts.empty and not questions.empty:
        joined = attempts.merge(
            questions[["id", "category", "difficulty", "lang"]],
            left_on="question_id", right_on="id", how="left",
        )

        def _derive(g):
            cats = g["category"].dropna().unique()
            diffs = g["difficulty"].dropna().unique()
            langs = g["lang"].dropna().unique()
            return pd.Series({
                "category": cats[0] if len(cats) == 1 else "tous",
                "difficulty": diffs[0] if len(diffs) == 1 else "tous",
                "lang": langs[0] if len(langs) == 1 else "tous",
                "questions": len(g),
                "correct": int(g["is_correct"].sum()),
                "user_id": g["user_id"].iloc[0],
            })

        session_stats = (
            joined.dropna(subset=["session_id"])
            .groupby("session_id")
            .apply(_derive, include_groups=False)
            .reset_index()
        )
        session_stats["precision_pct"] = (100 * session_stats["correct"] / session_stats["questions"]).round(1)

        col_a, col_b, col_c = st.columns(3)
        with col_a:
            st.markdown("**Par catégorie**")
            agg = session_stats.groupby("category").agg(
                sessions=("session_id", "count"),
                questions=("questions", "sum"),
                precision=("precision_pct", "mean"),
            ).reset_index().sort_values("sessions", ascending=False)
            agg["precision"] = agg["precision"].round(1)
            st.dataframe(agg, use_container_width=True, hide_index=True)
        with col_b:
            st.markdown("**Par difficulté**")
            agg = session_stats.groupby("difficulty").agg(
                sessions=("session_id", "count"),
                questions=("questions", "sum"),
                precision=("precision_pct", "mean"),
            ).reset_index().sort_values("sessions", ascending=False)
            agg["precision"] = agg["precision"].round(1)
            st.dataframe(agg, use_container_width=True, hide_index=True)
        with col_c:
            st.markdown("**Par langue**")
            agg = session_stats.groupby("lang").agg(
                sessions=("session_id", "count"),
                questions=("questions", "sum"),
                precision=("precision_pct", "mean"),
            ).reset_index().sort_values("sessions", ascending=False)
            agg["precision"] = agg["precision"].round(1)
            st.dataframe(agg, use_container_width=True, hide_index=True)

        st.markdown("**Combos complets (category × difficulty × lang)**")
        combo = session_stats.groupby(["category", "difficulty", "lang"]).agg(
            sessions=("session_id", "count"),
            questions=("questions", "sum"),
            precision=("precision_pct", "mean"),
        ).reset_index().sort_values("sessions", ascending=False)
        combo["precision"] = combo["precision"].round(1)
        st.dataframe(combo, use_container_width=True, hide_index=True, height=300)

    st.divider()
    st.subheader("Précision par catégorie × difficulté × langue (au niveau question)")
    if not attempts.empty and not questions.empty:
        joined = attempts.merge(
            questions[["id", "category", "difficulty", "lang"]],
            left_on="question_id", right_on="id", how="left",
        )
        grp = joined.groupby(["category", "difficulty", "lang"]).agg(
            tentatives=("is_correct", "count"),
            precision_pct=("is_correct", lambda x: round(100 * x.mean(), 1)),
        ).reset_index().sort_values("tentatives", ascending=False)
        st.dataframe(grp, use_container_width=True, hide_index=True, height=300)

        st.markdown("**Heatmap précision (catégorie × difficulté)**")
        heat = joined.groupby(["category", "difficulty"])["is_correct"].mean().reset_index()
        heat["precision_pct"] = (heat["is_correct"] * 100).round(1)
        pivot = heat.pivot(index="category", columns="difficulty", values="precision_pct")
        # Ordre fixe des difficultés
        diff_order = [d for d in ["easy", "medium", "hard"] if d in pivot.columns]
        pivot = pivot[diff_order]
        z_values = [[float(v) if pd.notna(v) else None for v in row] for row in pivot.values.tolist()]
        x_labels = list(pivot.columns)
        y_labels = list(pivot.index)
        text_values = [[f"{v:.1f}" if v is not None else "" for v in row] for row in z_values]
        fig = go.Figure(data=[go.Heatmap(
            z=z_values, x=x_labels, y=y_labels,
            colorscale="RdYlGn", zmin=0, zmax=100,
            text=text_values, texttemplate="%{text}",
            hovertemplate="catégorie=%{y}<br>difficulté=%{x}<br>précision=%{z:.1f}%<extra></extra>",
        )])
        fig.update_layout(
            height=360, margin=dict(l=0, r=0, t=10, b=0),
            xaxis=dict(title="difficulté"),
            yaxis=dict(title="catégorie", autorange="reversed"),
        )
        st.plotly_chart(fig, use_container_width=True)

    st.divider()
    st.subheader("Questions les plus ratées (≥ 5 tentatives)")
    if not attempts.empty and not questions.empty:
        joined = attempts.merge(questions, left_on="question_id", right_on="id", how="left")
        stats = joined.groupby(["question_id", "question", "category", "difficulty", "lang"]).agg(
            tentatives=("is_correct", "count"),
            precision_pct=("is_correct", lambda x: round(100 * x.mean(), 1)),
        ).reset_index()
        stats = stats[stats.tentatives >= 5].sort_values(["precision_pct", "tentatives"], ascending=[True, False])
        st.dataframe(stats, use_container_width=True, hide_index=True, height=350)

    st.divider()
    st.subheader("Signalements")
    if not reports.empty:
        reports_joined = reports.merge(questions[["id", "question", "category"]], left_on="question_id", right_on="id", how="left")
        st.dataframe(
            reports_joined[["created_at", "category", "question", "reason"]].sort_values("created_at", ascending=False),
            use_container_width=True, hide_index=True,
        )
    else:
        st.info("Aucun signalement.")


# ─── Recherches & IA ─────────────────────────────────────────────────────────
with tab_search:
    st.subheader("Recherches MCP (embeddings)")
    st.caption(
        "Chaque appel à `/api/mcp/search` = une recherche. "
        "Depuis la dernière migration, le texte de la requête est loggé dans `ai_usage_logs.query_text`."
    )

    c1, c2, c3 = st.columns(3)
    c1.metric(
        "Recherches MCP (autres users)", len(search_calls),
        help="Appels à /api/mcp/search après exclusion des comptes bannis.",
    )
    c2.metric("Explain IA", len(explain_calls))
    c3.metric("Deep analyses", len(deep))

    # Queries texte (nouveau tracking)
    search_with_query = search_calls[search_calls.query_text.notna()] if not search_calls.empty and "query_text" in search_calls.columns else pd.DataFrame()
    if not search_with_query.empty:
        st.markdown("**Top requêtes de recherche (après migration query_text)**")
        top_q = search_with_query.query_text.value_counts().reset_index()
        top_q.columns = ["requête", "n"]
        st.dataframe(top_q, use_container_width=True, hide_index=True, height=250)

        st.markdown("**Chronologie des recherches**")
        merged_s = search_with_query.sort_values("created_at", ascending=False).merge(
            users[["id", "email"]], left_on="user_id", right_on="id", how="left"
        )
        st.dataframe(
            merged_s[["created_at", "email", "query_text"]],
            use_container_width=True, hide_index=True, height=300,
        )
    else:
        st.info(
            "Aucune recherche avec `query_text` stocké pour les users non exclus. "
            "Les nouvelles recherches (après redéploiement du code Next.js) apparaîtront ici."
        )

    st.markdown("**Volume par jour**")
    daily_search = _daily_counts(search_calls, "created_at", "recherches")
    daily_deep = _daily_counts(deep, "created_at", "deep_analyses")
    if not daily_search.empty or not daily_deep.empty:
        merged_d = pd.merge(
            daily_search if not daily_search.empty else pd.DataFrame(columns=["day", "recherches"]),
            daily_deep if not daily_deep.empty else pd.DataFrame(columns=["day", "deep_analyses"]),
            on="day", how="outer",
        ).fillna(0).sort_values("day")
        days_list = merged_d["day"].astype(str).tolist()
        rech = [int(v) for v in merged_d.get("recherches", pd.Series([])).tolist()]
        deep_v = [int(v) for v in merged_d.get("deep_analyses", pd.Series([])).tolist()]
        fig = go.Figure()
        if rech:
            fig.add_trace(go.Bar(x=days_list, y=rech, name="recherches", text=[str(v) for v in rech], textposition="outside"))
        if deep_v:
            fig.add_trace(go.Bar(x=days_list, y=deep_v, name="deep analyses", text=[str(v) for v in deep_v], textposition="outside"))
        fig.update_layout(
            height=340, margin=dict(l=0, r=0, t=10, b=0), barmode="group",
            xaxis=dict(type="category", title="date"),
            yaxis=dict(title="n"),
        )
        st.plotly_chart(fig, use_container_width=True)

    st.divider()
    st.subheader("Deep analyses — requêtes faites")
    if not deep.empty:
        st.markdown("**Top requêtes**")
        top = deep["query"].value_counts().reset_index()
        top.columns = ["requête", "n"]
        st.dataframe(top, use_container_width=True, hide_index=True, height=250)

        st.markdown("**Chronologie**")
        deep_sorted = deep.sort_values("created_at", ascending=False)
        merged_deep = deep_sorted.merge(users[["id", "email"]], left_on="user_id", right_on="id", how="left")
        st.dataframe(
            merged_deep[["created_at", "email", "query"]],
            use_container_width=True, hide_index=True, height=300,
        )
    else:
        st.info("Aucune deep analysis enregistrée (hors comptes exclus).")

    st.divider()
    st.subheader("Coûts OpenAI par endpoint")
    if not ai.empty:
        grp = ai.groupby(["endpoint", "model"]).agg(
            calls=("id", "count"),
            input_tokens=("input_tokens", "sum"),
            output_tokens=("output_tokens", "sum"),
            cost_usd=("cost_usd", lambda x: round(x.sum(), 4)),
        ).reset_index().sort_values("cost_usd", ascending=False)
        st.dataframe(grp, use_container_width=True, hide_index=True)

        ai_sorted = ai.sort_values("created_at").copy()
        ai_sorted["cumul_usd"] = ai_sorted.cost_usd.cumsum()
        x_ts = [t.isoformat() for t in ai_sorted["created_at"].tolist()]
        y_vals = [float(v) for v in ai_sorted["cumul_usd"].tolist()]
        fig = go.Figure(data=[go.Scatter(
            x=x_ts, y=y_vals, fill="tozeroy", mode="lines",
            line=dict(color="#1f77b4"),
        )])
        fig.update_layout(
            title="Coût cumulé dans le temps",
            height=320, margin=dict(l=0, r=0, t=40, b=0),
            xaxis=dict(title="timestamp"),
            yaxis=dict(title="USD"),
        )
        st.plotly_chart(fig, use_container_width=True)
