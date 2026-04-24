# SEO & GEO — claudequiz.app

> Documentation technique de l'optimisation SEO (Search Engine Optimization) et GEO (Generative Engine Optimization) du site.

## Domaine

- **Production** : https://claudequiz.app
- **Configurable** via `NEXT_PUBLIC_SITE_URL` (env var)

---

## SEO — Ce qui est en place

### Metadata racine (`app/layout.tsx`)

> **À quoi ça sert** : Ce sont les informations par défaut que Google et les réseaux sociaux affichent quand ils référencent le site. Le titre, la description et les mots-clés permettent d'apparaître dans les résultats de recherche pertinents. Les balises OG (Open Graph) contrôlent l'aperçu affiché quand quelqu'un partage un lien sur Twitter, Slack, Discord, etc. Le `robots` indique aux moteurs de recherche qu'ils peuvent indexer librement le contenu.

| Champ | Valeur |
|-------|--------|
| Title (default) | `Claude Code Quiz — Learn & Explore` |
| Title (template) | `%s \| Claude Code Quiz` |
| Description | Master Claude Code with interactive quizzes and a semantic MCP search engine. 225+ questions, 4700+ MCPs. |
| Keywords | Claude Code, quiz, MCP, Model Context Protocol, Anthropic, CLI, AI tools, learning |
| OG type | website |
| OG locale | en_US + fr_FR |
| Twitter card | summary_large_image |
| Canonical | `/` (relatif à metadataBase) |
| Robots | index, follow, max-image-preview: large, max-snippet: -1 |
| Viewport | device-width, initial-scale 1, themeColor #0a0a0a |

### Metadata par page

> **À quoi ça sert** : Chaque page a ses propres metadata qui écrasent celles par défaut. Ça permet d'avoir un titre et une description adaptés au contenu spécifique de chaque page. Les pages utilitaires (login, onboarding) sont marquées `noindex` pour ne pas polluer les résultats de recherche avec du contenu non pertinent. Les pages à valeur SEO (quiz, FAQ, MCP search) ont en plus du JSON-LD (données structurées) qui aide Google à comprendre le type de contenu (quiz éducatif, FAQ, application web).

| Page | Title | Indexable | JSON-LD |
|------|-------|-----------|---------|
| `/` | (default) | Oui | WebSite + Organization |
| `/quiz` | Quiz | Oui | Quiz schema |
| `/mcp-search` | MCP Search Engine | Oui | WebApplication schema |
| `/faq` | FAQ — Claude Code Questions & Answers | Oui | FAQPage schema (50 Q&A) |
| `/login` | Sign In | Non (noindex) | — |
| `/onboarding` | Get Started | Non (noindex) | — |
| `/mcp-search/saved` | — | Non (bloqué robots.txt) | — |
| `/admin/*` | — | Non (bloqué robots.txt) | — |

### Fichiers SEO générés

> **À quoi ça sert** : Ces fichiers sont les "points d'entrée techniques" pour les crawlers. Le `sitemap.xml` liste toutes les pages à indexer avec leur priorité — c'est comme un plan du site pour Google. Le `robots.txt` dit aux bots ce qu'ils ont le droit de crawler ou pas. Le `manifest.ts` rend le site installable comme une PWA. L'`opengraph-image` génère dynamiquement l'image d'aperçu quand le lien est partagé. Le `icon.svg` est le favicon affiché dans les onglets du navigateur.

| Fichier | Type | Contenu |
|---------|------|---------|
| `app/sitemap.ts` | Statique | `/`, `/quiz`, `/mcp-search`, `/faq` avec lastmod + priority |
| `app/robots.ts` | Statique | Directives par user-agent (voir section GEO) |
| `app/manifest.ts` | Statique | Web App Manifest (PWA-ready) |
| `app/opengraph-image.tsx` | Dynamique (Edge) | Image 1200x630 avec titre + stats |
| `app/icon.svg` | Statique | Favicon "Q" blanc sur cercle noir (optimisé 16 px pour Google) |
| `app/favicon.ico` | Statique | Favicon multi-résolutions 16/32/48/64 px — régénéré depuis le SVG via `scripts/gen-favicon.mjs` |
| `public/4bbf557176d232ce91df947ea95cfbe9.txt` | Statique | Clé de vérification IndexNow (utilisée par `lib/indexnow.ts` pour pinger Bing/Yandex) |

