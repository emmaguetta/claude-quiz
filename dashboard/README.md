# Claude Quiz — Dashboard

Petit dashboard local (Streamlit) pour analyser l'usage de l'app [claude-quiz](https://github.com/emmaguetta/claude-quiz) : inscriptions, onboarding, personas, quiz, recherches MCP et coûts IA.

Tout est fetché en direct depuis Supabase au lancement — aucune donnée persistée localement.

## Installation

```bash
cd dashboard
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Le dashboard lit les credentials Supabase depuis `../claude-quiz/.env.local` (pas besoin de les dupliquer). Il faut que ce fichier contienne :

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

> La `service_role_key` est utilisée pour lister les comptes via l'admin API et bypasser la RLS. **Ne jamais committer ce fichier.** Le `.gitignore` de claude-quiz exclut déjà `.env*`.

## Lancer

```bash
streamlit run app.py
```

Bouton « 🔄 Rafraîchir les données » dans la sidebar pour re-fetch (cache TTL de 5 min sinon).

## Comptes exclus

Les métriques excluent systématiquement les comptes de test perso :
- `emma.guetta@student-cs.fr`
- `emmaguetta@icloud.com`

Liste en dur dans `app.py` → `EXCLUDED_EMAILS`. Le filtrage s'applique à `auth.users`, `profiles`, `quiz_attempts`, `deep_analysis_usage` et `ai_usage_logs` (via `user_id`).

## Sources de données

| Table | Contient | Utilisé pour |
|---|---|---|
| `auth.users` (admin API) | inscriptions, dernière connexion, provider | KPI users, DAU/WAU/MAU, funnel |
| `profiles` | onboarding (activités, objectifs, `usage_level`, `onboarded`) | Tab Personas |
| `quiz_attempts` | 1 ligne par **réponse à une question** (+ `session_id`) | Tab Quiz, activité |
| `deep_analysis_usage` | 1 ligne par deep analysis + `query` textuelle | Tab Recherches |
| `ai_usage_logs` | 1 ligne par appel IA (`/api/mcp/search`, `/api/mcp/explain`, `/api/mcp/deep-analyze`) avec `user_id`, `query_text`, `cost_usd` | Tab Recherches, coûts |
| `questions` | questions du quiz | Tab Quiz (top difficiles / taux de réussite) |
| `reports` | signalements utilisateurs | KPI secondaire |

## Définitions

- **DAU / WAU / MAU** : users uniques avec ≥ 1 action (quiz ou deep analysis) sur 1j / 7j / 30j.
- **Stickiness** = DAU / MAU (plus élevé = users reviennent plus).
- **Tentative quiz** = 1 ligne dans `quiz_attempts` = 1 **réponse à une question** (pas une session). Sessions = `session_id.nunique()`, affiché dans l'onglet Quiz.
- **Recherche MCP** = appel à `/api/mcp/search` (vector search embedding). Chaque recherche loggue `query_text` + `user_id` depuis la migration (avant : NULL).
- **Deep analysis** = reranking IA sur les résultats de recherche (`/api/mcp/deep-analyze`). Plus coûteux, rate-limited à 80/mois/user.

## Onglets

1. **🏠 Vue d'ensemble** — KPIs globaux, DAU/WAU/MAU, funnel d'activation, inscriptions par jour + cumulé.
2. **👤 Utilisateurs** — Table filtrable, drill-down par user (onboarding, quiz, recherches, deep analyses).
3. **🧭 Personas & Onboarding** — Répartitions des activités / objectifs / niveau d'usage, matrice croisée persona × objectif.
4. **❓ Quiz** — Moyennes, sessions, filtres les plus utilisés, top questions difficiles, activité par jour.
5. **🔍 Recherches & IA** — Volume de recherches, top queries, coût cumulé par endpoint.

## Notes techniques

- **Cache** : `@st.cache_data(ttl=300)` sur le fetch Supabase (5 min).
- **Pagination** : les fetchs REST PostgREST récupèrent 1000 lignes par page jusqu'à épuisement (`_fetch_table`).
- **Charts** : utilisation de `plotly.graph_objects` (`go.Bar`, `go.Heatmap`, `go.Scatter`) avec listes Python natives — **pas** `plotly.express` (bug connu : `px.*` encode les colonnes int pandas en typed arrays binaires que Streamlit 1.30 ne sait pas décoder, ce qui casse l'axe Y).
- **Timezone** : tous les timestamps sont convertis en UTC via `pd.to_datetime(..., utc=True)` avant agrégation.

## Migrations liées

Le dashboard dépend de deux colonnes ajoutées à `ai_usage_logs` :
- `user_id UUID REFERENCES auth.users(id)`
- `query_text TEXT`

Les 120 lignes historiques (avant migration) ont été backfillées sur le compte `emmaguetta@icloud.com` et sont donc exclues des métriques.

## Stack

- Python 3.10+
- Streamlit · Pandas · Plotly · Requests · python-dotenv
- Supabase REST API (PostgREST) + Auth Admin API
