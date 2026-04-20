# Scraping de Smithery — Analyse juridique

> Date : 2026-04-20
> Question de départ : a-t-on le droit de scraper les données de Smithery pour alimenter notre moteur de recherche MCP ?

## TL;DR

**Smithery ne publie pas de Terms of Service.** Pour l'usage actuel (site éducatif, pré-commercial, avec attribution visible), **le risque juridique est faible à nul**. Pour une exploitation commerciale future, prévoir un contact formel avec eux.

---

## Ce qu'on a vérifié

### 1. Footer du site smithery.ai

Dans le footer, on trouve :

| Section | Liens |
|---------|-------|
| **Resources** | Documentation, Privacy Policy, System Status |
| **Company** | Pricing, About, Blog |
| **Connect** | X, GitHub, Discord |

Aucun lien vers "Terms", "Terms of Service", "User Agreement", "Acceptable Use" ou équivalent.
Mention en bas de page : `© 2026 Smithery. All rights reserved.`

### 2. robots.txt (`smithery.ai/robots.txt`)

```
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /_next/
Disallow: /admin/
Disallow: /settings/
Disallow: /deploy/

Sitemap: https://smithery.ai/sitemap_index.xml
```

- `/api/` (routes internes du site web) est **disallow**
- MAIS notre script utilise `registry.smithery.ai/servers` — **subdomain distinct**, qui renvoie 404 sur `/robots.txt` (aucune restriction crawler déclarée)
- Toutes les pages publiques `/servers/*` sont explicitement autorisées au crawling

### 3. Headers HTTP de l'API (`registry.smithery.ai/servers`)

```
HTTP/2 200
access-control-allow-origin: *
cache-control: public, max-age=60, s-maxage=3600, stale-while-revalidate=86400
content-type: application/json
deprecation: Inline filters in q param... are deprecated. Use explicit query params instead
```

Signaux techniques décisifs :
- **CORS ouvert à tous** (`allow-origin: *`) → l'API est conçue pour être appelée depuis n'importe quel navigateur, domaine ou client
- **Cache public CDN** (`public, max-age=60, s-maxage=3600`) → la donnée est destinée à être redistribuée via CDN public, signal fort d'usage distribuable
- **Aucune authentification requise** — pas d'API key, pas de token
- **Aucun rate-limit visible** dans les headers
- **Header `deprecation`** s'adresse à des consommateurs externes — preuve qu'ils maintiennent une API stable pour des tiers

### 4. Privacy Notice (`smithery.ai/privacy`)

Document récupéré manuellement (non accessible via curl car client-side rendering).

**C'est un Privacy Notice, pas des Terms of Service** — il couvre la gestion des données personnelles des utilisateurs de Smithery, pas ce qu'on a le droit de faire sur leur plateforme.

Un seul passage est pertinent pour notre question :

> "Data that is not subject to applicable data protection laws (such as **deidentified or publicly available information**) is not subject to this Privacy Notice."

→ Smithery reconnaît explicitement que l'information publique (métadonnées des MCPs) n'est pas soumise aux protections de données personnelles. Signal positif mais faible.

### 5. Écosystème Smithery (GitHub `smithery-ai`)

- **SDK officiel** publié en open-source → encourage explicitement l'usage programmatique
- **CLI** sous AGPL-3.0, 682 ⭐
- **SDK** sous licence permissive
- Tutos publics tiers (ex: ScrapingBee blog "Scraping Smithery MCP database") existent **sans objection** de Smithery
- Tagline du site : **"Accelerating the Agent Economy"** → construire un écosystème d'agents qui consomment leurs données est dans leur mission

---

## Analyse juridique

### Sans ToS = pas de contrat tacite

En droit, tu ne peux pas violer un contrat qui n'existe pas. Sans "By accessing this API, you agree to…", il n'y a aucun engagement contractuel entre l'utilisateur de l'API et Smithery. On tombe alors sur le droit commun :

