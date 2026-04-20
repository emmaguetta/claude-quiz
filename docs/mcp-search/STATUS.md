# MCP Search Engine — Statut du projet

> Dernière mise à jour : 2026-04-20 (après-midi)

## Changements 2026-04-20 (après-midi)

Cette section résume les évolutions de la session de l'après-midi du 20/04. Pour les détails antérieurs, voir les sections suivantes.

### Problème détecté
`search_mcps()` ne retournait PAS Gmail en top pour la query `"gmail"`. Les queries ultra-courtes (1 mot) produisent des embeddings bruités → cosine < seuil → Gmail exclu avant d'arriver au scoring keyword. Même constat pour `"slack"`, `"notion"`, etc.

### Schéma : nouvelles colonnes

| Colonne | Type | Rôle | Visible UI ? |
|---------|------|------|--------------|
| `mcps.tool_tags` | `text[]` | Tags brands (google, slack, github, openai, etc. — 56 brands) — permet filtre par outil | Oui (filtres sidebar) |
| `mcps.search_keywords` | `text` | Synonymes + cas d'usage générés par LLM, stockés en virgules | **Non** — enrichit l'embedding et le LIKE match |

### Index ajoutés

- `idx_mcps_tool_tags` (GIN) — filtre rapide par brand
- `mcps_name_trgm_idx`, `mcps_description_trgm_idx`, `mcps_search_keywords_trgm_idx` (GIN pg_trgm) — accélère les `LIKE '%word%'` du path keyword
- **Extension pg_trgm activée** (nécessaire pour les index trgm ci-dessus)

### RPC `search_mcps()` — refonte hybride complète

Le RPC a été réécrit pour fixer le bug "gmail absent". Changements :

1. **Paramètre ajouté** : `filter_tool_tags text[] DEFAULT NULL` → permet le filtre par brand côté API
2. **Retour enrichi** : ajout de `mcp_tool_tags text[]` dans la table retournée
3. **Nouveau path `keyword_mcps`** : union indépendante du path cosine — un MCP dont le nom/description/search_keywords contient un mot de la query est inclus même si son embedding n'atteint pas le seuil cosine. C'est ce qui fait que "gmail" retrouve Gmail.
4. **Pondération rééquilibrée** :

| Score | Avant | Après | Raison |
|-------|-------|-------|--------|
| Cosine similarity | 55% | **40%** | Plus de poids pour keywords vu que les embeddings courts sont bruités |
| Keyword ratio (name + desc + search_keywords) | 30% | **30%** | Inchangé — maintenant lit aussi search_keywords |
| Name match (binaire : mot présent dans le nom) | — | **20%** | Nouveau — bonus fort pour matching direct sur le nom |
| Multi-match boost | 10% | 5% | Moins nécessaire avec le name_match |
| Quality score | 5% | 5% | Inchangé |

### Re-embedding avec descriptions enrichies

Le content des `mcp_chunks` de type `mcp` inclut maintenant :
```
{description}. Categories: {cats}. {N} tools available. Keywords: {search_keywords}. [MCP: {name}]
```
→ Gain : même les queries sémantiques (non-mots-à-mots) trouvent les MCPs pertinents grâce aux keywords injectés dans l'embedding.

### Enrichissement LLM des descriptions

