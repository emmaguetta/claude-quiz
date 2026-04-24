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
    mcp_events = pd.DataFrame(_fetch_table("mcp_events"))

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
    # mcp_events: idem, keep NULL user_id (anon users) but drop excluded accounts.
    if not mcp_events.empty and "user_id" in mcp_events.columns:
        mcp_events = mcp_events[
            mcp_events.user_id.isna() | ~mcp_events.user_id.isin(excluded_ids)
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
        (mcp_events, "created_at"),
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
        "mcp_events": mcp_events,
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
mcp_events = data["mcp_events"]


def _payload_get(df: pd.DataFrame, key: str) -> pd.Series:
    """Extract a key from the jsonb `payload` column. Returns a Series aligned with df."""
    if df.empty or "payload" not in df.columns:
        return pd.Series(dtype=object)
    return df["payload"].apply(
        lambda p: (p or {}).get(key) if isinstance(p, dict) else None
    )


browse_events = mcp_events[mcp_events.event_type == "browse"] if not mcp_events.empty else pd.DataFrame()
detail_events = mcp_events[mcp_events.event_type == "detail_viewed"] if not mcp_events.empty else pd.DataFrame()
external_events = mcp_events[mcp_events.event_type == "external_click"] if not mcp_events.empty else pd.DataFrame()

search_calls = ai[ai.endpoint == "/api/mcp/search"] if not ai.empty else pd.DataFrame()
explain_calls = ai[ai.endpoint == "/api/mcp/explain"] if not ai.empty else pd.DataFrame()

# Stats on pre-tracking logs (user_id NULL = recherches avant la migration user_id)
searches_with_user = search_calls[search_calls.user_id.notna()] if not search_calls.empty and "user_id" in search_calls.columns else pd.DataFrame()
searches_anonymous = search_calls[search_calls.user_id.isna()] if not search_calls.empty and "user_id" in search_calls.columns else pd.DataFrame()

st.caption(
    f"Données à jour · {len(users)} utilisateurs (après exclusion de "
    f"{data['excluded_count']} compte(s))"
)

tab_overview, tab_users, tab_personas, tab_quiz, tab_search, tab_mcp = st.tabs([
    "🏠 Vue d'ensemble",
    "👤 Utilisateurs",
    "🧭 Personas & Onboarding",
    "❓ Quiz",
    "🔍 Recherches & IA",
    "🧩 MCP Events",
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
            "activities", "goals", "heard_about", "onboarded", "created_at", "last_sign_in_at",
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
                    "heard_about": u_row.get("heard_about"),
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

    st.divider()
    st.subheader("Acquisition — comment sont-ils arrivés ?")
    st.caption(
        "Répartition des réponses à la question « Comment avez-vous entendu parler de nous ? » "
        "posée à la fin de l'onboarding. Permet d'identifier les canaux qui fonctionnent vraiment."
    )
    heard_about_labels = {
        "google": "Recherche Google",
        "friend": "Bouche-à-oreille",
        "instagram_post": "Post Instagram",
        "linkedin_post": "Post LinkedIn",
        "outreach": "Outreach (on les a contactés)",
        "twitter": "X / Twitter",
        "youtube": "YouTube",
        "reddit": "Reddit",
        "product_hunt": "Product Hunt",
        "other": "Autre",
    }
    if not profiles.empty and "heard_about" in profiles.columns:
        answered = profiles.dropna(subset=["heard_about"])
        total_h = len(answered)
        if total_h:
            c1, c2 = st.columns([1, 2])
            c1.metric(
                "Profils avec réponse",
                total_h,
                f"{round(100 * total_h / max(len(profiles), 1), 1)}% des onboardés",
                help="Nombre de profils avec `heard_about` renseigné.",
            )
            counts = answered.heard_about.value_counts().sort_values(ascending=True)
            ys = [heard_about_labels.get(k, k) for k in counts.index.tolist()]
            xs = [int(v) for v in counts.values.tolist()]
            labels = [f"{n} ({round(100*n/total_h,1)}%)" for n in xs]
            fig = go.Figure(data=[go.Bar(
                y=ys, x=xs, orientation="h", text=labels, textposition="outside",
                marker_color="#9333ea", cliponaxis=False,
            )])
            fig.update_layout(
                height=400, margin=dict(l=0, r=0, t=10, b=0),
                xaxis=dict(title="users", range=[0, max(xs) * 1.2 if xs else 1]),
                yaxis=dict(title=""),
            )
            with c2:
                st.plotly_chart(fig, use_container_width=True)

            st.markdown("**Acquisition × activité (qui vient d'où ?)**")
            rows = []
            for _, row in answered.iterrows():
                for a in _as_list(row.get("activities")):
                    rows.append({"canal": heard_about_labels.get(row["heard_about"], row["heard_about"]), "activité": a})
            if rows:
                cross = pd.DataFrame(rows).pivot_table(
                    index="canal", columns="activité", aggfunc="size", fill_value=0,
                )
                z_values = [[int(v) for v in r] for r in cross.values.tolist()]
                fig = go.Figure(data=[go.Heatmap(
                    z=z_values,
                    x=[str(c) for c in cross.columns.tolist()],
                    y=[str(r) for r in cross.index.tolist()],
                    colorscale="Purples",
                    text=[[str(v) for v in r] for r in z_values],
                    texttemplate="%{text}",
                    hovertemplate="canal=%{y}<br>activité=%{x}<br>n=%{z}<extra></extra>",
                )])
                fig.update_layout(
                    height=360, margin=dict(l=0, r=0, t=10, b=0),
                    xaxis=dict(title="activité", side="bottom"),
                    yaxis=dict(title="canal", autorange="reversed"),
                )
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Aucune réponse `heard_about` pour le moment (colonne récente).")
    else:
        st.info("La colonne `heard_about` n'est pas encore disponible.")


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
    st.subheader("Questions répondues par jour")
    st.caption(
        "Chaque colonne = nombre de lignes dans `quiz_attempts` ce jour-là (1 ligne = 1 réponse à une question). "
        "Les jours sans réponse sont affichés à 0."
    )
    daily_attempts = _daily_counts(attempts, "answered_at", "questions")
    if daily_attempts.empty:
        st.info("Aucune réponse enregistrée.")
    else:
        days = daily_attempts["day"].astype(str).tolist()
        values = [int(v) for v in daily_attempts["questions"].tolist()]
        fig = go.Figure(data=[go.Bar(
            x=days, y=values,
            text=[str(v) for v in values],
            textposition="outside",
            marker_color="#1f77b4",
            cliponaxis=False,
        )])
        fig.update_layout(
            height=360, margin=dict(l=0, r=0, t=10, b=0),
            xaxis=dict(type="category", title="date"),
            yaxis=dict(title="questions répondues"),
        )
        st.plotly_chart(fig, use_container_width=True)
        st.caption(f"Total : **{sum(values)}** questions sur **{len(values)}** jours · moyenne **{round(sum(values) / max(len(values), 1), 1)}/jour**")

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


# ─── MCP Events ──────────────────────────────────────────────────────────────
with tab_mcp:
    st.subheader("Interactions MCP Search (hors recherche NL)")
    st.caption(
        "Events trackés dans `mcp_events`. 3 types :\n"
        "- **browse** = l'utilisateur a appliqué un filtre (catégorie / tool) ou changé le tri.\n"
        "- **detail_viewed** = le panneau d'un MCP a été ouvert.\n"
        "- **external_click** = clic sur un lien Site ou GitHub depuis le panneau détail.\n\n"
        "⚠️ Le page-load par défaut (sans filtre, tri `quality`) n'est pas loggé pour éviter la pollution."
    )

    if mcp_events.empty:
        st.info(
            "Aucun event enregistré pour le moment. Les events apparaîtront dès qu'un utilisateur "
            "(hors comptes exclus) filtrera par catégorie, ouvrira un MCP, ou cliquera un lien externe."
        )
    else:
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Total events", len(mcp_events))
        c2.metric("Browse (filtres/tri)", len(browse_events))
        c3.metric("MCP ouverts", len(detail_events))
        c4.metric("Clics externes", len(external_events))

        st.divider()

        # ─── Filtres de navigation ─────────────────────────────────────
        st.markdown("### 🗂️ Filtres de navigation (browse)")
        st.caption(
            "Logique : pour chaque event `browse`, on extrait `payload->category`, `payload->tool`, "
            "`payload->sort`. On compte les occurrences. Un event peut avoir `category` ET `tool` (combo)."
        )

        if browse_events.empty:
            st.info("Aucun event `browse` enregistré.")
        else:
            col_a, col_b = st.columns(2)

            with col_a:
                st.markdown("**Catégories les plus consultées**")
                cats = _payload_get(browse_events, "category").dropna()
                if cats.empty:
                    st.info("Aucun filtre de catégorie utilisé (seulement des filtres `tool` ou tris).")
                else:
                    counts = cats.value_counts().sort_values(ascending=True)
                    ys = counts.index.tolist()
                    xs = [int(v) for v in counts.values.tolist()]
                    total = sum(xs)
                    labels = [f"{n} ({round(100*n/total,1)}%)" for n in xs]
                    fig = go.Figure(data=[go.Bar(
                        y=ys, x=xs, orientation="h", text=labels, textposition="outside",
                        marker_color="#1f77b4", cliponaxis=False,
                    )])
                    fig.update_layout(
                        height=max(300, 40 + 30 * len(ys)), margin=dict(l=0, r=0, t=10, b=0),
                        xaxis=dict(title="events", range=[0, max(xs) * 1.2]),
                        yaxis=dict(title=""),
                    )
                    st.plotly_chart(fig, use_container_width=True)

            with col_b:
                st.markdown("**Tools / brands les plus filtrés**")
                tools_s = _payload_get(browse_events, "tool").dropna()
                if tools_s.empty:
                    st.info("Aucun filtre `tool` utilisé.")
                else:
                    counts = tools_s.value_counts().head(15).sort_values(ascending=True)
                    ys = counts.index.tolist()
                    xs = [int(v) for v in counts.values.tolist()]
                    total = int(tools_s.shape[0])
                    labels = [f"{n} ({round(100*n/total,1)}%)" for n in xs]
                    fig = go.Figure(data=[go.Bar(
                        y=ys, x=xs, orientation="h", text=labels, textposition="outside",
                        marker_color="#9333ea", cliponaxis=False,
                    )])
                    fig.update_layout(
                        height=max(300, 40 + 30 * len(ys)), margin=dict(l=0, r=0, t=10, b=0),
                        xaxis=dict(title="events", range=[0, max(xs) * 1.2]),
                        yaxis=dict(title=""),
                    )
                    st.plotly_chart(fig, use_container_width=True)

            st.markdown("**Tri utilisé**")
            st.caption("Rappel : `quality` (défaut) n'est enregistré que si couplé à un filtre.")
            sorts = _payload_get(browse_events, "sort").dropna()
            if not sorts.empty:
                sort_counts = sorts.value_counts().reset_index()
                sort_counts.columns = ["sort", "events"]
                st.dataframe(sort_counts, use_container_width=True, hide_index=True)

        st.divider()

        # ─── MCPs ouverts ──────────────────────────────────────────────
        st.markdown("### 📖 MCPs les plus ouverts")
        st.caption(
            "Logique : chaque ouverture du panneau `McpDetailSheet` loggue un event `detail_viewed` "
            "avec le `mcp_slug` et `mcp_name`. On compte les occurrences."
        )

        if detail_events.empty:
            st.info("Aucun MCP ouvert pour le moment.")
        else:
            slugs = _payload_get(detail_events, "mcp_slug").dropna()
            names = _payload_get(detail_events, "mcp_name").dropna()
            # Prefer name for readability, fall back to slug
            labels_series = names.where(names.notna(), slugs) if not names.empty else slugs
            counts = labels_series.value_counts().head(20).sort_values(ascending=True)
            ys = counts.index.tolist()
            xs = [int(v) for v in counts.values.tolist()]
            total = int(detail_events.shape[0])
            labels = [f"{n} ({round(100*n/total,1)}%)" for n in xs]
            fig = go.Figure(data=[go.Bar(
                y=ys, x=xs, orientation="h", text=labels, textposition="outside",
                marker_color="#059669", cliponaxis=False,
            )])
            fig.update_layout(
                height=max(300, 40 + 30 * len(ys)), margin=dict(l=0, r=0, t=10, b=0),
                xaxis=dict(title="ouvertures", range=[0, max(xs) * 1.25]),
                yaxis=dict(title=""),
            )
            st.plotly_chart(fig, use_container_width=True)

            # Search vs browse provenance
            source_q = _payload_get(detail_events, "source_query")
            from_search = source_q.notna().sum()
            from_browse = source_q.isna().sum()
            st.markdown("**Provenance des ouvertures**")
            st.caption(
                "Si le panneau a été ouvert depuis une recherche NL, `source_query` contient la requête. "
                "Sinon, l'utilisateur arrivait du mode browse."
            )
            c1, c2 = st.columns(2)
            c1.metric("Depuis une recherche NL", int(from_search))
            c2.metric("Depuis le browse", int(from_browse))

        st.divider()

        # ─── Clics externes ────────────────────────────────────────────
        st.markdown("### 🔗 Clics externes (Site vs GitHub)")
        st.caption(
            "Event `external_click` avec `target = site | github` dans le payload. "
            "Indicateur d'intention : l'utilisateur a assez aimé le MCP pour cliquer sortir."
        )

        if external_events.empty:
            st.info("Aucun clic externe enregistré.")
        else:
            targets = _payload_get(external_events, "target").dropna()
            target_counts = targets.value_counts().reset_index()
            target_counts.columns = ["target", "clics"]
            c1, c2 = st.columns([1, 2])
            with c1:
                st.dataframe(target_counts, use_container_width=True, hide_index=True)
            with c2:
                st.markdown("**Top MCPs cliqués vers l'extérieur**")
                ext_names = _payload_get(external_events, "mcp_name").dropna()
                if not ext_names.empty:
                    top = ext_names.value_counts().head(10).reset_index()
                    top.columns = ["MCP", "clics"]
                    st.dataframe(top, use_container_width=True, hide_index=True)

        st.divider()

        # ─── Funnel browse → detail → external ─────────────────────────
        st.markdown("### 🔻 Funnel d'engagement")
        st.caption(
            "Basé sur les events bruts (pas par utilisateur). "
            "Taux = `detail_viewed / browse` et `external_click / detail_viewed`. "
            "C'est une mesure globale de la qualité de navigation, pas un funnel par session."
        )
        n_browse = len(browse_events)
        n_detail = len(detail_events)
        n_ext = len(external_events)
        labels_f = ["Browse", "Detail ouvert", "Clic externe"]
        values_f = [n_browse, n_detail, n_ext]
        base = max(n_browse, 1)
        texts_f = [
            f"{n_browse}",
            f"{n_detail} ({round(100 * n_detail / base, 1)}% des browse)",
            f"{n_ext} ({round(100 * n_ext / max(n_detail, 1), 1)}% des detail)",
        ]
        fig = go.Figure(data=[go.Bar(
            y=labels_f[::-1], x=values_f[::-1], orientation="h",
            text=texts_f[::-1], textposition="outside",
            marker=dict(color=values_f[::-1], colorscale="Teal", cmin=0, cmax=max(values_f) or 1),
            cliponaxis=False,
        )])
        fig.update_layout(
            height=280, margin=dict(l=0, r=0, t=10, b=0),
            xaxis=dict(title="events", range=[0, max(values_f) * 1.25 if max(values_f) else 1]),
            yaxis=dict(title=""),
        )
        st.plotly_chart(fig, use_container_width=True)

        st.divider()

        # ─── Timeline ──────────────────────────────────────────────────
        st.markdown("### 📅 Volume d'events par jour")
        daily_b = _daily_counts(browse_events, "created_at", "browse")
        daily_d = _daily_counts(detail_events, "created_at", "detail_viewed")
        daily_e = _daily_counts(external_events, "created_at", "external_click")
        if not (daily_b.empty and daily_d.empty and daily_e.empty):
            merged_d = daily_b
            if not daily_d.empty:
                merged_d = merged_d.merge(daily_d, on="day", how="outer") if not merged_d.empty else daily_d
            if not daily_e.empty:
                merged_d = merged_d.merge(daily_e, on="day", how="outer") if not merged_d.empty else daily_e
            merged_d = merged_d.fillna(0).sort_values("day")
            days_list = merged_d["day"].astype(str).tolist()
            fig = go.Figure()
            for col, color in [("browse", "#1f77b4"), ("detail_viewed", "#059669"), ("external_click", "#ef4444")]:
                if col in merged_d.columns:
                    ys = [int(v) for v in merged_d[col].tolist()]
                    fig.add_trace(go.Bar(x=days_list, y=ys, name=col, text=[str(v) for v in ys], textposition="outside"))
            fig.update_layout(
                height=360, margin=dict(l=0, r=0, t=10, b=0), barmode="group",
                xaxis=dict(type="category", title="date"),
                yaxis=dict(title="events"),
            )
            st.plotly_chart(fig, use_container_width=True)

        st.divider()

        # ─── Raw events table ─────────────────────────────────────────
        with st.expander("📋 Events bruts (100 derniers)"):
            recent = mcp_events.sort_values("created_at", ascending=False).head(100).copy()
            if not recent.empty:
                merged_ev = recent.merge(users[["id", "email"]], left_on="user_id", right_on="id", how="left")
                merged_ev["payload_str"] = merged_ev["payload"].apply(
                    lambda p: ", ".join(f"{k}={v}" for k, v in (p or {}).items() if v is not None) if isinstance(p, dict) else ""
                )
                st.dataframe(
                    merged_ev[["created_at", "event_type", "email", "payload_str"]],
                    use_container_width=True, hide_index=True, height=400,
                )