### Structured Data (JSON-LD)

> **À quoi ça sert** : Le JSON-LD est un format de données structurées intégré dans le HTML. Il permet à Google de comprendre exactement ce qu'est le contenu (pas juste du texte, mais "c'est un quiz éducatif", "c'est une FAQ", "c'est une application web"). En retour, Google peut afficher des résultats enrichis (rich snippets) : étoiles, FAQ dépliables, infos d'application, etc. Ça augmente le taux de clic dans les résultats de recherche. Le `SearchAction` permet aussi d'afficher un champ de recherche directement dans Google.

**Root layout** — `@graph` avec :
- `WebSite` : name, url, description, inLanguage [en, fr], SearchAction vers `/mcp-search?q=`
- `Organization` : name, url, logo, sameAs (GitHub)

**`/quiz`** :
- `Quiz` : name, about (Claude Code), educationalLevel, provider

**`/mcp-search`** :
- `WebApplication` : name, applicationCategory (DeveloperApplication), operatingSystem (Web)

**`/faq`** :
- `FAQPage` : 50 questions avec Question + acceptedAnswer (réponse correcte + explication)

### Proxy / Routes publiques

> **À quoi ça sert** : Le site a une authentification (login Supabase), mais les crawlers ne peuvent pas se connecter. Le proxy définit donc une liste de routes accessibles sans authentification. Sans ça, Google et les bots IA recevraient une redirection vers `/login` au lieu du contenu — et le site serait invisible pour les moteurs de recherche. C'est la "porte d'entrée" qui permet au SEO de fonctionner sur un site protégé.