- **Script** : `scripts/mcp/enrich-search-keywords.ts`
- **Modèle** : `gpt-4.1-nano` (le moins cher)
- **Prompt** : génère 10-15 keywords (brands, synonymes, cas d'usage) par MCP
- **Concurrence** : 10 appels en parallèle
- **Résultat** : 4763/4764 MCPs enrichis
- **Coût total** : ~$0.50

### Re-génération des embeddings

- **Script modifié** : `scripts/mcp/generate-embeddings.ts` (ajout de `search_keywords` dans le content)
- **Script intermédiaire** : `scripts/mcp/reembed-mcp-chunks.ts` (re-embed uniquement les mcp-chunks, utile pour itérer)
- **37 111 chunks re-embeddés** en ~8 min
- **Coût** : ~$0.07

### Incident : index ivfflat stale + limite mémoire free tier

**Problème** : après avoir UPDATE 4764 chunks in-place avec les nouveaux embeddings, l'index ivfflat existant est devenu stale (les nouveaux vecteurs étaient dans de mauvais clusters). Un REINDEX a échoué car il nécessite 60 MB de RAM et le plan free de Supabase est limité à 32 MB.

**Solution appliquée** : 
1. `TRUNCATE mcp_chunks` — table vidée
2. `CREATE INDEX` ivfflat sur table vide — instantané, 0 RAM
3. Re-insertion des 37k chunks via script (chaque insert rejoint un cluster existant, sans rebuild)

**Leçon** : sur free tier, **ne pas UPDATE en masse une colonne vector indexée**. Toujours DELETE + INSERT pour forcer une insertion clean dans l'index existant.

### Performance mesurée (prod Vercel)

| Query | Top résultat | Temps |
|-------|--------------|-------|
| `gmail` | Gmail (0.70) · `gmail_send_message` | 7s cold, ~1-2s warm |
| `slack notifications` | Slack (0.74) · `slack_list_scheduled_messages` | 7s cold |
| `create stripe payment` | Stripe (0.81) · `retrieve_balance` | 2.5s |
| `notion database` | notion (0.66) | 4s |

---

## Ce qui a été fait

### Phase 1 : Base de données (100%)
- pgvector activé sur Supabase
- Tables créées : `mcps`, `mcp_tools`, `mcp_chunks`, `ai_usage_logs`, `deep_analysis_usage`
- Index ivfflat pour la recherche vectorielle + index trgm GIN sur `mcps.name`, `description`, `search_keywords`
- Extension `pg_trgm` activée
- RLS policies sur toutes les tables
- Fonction SQL `search_mcps()` avec pondération hybride (cf. section "Changements 2026-04-20 (après-midi)" plus haut pour la formule à jour) :
  - **40% cosine similarity** (embeddings vectoriels)
  - **30% keyword ratio** (mots discriminants trouvés dans nom + description + search_keywords)
  - **20% name match** (binaire : mot de la query présent dans le nom)
  - **5% multi-match boost**
  - **5% quality score**
- Path `keyword_mcps` en UNION du path cosine (assure qu'un MCP dont le nom matche est trouvé même sans cosine fort)
- Filtrage de stop words : mots génériques (the, and, for...) + verbes non-discriminants (send, get, create, search...) retirés avant le keyword matching

### Phase 2 : Ingestion des données (100%)
- **4 764 MCPs** scrappés depuis Smithery.ai (`scripts/mcp/scrape-smithery.ts`)
- **32 347 outils** documentés avec descriptions et schemas
- **37 011 embeddings** générés via text-embedding-3-small (`scripts/mcp/generate-embeddings.ts`)
- Catégories auto-inférées (14 catégories : database, code, communication, file-system, ai, web, devops, productivity, data, search, media, finance, security, monitoring)
- Quality score calculé (use_count, verified, smithery score)
- **GitHub stars** récupérées via API GitHub pour ~1900 MCPs avec repo (`scripts/fetch-github-stars.ts`)
- **Pricing** vérifié par web search pour les 107 MCPs les plus populaires (colonnes `pricing_type`, `pricing_note`, `pricing_confidence`)

### Phase 3 : API (100%)
- `/api/mcp/search` — Recherche vectorielle hybride (embeddings + keyword matching)
- `/api/mcp/browse` — Navigation par catégorie/tool avec tri (quality, popular, alphabetical)
- `/api/mcp/categories` — Liste des catégories groupées avec compteurs
- `/api/mcp/explain` — Explication IA d'un MCP par rapport à la query (GPT-4.1 nano)
- `/api/mcp/deep-analyze` — Analyse approfondie IA (voir section dédiée ci-dessous)
- `/api/mcp/saved` — MCPs sauvegardés
- `/api/mcp/usage` — Dashboard coûts IA (protégé par CRON_SECRET)

### Phase 4 : UI (100%)
- Page `/mcp-search` — Recherche + browse dual-mode
- `McpSearchInput` — Barre de recherche avec bouton clear (X), persistance URL (?q=)
- `McpSearchResults` — Grille de résultats
- `McpCard` — Card MCP avec nom, description, outil matchant, **stars GitHub**, **use count**, **badge pricing** (freemium/payant)
- `McpCategoryFilters` — Filtres groupés par famille de catégories + filtres par tool
- `McpSortSelect` — Tri (qualité, populaire, alphabétique) en mode browse
- `McpDetailSheet` — Panneau latéral avec description, stats (stars/users/pricing), explication IA, liens, outils
- `McpDeepAnalysis` — Analyse approfondie avec résultats pertinents en cards + explications IA
- Bouton "Explorer les MCP" sur la page d'accueil (2 cards côte à côte : quiz + MCP)
- Traductions FR/EN complètes dans `lib/i18n.ts`

### Phase 5 : Cron de mise à jour
- **Non implémenté** — à faire pour le maintien des données à jour

### Sécurité (100%)
- Toutes les API routes protégées par authentification
- Rate limiting en mémoire sur les routes sensibles
- Limite mensuelle (10/mois) sur l'analyse approfondie
- Logging des coûts IA dans `ai_usage_logs`
- Documentation complète dans `docs/SECURITY.md`

---

## Analyse approfondie (Deep Analysis) — Fonctionnement détaillé

### Vue d'ensemble
L'analyse approfondie est un re-ranking IA optionnel des résultats de recherche. Elle évalue **chaque MCP individuellement** pour déterminer s'il est réellement pertinent par rapport à la query.

### Flux technique
1. L'utilisateur fait une recherche sémantique → reçoit ~30 résultats classés par le scoring hybride
2. Il clique sur "Analyse approfondie" → le frontend envoie les 30 résultats + la query à `/api/mcp/deep-analyze`
3. L'API évalue **chaque MCP en parallèle** (batches de 10) via GPT-4.1 nano
4. Chaque évaluation retourne `{ relevant: true/false, explanation: "..." }`
5. Les MCPs pertinents sont classés en premier (ordre original préservé), les non-pertinents après
6. Le frontend affiche les MCPs pertinents en cards avec l'explication IA en dessous

### Prompt d'évaluation
Chaque MCP est évalué individuellement avec ce prompt :
```
System: Tu évalues si un MCP peut DIRECTEMENT accomplir la query. Reply JSON: {"relevant": true/false, "explanation": "1-2 phrases"}.
Écrire l'explication en [langue de l'utilisateur].

STRICT RULES:
- Si la query mentionne une plateforme spécifique (LinkedIn, Slack, GitHub...), le MCP DOIT cibler cette EXACTE plateforme. Un MCP Instagram n'est PAS pertinent pour une query LinkedIn.
- Le MCP doit directement effectuer l'action demandée sur la plateforme demandée. Une feature similaire sur une autre plateforme ne compte PAS.
```

### Pourquoi 1-par-1 et pas en batch ?
- Envoyer 30 MCPs dans un seul prompt à `gpt-4.1-nano` avec `max_tokens: 2000` → le LLM n'en retourne que ~5 (il saute les autres)
- L'évaluation individuelle garantit que TOUS les MCPs sont analysés
- Coût identique (mêmes tokens au total), fiabilité bien supérieure

### Cache côté client
- Les résultats sont cachés dans `sessionStorage` avec clé `mcp-deep-analysis:{query}`
- TTL : 24h
- Si l'utilisateur re-fait la même recherche → résultats instantanés, pas de crédit consommé

### Rate limiting
- 10 analyses/mois/user (table `deep_analysis_usage`)
- Login requis (retourne `error: 'login_required'` sinon)
- GET `/api/mcp/deep-analyze` → retourne les crédits restants

### UI
- **Avant analyse** : bandeau avec bouton "Analyse approfondie" + crédits restants
- **Après analyse** : MCPs pertinents affichés en cards (même composant `McpCard`) avec une boîte d'explication amber en dessous de chaque card
- **Séparateur** : ligne "Tous les résultats" entre les résultats IA et la liste complète
- **Langue** : l'explication est générée dans la langue de l'interface (FR ou EN) via le paramètre `locale`

---

## Ce qui marche

- Recherche vectorielle hybride (embeddings + keyword matching) — résout le problème des MCPs non-pertinents pour des queries spécifiques à une plateforme
- Analyse approfondie : évaluation 1-par-1 fiable avec strict platform matching
- Cache sessionStorage pour l'analyse approfondie (pas de gaspillage de crédits)
- Filtres par catégorie (groupés par famille) + tri en mode browse
- Persistance de la query dans l'URL (?q=linkedin)
- Dashboard de coûts sur /admin/usage
- Sauvegarde de MCPs favoris
- Affichage stars GitHub + use count + pricing badge sur les cards

## Ce qui ne marche pas / à améliorer

- **Pas de traduction FR→EN des queries** : les queries en français cherchent directement dans les embeddings anglais (cross-lingue). Fonctionne raisonnablement mais ~10-15% de perte de précision.
- **Enrichissement README non fait** : les MCPs avec descriptions pauvres n'ont pas été enrichis via leur README GitHub. Partiellement compensé depuis 2026-04-20 par `search_keywords` généré par LLM.
- **Rate limiting en mémoire** : se réinitialise au redémarrage du serveur et à chaque cold start Vercel (serverless). Suffisant pour le MVP, à remplacer par Upstash Redis pour la prod si le traffic monte.
- **Pricing incomplet** : seulement 107 MCPs ont un pricing vérifié. Les ~4600 restants sont marqués "free" par défaut (confiance low).
- **Re-enrichissement manuel** : pour ré-enrichir les `search_keywords` (nouveaux MCPs ou amélioration du prompt), il faut DELETE les chunks puis re-run `generate-embeddings.ts` — l'UPDATE in-place casse l'index ivfflat sur free tier. Script dédié `reembed-mcp-chunks.ts` doit être évité si possible pour cette raison.

## Phases restantes

| Tâche | Priorité | Statut |
|-------|----------|--------|
| Cron de mise à jour hebdomadaire | Moyenne | A faire |
| Enrichissement README GitHub pour MCPs sans outils | Basse | A faire |
| Traduction FR→EN des queries | Basse | A faire |
| Rate limiting persistant (Redis) | Basse | A faire |
| Pricing vérifié pour plus de MCPs | Basse | En cours (107/4764) |

## Décisions prises

| Décision | Choix | Raison |
|----------|-------|--------|
| Source de données | Smithery.ai API | Seule source avec outils + schemas complets |
| Recherche | Hybride (embeddings + keyword matching) | Les embeddings seuls ignorent les contraintes de plateforme |
| Embedding | Multi-chunk (1 par outil + 1 global) | Évite le "curse of averaging" |
| Modèle embedding | text-embedding-3-small (1536 dims) | Suffisant, quasi-gratuit |
| Modèle explain/analyze | GPT-4.1 nano | Le moins cher pour du tri/résumé |
| Stockage vectoriel | pgvector sur Supabase (plan free) | Déjà dans le stack, gratuit |
| Pondération ranking | 55% cosine + 30% keyword + 10% multi-match + 5% quality | Keyword ratio élevé pour forcer la spécificité plateforme |
| Analyse approfondie | Évaluation 1-par-1 en parallèle (batches de 10) | Le batch unique faisait sauter des MCPs |
| Prompt strict | Platform matching obligatoire | Évite les faux positifs (Instagram pour query LinkedIn) |
| Cache analyse | sessionStorage 24h côté client | Économise les crédits sans complexité serveur |
| Limite analyse | 10/mois/user, login requis | Contrôle des coûts + incitation à créer un compte |
| GitHub stars | Script fetch via API GitHub | Donne un signal de popularité/maturité réel |
| Pricing | Web search + confiance (low/medium/high) | Pas d'API centralisée, honnêteté sur la fiabilité |

## Coûts observés

| Opération | Coût |
|-----------|------|
| Embedding initial (37K chunks, text-embedding-3-small) | ~$0.07 one-shot |
| Enrichissement LLM `search_keywords` (4764 MCPs, gpt-4.1-nano) | ~$0.50 one-shot |
| Recherche (embedding query) | ~$0.00000004 /recherche |
| Explication IA (par MCP ouvert) | ~$0.001 /appel |
| Analyse approfondie (~30 MCPs évalués) | ~$0.003 /analyse |
| GitHub stars fetch (1900 repos) | Gratuit (API GitHub) |
