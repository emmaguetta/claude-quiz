# MCP Search Engine — Recherche & Décisions d'Architecture

> Document de recherche exhaustif pour le moteur de recherche MCP intégré à claude-quiz.
> Trace écrite de toutes les approches envisagées, comparées, et des décisions prises.
>
> Date de début : 2026-04-17

---

## Table des matières

1. [Contexte et objectif](#1-contexte-et-objectif)
2. [Recherche sur l'écosystème MCP existant](#2-recherche-sur-lécosystème-mcp-existant)
3. [Sources de données — comparaison détaillée](#3-sources-de-données--comparaison-détaillée)
4. [Approches de recherche envisagées](#4-approches-de-recherche-envisagées)
5. [Stratégie d'embedding — 1 vs N par MCP](#5-stratégie-dembedding--1-vs-n-par-mcp)
6. [Analyse de coûts détaillée](#6-analyse-de-coûts-détaillée)
7. [Problèmes identifiés et solutions](#7-problèmes-identifiés-et-solutions)
8. [Architecture finale retenue](#8-architecture-finale-retenue)
9. [Questions ouvertes](#9-questions-ouvertes)

---

## 1. Contexte et objectif

### Le projet claude-quiz

Le site claude-quiz est une plateforme d'apprentissage interactive sur Claude Code. Il propose des quiz multi-catégories (commands, shortcuts, concepts, MCP, workflow, skills) avec :
- Génération automatique de questions via IA (cron hebdomadaire)
- Support FR/EN
- Auth Supabase (email, GitHub, Google)
- Suivi de progression et hi-scores

Stack : Next.js 16 + Supabase (PostgreSQL) + AI SDK v6 + shadcn/ui + Tailwind CSS v4.

### La nouvelle fonctionnalité

Créer un moteur de recherche en langage naturel pour les MCPs (Model Context Protocol servers). L'utilisateur tape ce qu'il veut faire (ex : "je veux envoyer des emails automatiquement") et le système retourne les MCPs qui le permettent, avec les outils précis qui matchent sa requête.

### Pourquoi c'est intéressant

- L'écosystème MCP explose (~3000-6000 serveurs en avril 2026) mais il n'existe aucun moteur de recherche sémantique de référence
- Les annuaires existants (mcp.so, Glama, awesome-mcp-servers) ne proposent que de la recherche par mots-clés ou navigation par catégories
- Le vrai besoin utilisateur est : "je veux FAIRE X" → "voici les MCPs qui te permettent de faire X, et voici exactement quels outils utiliser"

---

## 2. Recherche sur l'écosystème MCP existant

### Annuaires et registres identifiés (état avril 2026)

| Annuaire | URL | Serveurs indexés | API disponible | Niveau de détail |
|----------|-----|-----------------|---------------|-----------------|
| **Smithery.ai** | smithery.ai | ~2 000+ | Oui (JSON, riche) | Excellent — outils + schemas |
| **awesome-mcp-servers** | github.com/punkpeye/awesome-mcp-servers | ~2 000+ | Markdown brut | Minimal — 1 phrase par MCP |
| **mcp.so** | mcp.so | ~3 000-5 000 | Non | Minimal |
| **Glama.ai** | glama.ai/mcp | ~21 654 (affiché) | Non (web only) | Minimal |
| **PulseMCP** | pulsemcp.com | Inconnu | Bloqué (Cloudflare) | Inconnu |
| **mcp.run** | mcp.run | Inconnu | Oui | Focalisé WASM |
| **Registre officiel MCP** | registry.modelcontextprotocol.io | En croissance | Oui (JSON) | Metadata install uniquement, PAS d'outils |
| **Composio** | composio.dev | 250+ intégrations | Oui | Managed servers |
| **Anthropic servers repo** | github.com/modelcontextprotocol/servers | ~40-50 | Markdown | Bon (référence officielle) |

### Recherche sémantique existante ?

Aucune solution dominante identifiée :
- Glama et Smithery ont de la recherche, mais surtout keyword-based
- Quelques projets GitHub expérimentaux (embeddings sur descriptions) mais rien de mature
- Exa.ai et Tavily (eux-mêmes des MCPs) peuvent chercher des MCPs sur le web mais ce n'est pas leur focus

**Conclusion** : Il y a un vrai vide à combler. Personne ne fait de recherche sémantique au niveau des OUTILS individuels.

---

## 3. Sources de données — comparaison détaillée

### Smithery.ai — LA source principale

**Endpoints identifiés :**
- `registry.smithery.ai/servers` — liste paginée
- `registry.smithery.ai/servers/{qualifiedName}` — détail avec outils

**Champs disponibles par serveur (liste) :**
```json
{
  "id": "...",
  "qualifiedName": "github/github-mcp-server",
  "displayName": "GitHub MCP Server",
  "description": "Interact with GitHub repositories...",
  "iconUrl": "...",
  "verified": true,
  "useCount": 15234,
  "remote": true,
  "isDeployed": true,
  "createdAt": "2024-12-15T...",
  "homepage": "https://github.com/github/github-mcp-server",
  "owner": { ... },
  "score": 0.95
}
```

**Champs supplémentaires par serveur (détail) :**
```json
{
  "tools": [
    {
      "name": "create_pull_request",
      "description": "Create a new pull request in a GitHub repository",
      "inputSchema": {
        "type": "object",
        "properties": {
          "repo": { "type": "string", "description": "Repository name" },
          "owner": { "type": "string", "description": "Repository owner" },
          "title": { "type": "string" },
          "body": { "type": "string" },
          "head": { "type": "string" },
          "base": { "type": "string" }
        }
      }
    }
    // ... 85 autres outils pour GitHub MCP
  ],
  "connections": [ ... ],
  "security": { ... }
}
```

**Points forts :**
- Seule source avec les outils ET leurs schemas JSON complets
- Données structurées, API REST propre
- Champ `useCount` pour la popularité
- Champ `verified` pour la qualité

**Points faibles :**
- Pas tous les serveurs ont leurs outils renseignés (certains = 0 tools)
- Couverture pas exhaustive (~2 000 vs ~6 000 total estimé)

### awesome-mcp-servers (GitHub)

**Format :** Markdown, une ligne par entrée.
```
- [username/repo](url) [badges] - One-sentence description
```

**Exemple :**
```
- [julien040/anyquery](https://github.com/julien040/anyquery) - Query more than 40 apps with one binary using SQL.
```

**Points forts :** Le plus exhaustif en nombre d'entrées.
**Points faibles :** Zéro information sur les outils. Juste nom + URL + 1 phrase.

### Registre officiel MCP

**Endpoint :** `registry.modelcontextprotocol.io/v0.1/servers`

C'est un registre de DISTRIBUTION (comment installer/lancer), pas de CAPACITÉS (quels outils).

**Exemple pour Supabase MCP :**
```json
{
  "name": "com.supabase/mcp",
  "description": "MCP server for interacting with the Supabase platform",
  "version": "0.7.0",
  "packages": [{ "registryType": "npm", "identifier": "@supabase/mcp-server-supabase" }]
}
```

Pas d'outils listés. Utile uniquement pour les métadonnées d'installation.

### READMEs GitHub individuels

La documentation la plus fiable pour chaque MCP est dans son propre repo. Mais le format varie énormément :

- **Supabase MCP** : README avec chaque outil listé et décrit, groupé par feature
- **GitHub MCP** : Outils documentés dans des fichiers docs séparés
- **Filesystem MCP** : Outils uniquement dans le code source

**Conclusion sur les sources :** Smithery est la base, enrichi par les READMEs GitHub pour les MCPs sans outils sur Smithery.

---

## 4. Approches de recherche envisagées

### Approche A : Filtres binaires + full-text search (zéro IA)

**Principe :** Catégoriser chaque MCP (database, email, file-system, search, dev-tools...) → filtres à cocher + recherche full-text PostgreSQL (`tsvector`).

**Avantages :**
- Zéro coût par recherche
- Simple à implémenter
- Rapide

**Inconvénients :**
- Pas de compréhension sémantique
- "Je veux un truc pour gérer mes to-do" ne trouve rien si le tag exact manque
- Dépend de la qualité du tagging manuel
- Rigide — chaque nouveau concept demande un nouveau tag

**Verdict : Rejeté comme approche principale.** Trop limité pour le langage naturel. Mais conservé comme complément (filtres catégoriels en plus de la recherche sémantique).

### Approche B : Recherche vectorielle pure (embeddings)

**Principe :** Embedder les descriptions/tools de chaque MCP → stocker dans Supabase pgvector → à chaque query, embedder la query et faire un similarity search.

**Avantages :**
- Excellente compréhension sémantique
- Gère synonymes et langage naturel
- Coût quasi-nul ($0.0000004 par recherche)
- pgvector inclus gratuitement dans Supabase

**Inconvénients :**
- Pas d'explication du "pourquoi" un MCP matche
- Qualité dépend de la qualité des descriptions sources
- Pas de raisonnement multi-critères

**Verdict : Retenu comme première couche de recherche.**

### Approche C : Agent IA à chaque recherche (zéro embedding)

**Principe :** À chaque recherche, un LLM lit la base de MCPs, comprend la query, raisonne et retourne un classement expliqué.

**Avantages :**
- Meilleure qualité de résultats (raisonnement)
- Explications personnalisées
- Gère les queries complexes multi-critères

**Inconvénients :**
- Coût élevé à l'échelle ($0.01-0.05 par recherche)
- Latence 3-10 secondes
- Ne scale pas : l'agent ne peut pas lire 3 000 MCPs à chaque fois
- Coût pour 1M requêtes : $10K-50K selon le modèle

**Verdict : Rejeté comme approche unique.** L'agent ne peut pas lire toute la base à chaque requête. Mais retenu comme deuxième couche optionnelle sur les résultats pré-filtrés.

### Approche D : Hybride embeddings + agent (RETENUE)

**Principe :** Deux vitesses.
1. Recherche vectorielle instantanée (embeddings) → top 50 résultats
2. Optionnellement, agent IA qui analyse les 50 résultats pré-filtrés → classement + explications

**Avantages :**
- Meilleur des deux mondes
- Par défaut rapide et gratuit
- Agent optionnel ne traite que 50 résultats (pas 3 000)
- Cache vectoriel pour éviter de rappeler l'agent pour des queries similaires

**C'est l'approche retenue.**

---

## 5. Stratégie d'embedding — 1 vs N par MCP

### Le problème de l'embedding unique

Un seul embedding pour tout un MCP (description + tous les outils) crée un vecteur "moyenné" qui ne représente bien aucune capacité spécifique.

**Exemple :** GitHub MCP avec 86 outils. Un embedding unique = un vecteur flou "GitHub en général". La query "je veux créer des gists" est diluée dans la moyenne des 86 outils.

C'est le **curse of averaging** : plus on met de texte dans un embedding, plus le vecteur devient générique et perd en précision pour les recherches spécifiques.

### La stratégie multi-chunk retenue

Pour chaque MCP, on crée plusieurs embeddings :

**Chunk de type "mcp" (1 par MCP) :**
```
"GitHub MCP Server — Interact with GitHub repositories, issues,
pull requests, actions, and code. Categories: code, git, ci-cd,
collaboration. 86 tools available."
```
→ Matche les queries vagues ("un truc pour GitHub")

**Chunk de type "tool" (1 par outil) :**
```
"GitHub MCP Server — Tool: create_pull_request — Create a new pull
request in a GitHub repository with title, body, head branch and
base branch"
```
→ Matche les queries précises ("je veux créer des pull requests")

**Optionnel — chunk de type "tool_group" (groupes de 3-5 outils similaires) :**
```
"GitHub MCP Server — PR Management: create_pull_request (create PRs),
merge_pull_request (merge PRs), update_pull_request (update PRs),
list_pull_requests (list PRs)"
```
→ Compromis entre précision et contexte

### Volumétrie estimée

- ~3 000 MCPs
- ~10 chunks en moyenne par MCP (1 global + ~9 outils)
- ~30 000 embeddings totaux
- ~6 KB par embedding (1536 dimensions × 4 bytes)
- **~180 MB de stockage total**
- Dans les limites du plan free Supabase (500 MB)

### Modèle de données

```sql
-- Table des MCPs (données brutes)
CREATE TABLE mcps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  categories TEXT[],
  source_url TEXT,
  repo_url TEXT,
  icon_url TEXT,
  tools_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  quality_score REAL DEFAULT 0,
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des chunks avec embeddings
CREATE TABLE mcp_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_id UUID REFERENCES mcps(id) ON DELETE CASCADE,
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('mcp', 'tool', 'tool_group')),
  content TEXT NOT NULL,
  tool_name TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour la recherche vectorielle
CREATE INDEX ON mcp_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Table de cache des recherches approfondies
CREATE TABLE search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  query_embedding VECTOR(1536),
  agent_response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON search_cache USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
```

---

## 6. Analyse de coûts détaillée

### Coûts de setup (one-shot)

| Opération | Calcul | Coût |
|-----------|--------|------|
| Embedding initial des MCPs | 30K chunks × 100 tokens × $0.02/1M tokens (text-embedding-3-small) | **$0.06** |
| Scraping Smithery API | Gratuit (API publique) | **$0** |
| Scraping READMEs GitHub | Gratuit (API GitHub, rate limit 5000 req/h) | **$0** |
| Supabase pgvector | Inclus dans le plan free | **$0** |
| **Total setup** | | **~$0.06** |

### Coûts par recherche

| Opération | Coût unitaire |
|-----------|--------------|
| Embedding de la query | $0.0000004 (~20 tokens) |
| pgvector similarity search | $0 (compute Supabase) |
| **Recherche basique totale** | **$0.0000004** |

### Coûts de l'analyse approfondie (agent)

Contexte envoyé à l'agent : ~50 MCPs × 200 tokens + query + system prompt ≈ 11 500 tokens

| Modèle | Input $/1M | Output $/1M | Coût/requête | 1K requêtes | 1M requêtes |
|--------|-----------|------------|-------------|-------------|-------------|
| GPT-4.1 nano | $0.10 | $0.40 | $0.0015 | $0.0015 | $1 550 |
| GPT-4.1 mini | $0.40 | $1.60 | $0.006 | $0.006 | $5 800 |
| Claude Haiku 3.5 | $0.80 | $4.00 | $0.012 | $0.012 | $12 800 |
| Claude Sonnet 4 | $3.00 | $15.00 | $0.048 | $0.048 | $48 500 |

### Projections selon le trafic

**Hypothèse : 10% des users cliquent "analyse approfondie", modèle GPT-4.1 mini, cache vectoriel actif**

| Trafic mensuel | Recherches basiques | Analyses agent (avec cache) | Coût total/mois |
|---------------|--------------------|-----------------------------|----------------|
| 100 recherches | $0.00004 | ~30 agent calls = $0.18 | **$0.18** |
| 1 000 | $0.0004 | ~50 unique = $0.30 | **$0.30** |
| 10 000 | $0.004 | ~200 unique = $1.20 | **$1.20** |
| 100 000 | $0.04 | ~1 000 unique = $6 | **$6** |
| 1 000 000 | $0.40 | ~3 000 unique = $18 | **$18** |

Le cache vectoriel fait que le nombre de queries uniques plafonne rapidement — les gens cherchent souvent les mêmes choses.

---

## 7. Problèmes identifiés et solutions

### Problème 1 : Le nom du MCP biaise les chunks

**Description :** On inclut "GitHub MCP Server" dans chaque chunk d'outil. L'embedding est tiré vers "GitHub", ce qui favorise les MCPs dont le nom est sémantiquement riche.

**Exemple :** La query "chercher du code" matche mieux "GitHub MCP — search_code" que "Sourcegraph MCP — search" simplement parce que "GitHub" est plus associé au code dans l'espace vectoriel.

**Impact :** Moyen. Les MCPs avec des noms génériques ou peu connus sont désavantagés.

**Solution retenue :** Mettre le nom du MCP en suffixe plutôt qu'en préfixe dans le chunk outil :
```
Avant : "GitHub MCP Server — Tool: search_code — Search for code..."
Après : "Code search tool — Search for code across repositories... [MCP: GitHub]"
```
Le début du texte a plus d'influence sur l'embedding. En mettant la description fonctionnelle en premier, on optimise pour la query utilisateur.

### Problème 2 : Descriptions inégales entre MCPs

**Description :** Smithery a des descriptions très détaillées pour certains MCPs (GitHub : "Create a new pull request with title, body, head branch, base branch, draft mode, reviewers, and labels") et très pauvres pour d'autres ("Create PR").

**Impact :** Élevé. Les MCPs bien documentés captent plus de queries variées. Un MCP mal documenté est invisible même s'il fait exactement ce que l'utilisateur cherche.

**Solution retenue :** Enrichissement en 3 étapes :
1. Smithery tools (source primaire)
2. Pour les MCPs avec descriptions courtes : scraper le README GitHub et extraire les sections "Tools", "Features", "Available Tools"
3. Pour les MCPs importants sans données : lire l'`inputSchema` — les noms des paramètres révèlent les capacités (ex: paramètre `reviewers` indique qu'on peut assigner des reviewers)

### Problème 3 : Gros MCPs surreprésentés

**Description :** GitHub MCP = 86 chunks, petit MCP spécialisé = 2 chunks. Pour les queries vagues, les gros MCPs ont statistiquement plus de chances de matcher quelque chose.

**Impact :** Faible. On utilise `DISTINCT ON (mcp_id)` avec le MEILLEUR score de chunk par MCP, pas la somme. Un petit MCP avec un seul chunk ultra-pertinent battra un gros MCP avec 86 chunks moyennement pertinents.

**Solution :** Déjà géré par le `DISTINCT ON`. Pas d'action supplémentaire nécessaire.

### Problème 4 : Multilingue (FR ↔ EN)

**Description :** Le site est FR/EN mais les descriptions Smithery sont 100% en anglais. La similarité cross-lingue des embeddings est bonne mais pas parfaite (~10-15% de perte).

**Impact :** Moyen. Un utilisateur français qui tape "envoyer des emails" aura des résultats légèrement moins bons qu'un anglophone tapant "send emails".

**Solutions envisagées :**
- Option A : Traduire la query FR→EN avant d'embedder (coût additionnel minime, ~$0.001/query avec un modèle léger)
- Option B : Doubler les chunks (un en FR, un en EN) → double le stockage et les embeddings
- Option C : Accepter la perte de ~10% — text-embedding-3-small est plutôt bon en cross-lingue

**Solution retenue :** Option A pour commencer (simple, pas cher). Evaluer si la perte cross-lingue est un problème réel en pratique avant de complexifier.

### Problème 5 : Synonymes techniques / jargon

**Description :** "CRUD" vs "Execute SQL queries", "scraping" vs "fetch and parse HTML" — les embeddings ne font pas toujours le lien entre jargon technique et description fonctionnelle.

**Impact :** Faible. Les embeddings modernes (text-embedding-3-small) captent raisonnablement ces liens. Les cas limites seront couverts par l'analyse approfondie de l'agent.

**Solution :** Pas d'action spécifique. L'agent gère les cas limites.

### Problème 6 : Cache trop agressif

**Description :** Avec un seuil de cache à 0.92, des queries proches vectoriellement mais d'intention différente peuvent retourner le même résultat caché.

**Exemple :**
- "envoyer des emails marketing" → agent recommande Mailchimp, SendGrid
- "envoyer des emails transactionnels" (similarité 0.94) → cache hit → même résultat orienté marketing → MAUVAIS

**Impact :** Moyen. Peut retourner des résultats inadaptés pour des queries voisines mais d'intention différente.

**Solution retenue :** Monter le seuil à 0.95-0.97. Alternativement, inclure les IDs des top résultats de l'étape 1 dans la clé de cache — deux queries similaires mais avec des résultats embedding différents ne partagent pas le cache.

### Problème 7 : MCPs obsolètes / cassés / doublons

**Description :** Sur ~3 000 MCPs, beaucoup sont abandonnés, cassés, ou en doublon.

**Impact :** Élevé. L'utilisateur reçoit des MCPs morts dans ses résultats → expérience dégradée.

**Solution retenue :** Ajouter un `quality_score` composite :
- GitHub stars (normalisé)
- Date du dernier commit (pénalité si > 6 mois)
- Downloads npm/PyPI
- Champ `verified` de Smithery
- Champ `useCount` de Smithery

Score final de ranking : `final_score = similarity * 0.7 + quality_score * 0.3`

Affichage de badges visuels : "Verified", "Popular", "Inactive (6+ months)".

---

## 8. Architecture finale retenue

### Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────────┐
│                        FLUX DE RECHERCHE                        │
│                                                                  │
│  Input utilisateur ──→ [Traduction FR→EN si nécessaire]         │
│         │                                                        │
│         ▼                                                        │
│  Embedding de la query (text-embedding-3-small)                 │
│         │                                                        │
│         ▼                                                        │
│  pgvector similarity search sur mcp_chunks                      │
│  + pondération quality_score                                     │
│  + DISTINCT ON (mcp_id) → meilleur chunk par MCP                │
│         │                                                        │
│         ▼                                                        │
│  Top 50 résultats groupés en 3 tiers :                          │
│    🟢 Très pertinents (>0.80) — développés                      │
│    🟡 Pertinents (0.65-0.80) — repliés                          │
│    🟠 Possiblement utiles (0.50-0.65) — "Voir plus..."         │
│         │                                                        │
│         ▼                                                        │
│  [Bouton "Analyse approfondie"] (optionnel)                     │
│         │                                                        │
│         ▼                                                        │
│  Check cache vectoriel (seuil 0.95)                             │
│    ├─ HIT  → réponse instantanée, $0                            │
│    └─ MISS → Agent IA (GPT-4.1 mini) analyse les 50 résultats  │
│              → classement + explications                         │
│              → stocké en cache                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Pipeline d'ingestion des données

```
┌──────────────────────────────────────────────────────────────────┐
│                    PIPELINE D'INGESTION                          │
│                                                                  │
│  1. Scrape Smithery API                                         │
│     → Liste paginée de tous les serveurs                        │
│     → Pour chaque serveur : détail avec outils + schemas        │
│                                                                  │
│  2. Enrichissement                                               │
│     → MCPs sans outils sur Smithery :                           │
│       → Scrape README GitHub du repo                            │
│       → Extraction d'outils (patterns : ## Tools, listes)       │
│     → MCPs avec descriptions courtes :                          │
│       → Enrichir via inputSchema (noms de paramètres)           │
│                                                                  │
│  3. Calcul du quality_score                                      │
│     → GitHub stars, dernier commit, downloads, verified, useCount│
│                                                                  │
│  4. Génération des chunks                                        │
│     → 1 chunk "mcp" par serveur (description globale)           │
│     → 1 chunk "tool" par outil (description fonctionnelle)      │
│                                                                  │
│  5. Embedding                                                    │
│     → text-embedding-3-small via AI Gateway                     │
│     → Stockage dans mcp_chunks.embedding                        │
│                                                                  │
│  6. Cron hebdomadaire                                            │
│     → Re-scrape Smithery                                        │
│     → Embed les nouveaux MCPs uniquement                        │
│     → Mise à jour quality_score                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Tables Supabase

```sql
-- Extension vectorielle
CREATE EXTENSION IF NOT EXISTS vector;

-- Table des MCPs
CREATE TABLE mcps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  categories TEXT[],
  source_url TEXT,
  repo_url TEXT,
  icon_url TEXT,
  smithery_id TEXT,
  tools_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  github_stars INTEGER DEFAULT 0,
  last_commit_at TIMESTAMPTZ,
  quality_score REAL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des outils (données brutes)
CREATE TABLE mcp_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_id UUID REFERENCES mcps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  input_schema JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des chunks embeddings
CREATE TABLE mcp_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_id UUID REFERENCES mcps(id) ON DELETE CASCADE,
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('mcp', 'tool', 'tool_group')),
  content TEXT NOT NULL,
  tool_name TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour la recherche vectorielle
CREATE INDEX idx_mcp_chunks_embedding ON mcp_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Table de cache des analyses approfondies
CREATE TABLE search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  query_embedding VECTOR(1536),
  agent_response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_search_cache_embedding ON search_cache
  USING ivfflat (query_embedding vector_cosine_ops) WITH (lists = 50);
```

### API Routes

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/mcp/search` | POST | Recherche vectorielle — reçoit query, retourne top MCPs avec scores |
| `/api/mcp/analyze` | POST | Analyse approfondie — agent IA sur les résultats pré-filtrés |
| `/api/mcp/categories` | GET | Liste des catégories avec compteurs |
| `/api/mcp/[slug]` | GET | Détail d'un MCP (tous ses outils) |

### Stack technique

- **Embedding** : text-embedding-3-small via AI Gateway (OIDC auth)
- **Recherche vectorielle** : pgvector sur Supabase (plan free)
- **Agent IA** : GPT-4.1 mini via AI Gateway (pour l'analyse approfondie)
- **Cache** : search_cache table avec similarité vectorielle (seuil 0.95)
- **Cron** : Hebdomadaire (même pattern que le cron quiz existant)
- **UI** : shadcn/ui — SearchInput + résultats cards + filtres catégoriels

---

## 9. Questions ouvertes

### À décider avant l'implémentation

1. **Seuil de cache optimal** : 0.95 ou 0.97 ? À tester empiriquement avec des queries réelles.

2. **Traduction FR→EN** : Faut-il systématiquement traduire les queries FR ou laisser les embeddings cross-lingues gérer ? À tester en comparant les résultats.

3. **Groupement d'outils** : Faut-il des chunks "tool_group" (3-5 outils similaires) en plus des chunks individuels ? Ou est-ce que tool + mcp suffisent ?

4. **Rate limit sur l'analyse approfondie** : Combien par utilisateur non-inscrit ? 3/jour ? 10/jour ? Illimité ?

5. **Fréquence du cron de mise à jour** : Hebdomadaire ? Quotidien ? L'écosystème MCP bouge vite.

6. **Page dédiée ou intégrée** : Nouvelle page `/mcp-search` ou section dans la page existante ?

7. **Smithery API rate limits** : Vérifier s'il y a des limites sur le scraping initial (~3 000 requêtes détail).

### À évaluer après le MVP

- Qualité réelle du ranking sur des queries variées
- Taux d'utilisation de l'analyse approfondie
- Hit rate du cache
- Feedback utilisateur sur la pertinence
- Nécessité d'un modèle d'embedding plus performant (text-embedding-3-large)
