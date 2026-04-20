# MCP Search Engine — Plan d'implémentation

## Décisions clés

- Tout en anglais (descriptions, chunks, embeddings)
- Queries FR traduites vers EN avant embedding
- Pas de cache agent pour le MVP
- Quality score pour filtrer les MCPs obsolètes/cassés
- Enrichissement des descriptions pauvres via README GitHub

---

## Phase 1 : Base de données

### 1.1 Activer pgvector sur Supabase
- Exécuter `CREATE EXTENSION IF NOT EXISTS vector;`

### 1.2 Créer les tables
- `mcps` — données brutes des MCPs (nom, description, catégories, repo, quality_score)
- `mcp_tools` — outils bruts par MCP (nom, description, input_schema)
- `mcp_chunks` — chunks embeddings (type mcp/tool, contenu texte, vecteur 1536)
- Index ivfflat sur les colonnes embedding

### 1.3 RLS policies
- Lecture publique sur mcps, mcp_tools, mcp_chunks
- Écriture réservée au service role

---

## Phase 2 : Ingestion des données

### 2.1 Script de scraping Smithery (`scripts/mcp/scrape-smithery.ts`)
- Paginer `registry.smithery.ai/servers` pour récupérer la liste complète
- Pour chaque serveur : appeler le endpoint détail pour récupérer les outils + schemas
- Stocker dans `mcps` + `mcp_tools`
- Gérer le rate limiting (pause entre requêtes)

### 2.2 Script d'enrichissement (`scripts/mcp/enrich-mcps.ts`)
- Identifier les MCPs avec 0 outils ou descriptions courtes (<50 chars)
- Pour ceux-ci : fetcher le README GitHub via l'API GitHub
- Parser le README pour extraire les sections outils (patterns : "## Tools", "### Available Tools", listes à puces avec descriptions)
- Mettre à jour `mcp_tools` avec les outils extraits

### 2.3 Script de quality score (`scripts/mcp/compute-quality.ts`)
- Pour chaque MCP avec un repo_url GitHub :
  - Fetcher stars, date du dernier commit via GitHub API
  - Récupérer use_count et verified depuis les données Smithery (déjà stockées)
- Calculer le quality_score composite (0-1) :
  - stars normalisé (log scale) : 30%
  - fraîcheur du dernier commit : 30%
  - use_count normalisé : 20%
  - verified : 20%
- Marquer `active = false` les MCPs avec dernier commit > 12 mois ET 0 stars ET non verified

### 2.4 Script de chunking + embedding (`scripts/mcp/generate-embeddings.ts`)
- Pour chaque MCP actif :
  - Créer 1 chunk "mcp" : `"{description}. Categories: {categories}. {tools_count} tools available. [MCP: {name}]"`
  - Pour chaque outil : créer 1 chunk "tool" : `"{tool_description} [MCP: {name}]"`
