# MCP Search — Refonte des catégories

> Date : 2026-04-19

## Problèmes identifiés

### 1. Les filtres ne fonctionnaient pas

La page `/mcp-search` affichait des catégories dans la sidebar, mais cliquer dessus sans avoir fait de recherche ne faisait rien. Le code ne déclenchait un filtrage que si une recherche textuelle avait déjà été lancée (`searched && lastQuery` dans `useEffect`). Résultat : cliquer sur "All" ou une catégorie sans query = aucun MCP affiché.

### 2. Les catégories étaient inutiles

L'ancien système utilisait un matching par mots-clés trop agressif (fichier `scripts/mcp/scrape-smithery.ts`, fonction `inferCategories`). Chaque MCP recevait **5 à 12 catégories** en moyenne.

Exemples du problème :
- **"ai"** matchait 2607/4764 MCPs (55%) → inutile comme filtre
- **Slack** avait 12 catégories : database, code, communication, file-system, ai, web, productivity, data, search, media, security, monitoring
- **Instagram** avait la catégorie "file-system" et "monitoring"
- Les mots-clés génériques comme "data", "search", "ai" matchaient presque tout

### 3. Les catégories n'étaient pas orientées use case

Les 15 catégories existantes (ai, search, data, web, monitoring, security, code, file-system, database, media, productivity, communication, finance, devops) étaient orientées technologie, pas usage. Un utilisateur qui cherche "un MCP pour mon workflow marketing" ne sait pas s'il doit cliquer sur "communication", "web", ou "data".

---

## Solution implémentée

### Nouvelle taxonomie par use case

**17 catégories** organisées en **4 groupes** :

| Groupe | Catégorie | Label FR | Description |
|--------|-----------|----------|-------------|
| **Engineering** | `dev-tools` | Outils dev | Git, CI/CD, code review, npm, tests |
| | `databases` | Bases de données | SQL, NoSQL, Supabase, warehouses |
| | `cloud-infra` | Cloud & Infra | AWS, Docker, K8s, monitoring |
| | `security` | Sécurité | Auth, OAuth, encryption, scanning |
| **Go-to-Market** | `email` | Email | Gmail, Outlook, SendGrid |
| | `social-media` | Réseaux sociaux | Instagram, Twitter, YouTube, Reddit |
| | `communication` | Chat & Messagerie | Slack, Discord, Telegram |
| | `content` | Contenu & CMS | WordPress, CMS, SEO, marketing, RSS |
| | `commerce` | E-commerce | Shopify, Stripe, booking, travel |
| **Product** | `productivity` | Productivité | Jira, Notion, calendrier, gestion de projet |
| | `analytics` | Analytics & Data | Google Sheets, charts, datasets, stats |
| | `design` | Design & Médias | Figma, images, vidéo, audio, PDF |
| | `knowledge` | Savoirs & Recherche | ArXiv, docs officielles, droit, éducation |
| **General** | `web-search` | Recherche web | Brave, Tavily, scraping, crawling |
| | `file-storage` | Fichiers & Stockage | Google Drive, S3, filesystem |
| | `finance` | Finance & Crypto | Blockchain, trading, comptabilité |
| | `other` | Autre | Tout le reste (weather, jeux, utilitaires…) |

### Principe : 1 catégorie par MCP

Chaque MCP reçoit **exactement une catégorie primaire** (la plus spécifique), au lieu de 5-12 catégories vagues. Cela rend chaque filtre significatif.

### Distribution résultante (sur 1000 MCPs actifs)

```
Engineering (156)
  dev-tools        50
  databases        23
  cloud-infra      40
  security         43

Go-to-Market (250)
  email            13
  social-media     37
  communication    20
  content          80
  commerce        100

Product (221)
  productivity     31
  analytics        53
  design           40
  knowledge        97

General (373)
  web-search       24
  file-storage     18
  finance          91
  other           240
```

---

## Fichiers créés / modifiés

### Nouveaux fichiers