Le proxy (`proxy.ts`) laisse passer sans auth :
- `/`, `/login`, `/auth/callback`, `/faq`
- `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, `/opengraph-image*`
- Tout `/api/*`

---

## GEO — Generative Engine Optimization

> **Qu'est-ce que le GEO** : Le GEO est l'équivalent du SEO mais pour les IA génératives (ChatGPT, Claude, Perplexity, Gemini). Quand un utilisateur pose une question à une IA ("quel raccourci pour X dans Claude Code ?"), l'IA peut citer notre site si elle l'a crawlé et trouvé la réponse. Le GEO optimise le site pour être trouvé, compris et cité par ces IA.

### Crawlers IA autorisés (`robots.ts`)

Chaque crawler IA a sa propre règle `User-Agent` avec `Allow: /` :

| Bot | Source |
|-----|--------|
| `GPTBot` | OpenAI (ChatGPT, recherche web) |
| `ChatGPT-User` | ChatGPT navigation utilisateur |
| `ClaudeBot` | Anthropic (Claude) |
| `Claude-Web` | Claude recherche web |
| `PerplexityBot` | Perplexity AI |
| `Applebot-Extended` | Apple Intelligence |
| `Google-Extended` | Google AI (Gemini, AI Overviews) |
| `cohere-ai` | Cohere |

Tous ont accès à tout sauf `/login`, `/onboarding`, `/admin/`, `/api/`, `/auth/`.

> **À quoi ça sert** : Par défaut, `robots.txt` ne distingue pas les crawlers traditionnels (Googlebot) des crawlers IA. En ajoutant explicitement chaque bot IA avec `Allow: /`, on s'assure qu'ils ont bien le droit de lire le contenu. Certains sites bloquent ces bots — nous on fait l'inverse : on les accueille volontairement pour maximiser les chances d'être cité dans les réponses générées par ces IA.

### Page FAQ statique (`/faq`)

La FAQ ne tire **plus** les questions directement de la base de données. Elle est entièrement statique (contenu hardcodé) avec 3 sections distinctes :

1. **Claude Code & MCP** (12 questions) — Contenu éducatif général sur Claude Code et le protocole MCP. Questions factuelles type "Qu'est-ce que le MCP ?", "Combien de serveurs MCP existent ?", "Qu'est-ce qu'un outil MCP ?". Pas de spoiler du quiz.

2. **Le site & le moteur de recherche MCP** (7 questions) — Explication du fonctionnement du quiz, du moteur de recherche sémantique MCP et de ses différences avec les annuaires classiques. Couvre les deux features du site de façon équilibrée.

3. **Exemples de questions du quiz** (20 questions sur 225+) — Sélection représentative groupée par catégorie (raccourcis, commandes, concepts, MCP, workflows). Montre la réponse + explication pour ces 20 questions seulement — assez pour le SEO/GEO sans spoiler l'ensemble du quiz.

**Caractéristiques techniques** :
- **Server Component statique** = HTML complet, aucune requête DB, aucun JavaScript nécessaire
- **Schema FAQPage** = les 39 questions en structured data JSON-LD
- **Accessible sans authentification** = crawlable par tous les bots
- **Heading hierarchy** : h1 (FAQ) > h2 (sections) > h3/h4 (questions)
- **CTA internes** : liens vers `/quiz` et `/mcp-search` pour le maillage interne

C'est la cible principale pour les citations IA. Quand quelqu'un demande "What is the shortcut for X in Claude Code?" ou "How to find MCP servers?", les bots trouvent la réponse directement sur cette page.

> **À quoi ça sert** : La FAQ est le "piège à citations" du site. Les IA génératives cherchent du contenu factuel, bien structuré et directement accessible. Une page statique (HTML complet sans JS) avec des questions/réponses claires est le format idéal pour être extrait et cité. Le schema FAQPage en JSON-LD aide Google à afficher ces Q&A en résultat enrichi. Le contenu statique (pas de requête DB) rend la page ultra-rapide et évite de dépendre de Supabase pour le SEO. C'est la page la plus importante pour le GEO.

### Signaux d'autorité

- `max-snippet: -1` = Google peut extraire des snippets illimités
- `max-image-preview: large` = aperçus d'images en taille réelle
- Liens sortants vers les docs officielles Anthropic (dans les explications de quiz)
- `sameAs` vers le repo GitHub dans le schema Organization
- Contenu bilingue (en/fr) signalé via `inLanguage` et `alternateLocale`

> **À quoi ça sert** : Les moteurs de recherche et les IA évaluent la crédibilité d'un site avant de le citer. Ces signaux renforcent l'autorité : les snippets illimités permettent à Google d'extraire de longs passages (au lieu de tronquer), les liens vers les docs officielles Anthropic montrent qu'on référence des sources fiables, le `sameAs` GitHub prouve que le projet est ouvert et vérifiable, et le contenu multilingue élargit l'audience potentielle.

### Contenu optimisé pour la citation

- Chaque question FAQ commence par la question (heading h3/h4)
- La réponse est en premier (en vert), suivie de l'explication
- Format citation-friendly : `Réponse — Explication`
- Pas de contenu caché derrière des modals/accordéons sur la page FAQ
- Statistiques concrètes dans les metadata : "225+ questions, 4700+ MCPs"
- Seulement 20 questions quiz sur 225+ = pas de spoiler complet

> **À quoi ça sert** : C'est le formatage du contenu pour qu'il soit le plus "extractible" possible par les IA. Les IA génératives ne lisent pas une page comme un humain — elles cherchent des patterns clairs : question → réponse → explication. En mettant la réponse correcte en premier, sans contenu caché (pas d'accordéons à cliquer), avec des chiffres concrets, on maximise les chances que l'IA extraie et cite notre contenu mot pour mot dans sa réponse.

### Footer global (`components/Footer.tsx`)

Footer ajouté dans le root layout (`app/layout.tsx`), visible sur toutes les pages :

| Colonne | Contenu |
|---------|---------|
| Produit | Quiz, Recherche MCP, FAQ |
| Ressources | Docs Claude Code (Anthropic), MCP Protocol, GitHub Claude Code |
| Claude Quiz | Description courte + stats |

En bas : copyright + mention "Non affilié à Anthropic".

> **À quoi ça sert** : Le footer contribue au SEO de plusieurs façons. D'abord le maillage interne : chaque page du site contient maintenant des liens vers `/quiz`, `/mcp-search` et `/faq`, ce qui renforce leur "jus de liens" aux yeux de Google. Ensuite les liens sortants vers les docs officielles (Anthropic, MCP Protocol) signalent la pertinence thématique. Enfin, les crawlers IA parcourent les liens du footer pour découvrir toutes les pages du site — c'est un filet de sécurité si le sitemap ne suffit pas.

---

## Mesure & outils

> **Qu'est-ce qu'on observe** : Sans mesure, aucune optimisation SEO/GEO n'est pilotable. Cette section liste les outils configurés pour observer l'audience, le référencement et les citations IA.

### Google Search Console (GSC)

Propriété vérifiée : **Domaine** `claudequiz.app` (TXT DNS via Vercel). Sitemap soumis : `https://claudequiz.app/sitemap.xml`.

Ce qu'on regarde :
- **Performance** — requêtes, impressions, clics, CTR, position moyenne
- **Pages** — statut d'indexation de chaque URL
- **Enhancements** — validité FAQ rich results, mobile-friendly
- **Core Web Vitals** — LCP, INP, CLS

### Bing Webmaster Tools

Propriété importée depuis GSC (vérification partagée). Sitemap soumis. Fonctionnalités utiles :
- **AI Performance** (BETA) — citations dans Microsoft Copilot (équivalent de nos rapports GEO pour l'écosystème Microsoft)
- **Site Scan** — audit technique on-demand

### Google Analytics 4 (GA4)

Propriété `Claude Quiz` — Measurement ID `G-CNXDPC84V5`. Intégration via `@next/third-parties` avec **Google Consent Mode v2** :
- Par défaut `denied` (conforme RGPD)
- Bannière `components/ConsentBanner.tsx` permet d'accepter ou refuser
- Choix mémorisé via `localStorage` (clé `claude-quiz-analytics-consent`)

Events custom disponibles dans `lib/analytics.ts` :
- `quiz_completed` (correct, total, duration_sec)
- `mcp_search` (query, results_count)
- `mcp_explain` (mcp_name)
- `faq_question_opened` (question)

### Association GSC ↔ GA4

Liée via Admin → Product links dans GA4. Permet de voir dans GA4 les rapports **Search Console** (requêtes Google organiques, landing pages). Données disponibles 24-48h après l'association.

### IndexNow (Bing / Yandex / DuckDuckGo)

Ping instantané aux moteurs de recherche à chaque nouvelle question ajoutée (cron hebdomadaire). Implémentation :
- `public/4bbf557176d232ce91df947ea95cfbe9.txt` — fichier de vérification
- `lib/indexnow.ts` — helper `pingIndexNow(urls)`
- Appelé depuis `app/api/questions/generate/route.ts` après `INSERT` réussi (ping `/` et `/faq`)

> **À quoi ça sert** : Sans IndexNow, Bing peut mettre plusieurs jours à re-crawler. Avec IndexNow, le ping est instantané — la nouvelle question est découvrable par Copilot dès l'insertion.

---

## Améliorations futures

### Court terme
- [ ] Créer des pages piliers `/learn/claude-code` et `/learn/mcp` (topical authority)
- [ ] Ajouter `dateModified` dynamique dans les metadata (basé sur la dernière question ajoutée)
- [ ] Créer un flux RSS `/feed.xml` pour les nouvelles questions
- [ ] Ajouter un glossaire `/glossary` (termes MCP, tool use, agentic coding, etc.)

### Moyen terme
- [ ] Pages de comparaison : "Claude Code vs Cursor", "Claude Code vs Aider"
- [ ] OG images dynamiques par page (`/quiz/opengraph-image.tsx`, `/mcp-search/opengraph-image.tsx`)
- [ ] Entrée Wikidata pour Claude Quiz
- [ ] Profils sociaux cohérents (Twitter, Product Hunt, dev.to) avec `sameAs`

### Long terme
- [ ] Articles "What's new in Claude Code" à chaque release Anthropic
- [ ] Pages individuelles par MCP populaire (`/mcp/[slug]`) = plus de surface crawlable
- [ ] Monitoring des citations IA (Perplexity, ChatGPT) via recherches manuelles

---

## Vérification

```bash
# Tester le robots.txt
curl https://claudequiz.app/robots.txt

# Tester le sitemap
curl https://claudequiz.app/sitemap.xml

# Tester l'OG image
curl -I https://claudequiz.app/opengraph-image

# Tester la FAQ (doit retourner du HTML complet)
curl -s https://claudequiz.app/faq | head -50

# Valider le structured data
# → https://search.google.com/test/rich-results?url=https://claudequiz.app
# → https://search.google.com/test/rich-results?url=https://claudequiz.app/faq
```
