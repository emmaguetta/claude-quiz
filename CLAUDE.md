@AGENTS.md

# Claude Code Quiz — Instructions projet

## Ce que c'est

Application Next.js 16 qui aide à apprendre Claude Code via des quiz interactifs à choix multiples.
Les questions sont stockées dans Supabase et générées automatiquement depuis les docs Anthropic via l'AI SDK.

Le repo contient **deux apps distinctes** :
- **`/` (racine)** — l'app Next.js publique (quiz + MCP search), lancée avec `npm run dev` (port 3000).
- **`dashboard/`** — un **dashboard analytics Streamlit** (Python) séparé, pour analyser l'usage interne (inscriptions, quiz, recherches, coûts IA). Lancé avec `streamlit run app.py` (port 8501). Voir `dashboard/README.md`.

Quand l'utilisateur dit « le dashboard » **sans contexte Next.js**, il parle presque toujours du Streamlit dans `dashboard/`. Le `/admin/usage` de l'app Next.js est juste une page de coûts IA, pas « le dashboard ».

## Stack

- **Next.js 16** (App Router, TypeScript) — Server Components par défaut, `'use client'` uniquement pour l'interactivité
- **Supabase** (`@supabase/supabase-js`) — base de données PostgreSQL pour les questions
- **AI SDK v6** + **Vercel AI Gateway** — génération de questions depuis les docs (modèle : `anthropic/claude-sonnet-4.6`)
- **shadcn/ui** + **Tailwind v4** — composants UI, thème dark zinc
- **Vercel** — déploiement, cron hebdomadaire via `vercel.ts`

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `app/page.tsx` | Home page (Server Component) |
| `app/quiz/page.tsx` | Quiz interactif (Client Component, localStorage) |
| `app/api/questions/random/route.ts` | GET question aléatoire depuis Supabase |
| `app/api/questions/generate/route.ts` | POST génération IA (protégé par CRON_SECRET) |
| `lib/supabase.ts` | Clients Supabase + type `Question` |
| `lib/generate.ts` | Fetch docs Anthropic + génération AI SDK |
| `scripts/seed.ts` | Seed initial des questions |
| `vercel.ts` | Config Vercel (cron lundi 9h UTC) |
| `SUPABASE_SETUP.sql` | Schéma SQL à exécuter dans Supabase |

## Schéma de la table `questions`

```sql
id, question, options TEXT[], correct_idx INTEGER, explanation TEXT,
category ('commands'|'shortcuts'|'concepts'|'mcp'|'workflow'),
difficulty ('easy'|'medium'|'hard'), source_url, active BOOLEAN
```