| Fichier | Rôle |
|---------|------|
| `lib/mcp-categories.ts` | Définition de la taxonomie (groupes, catégories, mots-clés), fonction `inferPrimaryCategory()` |
| `scripts/mcp/recategorize.ts` | Script pour re-catégoriser tous les MCPs existants en base |
| `app/api/mcp/browse/route.ts` | Nouvelle API GET pour parcourir les MCPs par catégorie sans recherche |
| `docs/mcp-search/CATEGORY-REFACTOR.md` | Ce document |

### Fichiers modifiés

| Fichier | Changement |
|---------|------------|
| `components/mcp/McpCategoryFilters.tsx` | Refonte complète : catégories groupées avec headers, sélection unique (au lieu de multi-select) |
| `app/api/mcp/categories/route.ts` | Retourne les catégories groupées avec labels FR/EN au lieu d'une liste plate |
| `app/mcp-search/page.tsx` | **À faire** : adapter au nouveau format (groups au lieu de categories, browse mode) |

---

## Détails techniques

### `lib/mcp-categories.ts` — Logique de catégorisation

La fonction `inferPrimaryCategory()` attribue **une seule catégorie** via un scoring pondéré :
- Match dans le **nom** du MCP : **×3**
- Match dans la **description** : **×2**
- Match dans les **noms/descriptions d'outils** : **×1**

Chaque catégorie peut avoir des `antiKeywords` qui excluent un MCP même si les keywords matchent (ex: "prediction market" exclut de "dev-tools").

La catégorie avec le meilleur score gagne. Si aucun score > 0, le MCP tombe dans "other".

### `app/api/mcp/browse/route.ts` — Browse sans recherche

```
GET /api/mcp/browse?category=email&limit=30&offset=0
```

Retourne les MCPs d'une catégorie triés par `quality_score` descending. Ne nécessite pas d'embedding ni de query textuelle. C'est ce qui permet de cliquer sur un filtre et voir immédiatement des résultats.

### `app/api/mcp/categories/route.ts` — Format de réponse

Avant (liste plate) :
```json
{ "categories": [{ "category": "ai", "count": 899 }, ...], "total": 1000 }
```

Après (groupé avec labels i18n) :
```json
{
  "groups": [
    {
      "id": "engineering",
      "label": "Engineering",
      "labelFr": "Engineering",
      "categories": [
        { "id": "dev-tools", "label": "Dev Tools", "labelFr": "Outils dev", "count": 50 },
        ...
      ]
    },
    ...
  ],
  "total": 1000
}
```

### `components/mcp/McpCategoryFilters.tsx` — Changements UI

- **Avant** : liste plate de boutons, multi-sélection (array de strings)
- **Après** : catégories groupées sous des headers (Engineering, Go-to-Market, Product, General), sélection unique (une seule catégorie active à la fois)
- Props changées : `categories: CategoryCount[]` → `groups: CategoryGroup[]`, `selected: string[]` → `selected: string | null`

---

## Ce qui reste à faire

1. **Adapter `app/mcp-search/page.tsx`** au nouveau format :
   - Charger les `groups` au lieu des `categories` depuis l'API
   - Gérer la sélection unique (`selectedCategory: string | null`)
   - Quand une catégorie est sélectionnée sans query : appeler `/api/mcp/browse?category=X`
   - Quand une catégorie est sélectionnée avec query : appeler `/api/mcp/search` avec le filtre
2. **Mettre à jour `scripts/mcp/scrape-smithery.ts`** pour utiliser `inferPrimaryCategory` au lieu de l'ancien `inferCategories`
3. **Tester le build** (`npm run build`)

---

## Comment re-catégoriser

```bash
npx tsx scripts/mcp/recategorize.ts
```

Ce script :
1. Charge tous les MCPs actifs + leurs outils depuis Supabase
2. Applique `inferPrimaryCategory()` à chacun
3. Met à jour la colonne `categories` (array avec 1 seul élément)
4. Affiche la distribution avant de sauvegarder