1. **Copyright** (© 2026 Smithery) — s'applique, mais :
   - Les **faits** (le MCP X expose l'outil Y) ne sont pas copyrightables (principe de la *factual content non-protectibility* en droit US)
   - La **curation** (choix de quels MCPs lister, score, taxonomie) peut l'être
   - Les **descriptions des MCPs** appartiennent aux auteurs des MCPs, pas à Smithery
   - L'icône custom de Smithery leur appartient

2. **Computer Fraud and Abuse Act (CFAA, US)** — jurisprudence **hiQ Labs v. LinkedIn (2022)** : scraper des données publiques d'une API publique sans protection n'est PAS un accès non-autorisé.

3. **Directive européenne Sui Generis Database Right** — peut s'appliquer si la base représente un "investissement substantiel" dans la collecte/vérification. Smithery a clairement investi dans la curation. Mais cela protège contre l'**extraction substantielle répétée**, pas contre la consommation normale d'une API publique.

4. **Responsabilité délictuelle / concurrence déloyale** — si notre site présentait le contenu comme étant de Smithery, ou concurrençait directement Smithery commercialement, ça deviendrait litigieux. Ce n'est pas le cas.

---

## Décisions prises pour le projet

### Usage actuel (pré-commercial, éducatif) — VALIDÉ

✅ Scraping de l'API `registry.smithery.ai/servers` avec délai raisonnable entre requêtes (voir `scripts/mcp/scrape-smithery.ts`)
✅ Stockage local des métadonnées dans Supabase
✅ Génération d'embeddings propres (OpenAI `text-embedding-3-small`) pour la recherche sémantique
✅ **Attribution visible** : chaque carte MCP a un bouton "Site" qui pointe vers `smithery.ai/servers/xxx`
✅ Le projet est présenté comme un **moteur de recherche au-dessus du catalogue**, pas comme "le catalogue Smithery"

### Règles à respecter

1. **Garder l'attribution Smithery** (lien `source_url`) visible sur chaque carte MCP
2. **Respecter le rythme de scraping** déjà en place (`DELAY_MS` dans `scrape-smithery.ts`)
3. **Ne pas réutiliser les icônes Smithery** en dehors du contexte d'affichage d'un MCP (pas de logo Smithery sur du merchandising, etc.)
4. **Ne pas prétendre être Smithery** ni affilié officiellement

### Si le projet devenait commercial ou public massivement

Actions à faire **avant** de lancer :

1. **Re-vérifier** que Smithery n'a toujours pas publié de Terms of Service (revérifier leur footer)
2. **Envoyer un email** à `contact@smithery.ai` (adresse publiée dans leur Privacy Notice) expliquant :
   - Le projet (moteur de recherche sémantique au-dessus de leur catalogue)
   - Le volume de requêtes API prévu
   - La demande d'officialisation du partenariat ou d'une API key dédiée
3. **Obtenir leur accord écrit** (idéalement une API key ou une confirmation par email)
4. **Ajouter un disclaimer** sur le site : "Powered by data from [Smithery.ai](https://smithery.ai)"

---

## Scénarios de risque

| Scénario | Probabilité | Conséquence |
|----------|-------------|-------------|
| Smithery bloque notre IP de scraping | Moyenne | Besoin de rotate IP ou de passer par leur CLI officielle |
| Smithery publie des ToS restrictives rétroactivement | Faible | Les données déjà scrapées resteraient légales ; stopper le futur scraping |
| Smithery nous contacte pour nous demander de stopper | Faible | Obtempérer ; négocier un partenariat si possible |
| Smithery porte plainte | Très faible | La jurisprudence hiQ v. LinkedIn + l'absence de ToS rendent ce scénario extrêmement improbable pour un usage non-commercial |

---

## Contact Smithery (pour référence)

- **Email général** : contact@smithery.ai (publié dans leur Privacy Notice)
- **GitHub** : https://github.com/smithery-ai
- **X (Twitter)** : @SmitheryDotAI
- **Discord** : lien dans le footer de smithery.ai

## Liens utiles

- `robots.txt` : https://smithery.ai/robots.txt
- API publique : https://registry.smithery.ai/servers
- Privacy Notice : https://smithery.ai/privacy
- Sitemap : https://smithery.ai/sitemap_index.xml
- Documentation registry : https://smithery.ai/docs/use/registry