- Embedder tous les chunks via text-embedding-3-small (AI Gateway ou OpenAI direct)
- Batch de 100 embeddings par appel API (l'API supporte le batching)
- Insérer dans `mcp_chunks`

---

## Phase 3 : API de recherche

### 3.1 Route de recherche (`app/api/mcp/search/route.ts`)
- POST : reçoit `{ query: string, lang: "fr" | "en", categories?: string[], limit?: number }`
- Si lang = "fr" : traduire la query vers EN (appel LLM léger, GPT-4.1 nano)
- Embedder la query traduite (text-embedding-3-small)
- Recherche pgvector avec pondération quality_score :
  ```sql
  SELECT DISTINCT ON (m.id)
    m.id, m.name, m.description, m.categories, m.repo_url, m.icon_url,
    m.quality_score, m.verified, m.tools_count,
    c.tool_name, c.chunk_type, c.content,
    (1 - (c.embedding <=> $1)) * 0.7 + m.quality_score * 0.3 AS score
  FROM mcp_chunks c
  JOIN mcps m ON m.id = c.mcp_id
  WHERE m.active = true
  ORDER BY m.id, score DESC
  LIMIT $2
  ```
- Filtrage optionnel par catégories
- Grouper les résultats en tiers : >0.80, 0.65-0.80, 0.50-0.65
- Retourner JSON avec MCPs + outils matchants + scores

### 3.2 Route d'analyse approfondie (`app/api/mcp/analyze/route.ts`)
- POST : reçoit `{ query: string, results: MCP[] }` (les top résultats de l'étape 1)
- Appel agent IA (GPT-4.1 mini) avec les résultats pré-filtrés
- System prompt : "Tu es un expert MCP. Classe ces MCPs par pertinence pour la query utilisateur. Explique pourquoi chacun est pertinent. Identifie le meilleur choix."
- Retourne le classement + explications en streaming

### 3.3 Route de catégories (`app/api/mcp/categories/route.ts`)
- GET : retourne la liste des catégories avec le nombre de MCPs par catégorie

### 3.4 Route de détail (`app/api/mcp/[slug]/route.ts`)
- GET : retourne un MCP avec tous ses outils et leurs descriptions

---

## Phase 4 : UI

### 4.1 Page de recherche (`app/mcp-search/page.tsx`)
- Server Component avec SearchInput (Client Component)
- Layout : barre de recherche en haut, filtres catégoriels à gauche, résultats au centre

### 4.2 Composants
- `McpSearchInput` — barre de recherche avec debounce, placeholder "What do you want to do?"
- `McpSearchResults` — liste de résultats groupés par tier (vert/jaune/orange)
- `McpCard` — card pour un MCP : nom, description, outils matchants, badges (verified, popular, inactive), score
- `McpCategoryFilters` — filtres checkbox par catégorie
- `McpDetailSheet` — sheet/drawer avec le détail complet d'un MCP (tous les outils)
- `McpAnalyzeButton` — bouton "Analyse approfondie" qui déclenche l'agent

### 4.3 Traductions
- Ajouter les clés FR/EN dans `lib/i18n.ts` pour la page MCP search

---

## Phase 5 : Cron de mise à jour

### 5.1 Route cron (`app/api/mcp/update/route.ts`)
- Protégée par CRON_SECRET (même pattern que le cron quiz)
- Re-scrape Smithery (nouveaux MCPs uniquement, comparaison par smithery_id)
- Re-calcule quality_score pour tous les MCPs
- Embed les nouveaux chunks uniquement
- Désactive les MCPs supprimés de Smithery

### 5.2 Config cron (`vercel.ts`)
- Ajouter une entrée cron hebdomadaire (dimanche 3h UTC par exemple)

---

## Ordre d'exécution

```
Phase 1 (DB)           → 1.1 → 1.2 → 1.3
Phase 2 (Ingestion)    → 2.1 → 2.2 → 2.3 → 2.4
Phase 3 (API)          → 3.1 → 3.3 → 3.4 → 3.2
Phase 4 (UI)           → 4.1 → 4.2 → 4.3
Phase 5 (Cron)         → 5.1 → 5.2
```

Phases 3 et 4 peuvent être développées en parallèle une fois la phase 2 terminée.

---

## Fichiers à créer

```
scripts/mcp/
  scrape-smithery.ts        # Phase 2.1
  enrich-mcps.ts            # Phase 2.2
  compute-quality.ts        # Phase 2.3
  generate-embeddings.ts    # Phase 2.4

app/api/mcp/
  search/route.ts           # Phase 3.1
  analyze/route.ts          # Phase 3.2
  categories/route.ts       # Phase 3.3
  [slug]/route.ts           # Phase 3.4
  update/route.ts           # Phase 5.1

app/mcp-search/
  page.tsx                  # Phase 4.1

components/
  McpSearchInput.tsx        # Phase 4.2
  McpSearchResults.tsx      # Phase 4.2
  McpCard.tsx               # Phase 4.2
  McpCategoryFilters.tsx    # Phase 4.2
  McpDetailSheet.tsx        # Phase 4.2
  McpAnalyzeButton.tsx      # Phase 4.2
```

## Fichiers à modifier

```
lib/i18n.ts                 # Phase 4.3 — ajouter clés MCP search
lib/supabase.ts             # Types pour mcps, mcp_tools, mcp_chunks
vercel.ts                   # Phase 5.2 — ajouter cron entry
SUPABASE_SETUP.sql          # Phase 1.2 — ajouter les nouvelles tables
```