## Variables d'environnement requises

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET                  ← protège POST /api/questions/generate
NEXT_PUBLIC_TURNSTILE_SITE_KEY ← Cloudflare Turnstile (CAPTCHA inscription)
TURNSTILE_SECRET_KEY         ← Cloudflare Turnstile (vérification serveur)
VERCEL_OIDC_TOKEN            ← auto-provisionné par `vercel env pull`
```

## Commandes utiles

```bash
npm run dev          # serveur local
npm run seed         # insérer les ~40 questions initiales dans Supabase
npm run build        # vérifier le build avant de déployer
npx tsc --noEmit     # vérification TypeScript
```

Pour déclencher manuellement la génération de questions :
```bash
curl -X POST http://localhost:3000/api/questions/generate \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"count": 10}'
```

## Conventions de code

- **Server Components** par défaut — ajouter `'use client'` seulement si nécessaire
- **Async Request APIs** : `await cookies()`, `await headers()`, `await params` (Next.js 16)
- **Pas de `@vercel/postgres` ni `@vercel/kv`** — ils sont sunset. Utiliser Supabase.
- **Supabase admin** (`createAdminClient()`) uniquement dans les API routes — jamais côté client
- **Modèle AI** : toujours via AI Gateway avec le format `'provider/model.version'` (ex: `'anthropic/claude-sonnet-4.6'`)
- **Zod v4** est utilisé (via `ai`) — la syntaxe est légèrement différente de v3

## Langue

**Le site est entièrement en français.** Tous les textes visibles par l'utilisateur (labels, messages d'erreur, boutons, états vides, tooltips…) doivent être rédigés en français. Ne jamais laisser de texte en anglais dans l'interface.

## UI

- Thème dark zinc forcé via `className="dark"` sur `<html>`
- Composants shadcn : `Button`, `Card`, `Badge`, `Progress`
- Police : Geist Sans (interface) + Geist Mono (code/commandes)
- Pas de lumière : le fond est toujours `bg-zinc-950`

## Feature : MCP Search Engine (fonctionnel)

Moteur de recherche sémantique pour les MCPs (Model Context Protocol servers). L'utilisateur tape ce qu'il veut faire en langage naturel → on retourne les MCPs pertinents avec les outils précis qui matchent.

**Données en base** : 4 764 MCPs, 32 347 outils, 37 011 embeddings (source : Smithery.ai).

### Architecture

- **Recherche** : embeddings multi-chunk (1 par outil + 1 global par MCP) → pgvector sur Supabase
- **Ranking hybride** : 40% cosine + 30% keyword ratio + 20% name match + 5% multi-match + 5% quality
  - Path keyword en UNION du path cosine → un MCP dont le nom matche est inclus même si l'embedding cosine est faible (fixe le bug "gmail absent" des queries courtes)
  - Keyword ratio : mots discriminants trouvés dans `name + description + search_keywords`
  - Name match : bonus binaire (+20%) si la query apparaît littéralement dans le nom du MCP
  - `search_keywords` : colonne cachée enrichie par LLM (synonymes, brands, cas d'usage) — boost la qualité de la recherche sémantique sans polluer l'UI
- **Explication IA** : GPT-4.1 nano génère une explication quand on ouvre un MCP
- **Analyse approfondie** : GPT-4.1 nano évalue chaque MCP **individuellement** (batches de 10 en parallèle), strict platform matching, cache sessionStorage 24h. 10/mois/user, login requis.
- **Données enrichies** : GitHub stars (API GitHub), use count (Smithery), pricing vérifié par web search (107 MCPs, colonne `pricing_confidence`)
- **Coûts IA** : loggés dans `ai_usage_logs`, dashboard sur `/admin/usage`

### Documentation

| Fichier | Contenu |
|---------|---------|
| `docs/mcp-search/RESEARCH.md` | Recherche : écosystème MCP, sources, approches comparées, problèmes, coûts |
| `docs/mcp-search/PLAN.md` | Plan d'implémentation initial (5 phases) |
| `docs/mcp-search/STATUS.md` | Statut actuel détaillé, ce qui marche/manque, décisions |
| `docs/SECURITY.md` | Auth, rate limiting, anti-scraping, secrets, protection des coûts |

### Structure des fichiers MCP

```
scripts/mcp/
  scrape-smithery.ts            → scraping Smithery.ai (4764 MCPs)
  generate-embeddings.ts        → génération embeddings (37K chunks) — inclut search_keywords dans le content des mcp-chunks
  enrich-search-keywords.ts     → enrichit mcps.search_keywords via LLM (synonymes + brands + cas d'usage)
  reembed-mcp-chunks.ts         → re-embed uniquement les mcp-chunks (à utiliser avec précaution : UPDATE in-place casse l'index ivfflat sur free tier)
  recategorize.ts               → re-infère mcps.categories et mcps.tool_tags à partir des descriptions
scripts/
  fetch-github-stars.ts         → récupération stars GitHub pour tous les MCPs avec repo

app/api/mcp/
  search/route.ts          → recherche vectorielle hybride (embeddings + keyword)
  browse/route.ts          → navigation par catégorie/tool avec tri
  categories/route.ts      → catégories groupées
  explain/route.ts         → explication IA d'un MCP (auth + rate limit)
  deep-analyze/route.ts    → analyse approfondie IA 1-par-1 (auth + 10/mois)
  saved/route.ts           → MCPs sauvegardés (auth)
  usage/route.ts           → dashboard coûts (CRON_SECRET)

app/mcp-search/
  page.tsx                 → page de recherche principale

components/mcp/
  McpSearchInput.tsx       → barre de recherche (avec bouton clear X)
  McpSearchResults.tsx     → grille de résultats
  McpCard.tsx              → card MCP (stars, users, pricing badge)
  McpCategoryFilters.tsx   → filtres catégories groupés
  McpSortSelect.tsx        → tri (qualité, populaire, alphabétique)
  McpDetailSheet.tsx       → panneau détail + explication IA
  McpDeepAnalysis.tsx      → bandeau analyse approfondie

lib/
  ai-usage.ts              → logging des coûts IA
  rate-limit.ts            → rate limiting en mémoire
  api-auth.ts              → helper auth pour API routes
  mcp-categories.ts        → taxonomie des catégories MCP
```

### Tables Supabase

- `mcps` — 4 764 MCPs (nom, description, categories, tool_tags, search_keywords, quality_score, source_url, repo_url, github_stars, use_count, pricing_type, pricing_note, pricing_confidence)
- `mcp_tools` — 32 347 outils (nom, description, input_schema)
- `mcp_chunks` — 37 011 embeddings vectoriels (VECTOR(1536), chunk_type, content)
- `ai_usage_logs` — log de chaque appel IA (endpoint, modèle, tokens, coût)
- `deep_analysis_usage` — compteur d'analyses approfondies par user/mois

### Sécurité

- **CAPTCHA** : Cloudflare Turnstile (gratuit, invisible) sur l'inscription email — vérification serveur via `/api/auth/verify-captcha`
- Toutes les API routes requièrent l'authentification Supabase
- Rate limiting : 10 recherches/min, 5 explain/min, 10 questions/min
- Analyse approfondie : 10/mois/user
- Détails complets dans `docs/SECURITY.md`

### Scripts npm

```bash
npm run mcp:scrape    # scraper les MCPs depuis Smithery
npm run mcp:embed     # générer les embeddings
```
