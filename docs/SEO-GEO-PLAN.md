# Plan d'action SEO/GEO — claudequiz.app

> Plan d'exécution pour la prochaine session. L'état actuel (ce qui est déjà en place) est documenté dans [`SEO-GEO.md`](./SEO-GEO.md).
> **Point de départ** : aucun outil de mesure installé. On ne sait donc pas aujourd'hui combien de visiteurs arrivent, sur quelles requêtes, ni si Google indexe bien le site.

---

## Objectifs

1. **Mesurer** ce qui se passe (sans ça, on optimise à l'aveugle)
2. **Vérifier** que tout ce qui est déjà codé fonctionne réellement en production
3. **Améliorer** sur la base des données réelles (pas des paris)

---

## Phase 1 — Installation des outils de mesure

> **Durée estimée** : 30–45 min
> **Prérequis** : accès au domaine `claudequiz.app` (DNS via Vercel), compte Google

### 1.1 Google Search Console (GSC) — priorité absolue

**À quoi ça sert** : voir les requêtes sur lesquelles le site apparaît dans Google, les impressions, clics, positions moyennes, pages indexées/non-indexées, erreurs de crawl, Core Web Vitals, rich results valides.

**Étapes** :
1. Aller sur https://search.google.com/search-console
2. Ajouter une propriété → choisir **"Domaine"** (pas URL-prefix) → entrer `claudequiz.app`
3. Google donne un enregistrement **TXT DNS** à ajouter
4. Ajouter le TXT dans Vercel :
   - Dashboard Vercel → Domains → claudequiz.app → DNS Records → Add TXT
   - Host: `@`, Value: la valeur donnée par Google
5. Retourner sur GSC → "Verify"
6. Soumettre le sitemap : Sitemaps → `https://claudequiz.app/sitemap.xml`

**Livrables** :
- [ ] Propriété GSC vérifiée
- [ ] Sitemap soumis
- [ ] Screenshot du statut "Success"

**Ce qu'on regardera ensuite (après 7–14 jours de data)** :
- Onglet **Performance** : top queries, top pages, pays, devices
- Onglet **Pages** : Indexed vs Not indexed + raisons
- Onglet **Enhancements** : FAQ rich results, sitelinks searchbox

---

### 1.2 Google Analytics 4 (GA4)

**À quoi ça sert** : trafic réel, sources (direct / organique / social / referral), comportement (pages vues, durée, scroll, taux de rebond), conversions si on définit des events.

**Étapes** :
1. Créer une propriété GA4 sur https://analytics.google.com
2. Récupérer le `G-XXXXXXXXXX` (Measurement ID)
3. Ajouter via le composant officiel Next.js `@next/third-parties/google` :
   ```bash
   npm install @next/third-parties
   ```
4. Dans `app/layout.tsx`, importer et insérer :
   ```tsx
   import { GoogleAnalytics } from '@next/third-parties/google';
   // ...
   <body>
     {children}
     <GoogleAnalytics gaId="G-XXXXXXXXXX" />
   </body>
   ```
5. Stocker l'ID dans `NEXT_PUBLIC_GA_ID` (env var Vercel)
6. Déployer → vérifier via `chrome://net-internals` ou GA4 Realtime

**Décisions à prendre** :
- **Consent Mode v2** : obligatoire pour les utilisateurs UE (RGPD). À implémenter avant de mettre en prod ou bannière de consentement cookies ? → **à trancher demain**
- Events à tracker : `quiz_completed`, `mcp_search`, `mcp_deep_analyze`, `faq_question_clicked` ?

**Livrables** :
- [ ] Propriété GA4 créée
- [ ] `NEXT_PUBLIC_GA_ID` ajoutée aux env vars Vercel
- [ ] Script intégré dans le layout
- [ ] Déploiement vérifié (Realtime affiche des visites)
- [ ] Décision RGPD prise

---

### 1.3 Bing Webmaster Tools

**Pourquoi** : Copilot (Microsoft), DuckDuckGo, Yahoo et plusieurs IA s'appuient sur l'index Bing. Environ 5–10% du trafic search hors Google. Gratuit.

**Étapes** :
1. https://www.bing.com/webmasters → sign in (compte Microsoft)
2. Option 1 : **Importer depuis GSC** (si GSC déjà configuré, 1 clic)
3. Option 2 : ajouter manuellement avec DNS TXT (même process que GSC)
4. Soumettre le sitemap

**Livrables** :
- [ ] Propriété Bing vérifiée
- [ ] Sitemap soumis

---

### 1.4 IndexNow (bonus, 5 min)

**Pourquoi** : protocole utilisé par Bing + Yandex pour être notifié **instantanément** quand une page change (au lieu d'attendre le prochain crawl). Utile pour les nouvelles questions de quiz générées chaque semaine.

**Étapes** :
1. Générer une clé : `openssl rand -hex 16`
2. Créer `public/<cle>.txt` contenant la clé
3. Ajouter une route API `/api/indexnow` qui ping l'endpoint IndexNow quand une question est ajoutée (hook dans le cron hebdomadaire)

**Livrables** :
- [ ] Clé générée et servie
- [ ] Intégrée dans le cron `/api/questions/generate`

---

## Phase 2 — Audit de l'existant en production

> **Durée estimée** : 20 min
> Vérifier que tout ce qui est décrit dans `SEO-GEO.md` fonctionne réellement sur le site déployé.

### 2.1 Checks techniques automatisables

À lancer depuis le terminal :

```bash
# robots.txt accessible et valide
curl -I https://claudequiz.app/robots.txt
curl -s https://claudequiz.app/robots.txt | head -30

# Sitemap valide et à jour
curl -s https://claudequiz.app/sitemap.xml

# OG image rend
curl -I https://claudequiz.app/opengraph-image

# FAQ retourne du HTML complet (pas de JS requis)
curl -s https://claudequiz.app/faq | grep -c "FAQ"

# Icon et favicon
curl -I https://claudequiz.app/icon.svg
curl -I https://claudequiz.app/favicon.ico

# Manifest
curl -s https://claudequiz.app/manifest.webmanifest
```

### 2.2 Checks Google officiels

- **Rich Results Test** → https://search.google.com/test/rich-results
  - Tester : `/`, `/quiz`, `/mcp-search`, `/faq`
  - Vérifier : WebSite, Quiz, WebApplication, FAQPage
- **PageSpeed Insights** → https://pagespeed.web.dev/
  - Tester : `/`, `/quiz`, `/mcp-search`, `/faq`
  - Cible : CWV verts sur mobile (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- **Mobile-Friendly Test** (via GSC → URL Inspection)

### 2.3 Checks OG (aperçus sociaux)

- **LinkedIn Post Inspector** → https://www.linkedin.com/post-inspector/
- **Twitter/X Card Validator** → https://cards-dev.twitter.com/validator (déprécié, utiliser `curl` avec User-Agent Twitterbot)
- **Facebook Debugger** → https://developers.facebook.com/tools/debug/

### 2.4 Checks GEO (IA)

Tester manuellement si les grandes IA citent le site sur des requêtes cibles :

| Requête test | ChatGPT | Claude | Perplexity | Gemini |
|---|---|---|---|---|
| "What is the shortcut for X in Claude Code?" | ☐ | ☐ | ☐ | ☐ |
| "How to find MCP servers?" | ☐ | ☐ | ☐ | ☐ |
| "Best Claude Code quiz" | ☐ | ☐ | ☐ | ☐ |
| "Claude Code FAQ" | ☐ | ☐ | ☐ | ☐ |

**Livrables Phase 2** :
- [ ] Rapport d'audit (OK / à corriger) consigné dans un fichier `docs/SEO-GEO-AUDIT-YYYY-MM-DD.md`
- [ ] Bugs trouvés corrigés immédiatement si triviaux
- [ ] Bugs non-triviaux listés comme tâches

**Audit du 2026-04-24** — résultats clés :
- ✅ robots.txt correct (8 bots IA explicites + `*`)
- ✅ sitemap.xml : 4 URLs
- ✅ `/` et `/faq` : indexables, JSON-LD OK (FAQPage 39 questions)
- ✅ OG image, favicon, manifest : OK
- ⚠️ `lang="en"` sur le HTML alors que l'UI est en français (à décider : garder EN pour ciblage international ou passer FR ?)
- 🚨 **`/quiz` et `/mcp-search` retournent 307 → `/login`** pour les bots → pas indexées → voir Phase 3.2

---

## Phase 3 — Améliorations (à prioriser APRÈS Phase 1 + 2)

> Ne pas commencer avant d'avoir au moins **7 jours de données GSC** pour savoir ce qui marche/manque.

### 3.1 Quick wins (< 1h chacun)

- [ ] **Mettre à jour `SEO-GEO.md` ligne 56** : le favicon n'est plus "Q violet dégradé" mais "Q blanc sur cercle noir"
- [ ] **`dateModified` dynamique** dans les metadata : basé sur la dernière question ajoutée en DB (améliore la fraîcheur perçue)
- [ ] **OG images dynamiques par page** : `/quiz/opengraph-image.tsx`, `/mcp-search/opengraph-image.tsx`, `/faq/opengraph-image.tsx` (actuellement tout partage la même image)
- [ ] **Flux RSS `/feed.xml`** : liste des nouvelles questions (source d'autorité pour les IA, signal de fraîcheur)
- [ ] **Glossaire `/glossary`** : termes MCP, tool use, agentic coding… 30–50 entrées ~= page pilier

### 3.2 🚨 Bloqueur SEO critique découvert lors de l'audit — à fixer EN PRIORITÉ

**Problème** : `/quiz` et `/mcp-search` retournent **HTTP 307 → `/login`** pour tout visiteur non-authentifié (incluant Googlebot, GPTBot, ClaudeBot, etc.). Résultat : ces pages **ne sont pas indexées**, toute la structured data (Quiz schema, WebApplication schema) est invisible, on perd les requêtes "claude code quiz", "mcp search engine", etc.

**Solution retenue** : créer des **landing pages publiques** (option 3 discutée) tout en préservant le mur d'onboarding.

- [ ] **`/quiz` → landing publique** (hero, démo, 1-2 questions d'exemple, screenshots, CTA vers `/login`)
- [ ] **`/mcp-search` → landing publique** (hero, valeur, exemple de recherche, screenshots, CTA vers `/login`)
- [ ] Déplacer l'app quiz vers `/quiz/play` (auth-gated, inchangé fonctionnellement)
- [ ] Déplacer l'app MCP search vers `/mcp-search/app` (auth-gated, inchangé fonctionnellement)
- [ ] Mettre à jour `proxy.ts` : `/quiz` et `/mcp-search` ajoutés à `PUBLIC_PATHS`, l'auth se déclenche seulement sur `/quiz/play` et `/mcp-search/app`
- [ ] Mettre à jour le sitemap si besoin (les landings restent dans le sitemap, pas les apps)
- [ ] JSON-LD ajusté : Quiz schema et WebApplication schema déplacés sur les landings
- [ ] Vérifier les liens internes (footer, home) qui pointent vers `/quiz` et `/mcp-search` — ils continueront de marcher (landing public)

**Pourquoi pas de "patch rapide par bypass User-Agent"** : spoofable en 3 secondes par n'importe quel dev (et la cible du site, c'est des devs). Techniquement considéré comme cloaking par Google. Risque de pénalité + fuite de 1-5% du funnel onboarding. L'option 3 n'est pas beaucoup plus de travail et fournit une vraie architecture.

**Effort estimé** : 3-4h pour 2 landings minimalistes.

### 3.3 Topical authority (plusieurs heures)

- [ ] **Pages piliers** : `/learn/claude-code` et `/learn/mcp`
  - Long-form (2000+ mots), structure hiérarchique, maillage vers FAQ + quiz
  - Cible requêtes de tête ("what is claude code", "what is mcp")
- [ ] **Pages de comparaison** : `/vs/cursor`, `/vs/aider`, `/vs/copilot`
  - Cible requêtes commerciales à forte intention
- [ ] **Pages individuelles par MCP populaire** : `/mcp/[slug]`
  - +4700 pages potentielles = énorme surface crawlable
  - Bloqueur : risque de "thin content" si généré sans valeur ajoutée → faire seulement top 100 MCPs avec contenu enrichi

### 3.3 Autorité externe (long terme)

- [ ] **Wikidata entry** pour "Claude Quiz"
- [ ] **Profils sociaux cohérents** : Twitter, Product Hunt, dev.to → `sameAs` dans le schema Organization
- [ ] **Backlinks** : articles invités, mentions GitHub, Product Hunt launch

---

## Phase 4 — Monitoring continu (une fois tout en place)

Dashboard hebdomadaire à mettre en place :

| Métrique | Source | Seuil d'alerte |
|---|---|---|
| Pages indexées | GSC | Baisse > 10% semaine sur semaine |
| Requêtes en top 10 | GSC | Suivre évolution |
| CTR moyen | GSC | < 2% = titres/descriptions à revoir |
| Sessions organiques | GA4 | Suivre évolution |
| CWV (LCP/INP/CLS) | GSC / PSI | Rouge = bloquant |
| Citations IA | Manuel (tests hebdo) | Présence/absence sur 10 requêtes cibles |

**Possibilité** : automatiser via GSC API + dashboard admin sur `/admin/seo` (comme le `/admin/usage` existant pour les coûts IA).

---

## Ordre d'exécution proposé pour demain

1. **GSC** (15 min) — le plus critique, démarrer la collecte ASAP
2. **Bing Webmaster** (5 min) — import GSC
3. **Audit Phase 2** (20 min) — pendant que GSC commence à collecter
4. **GA4** (20 min) — après avoir tranché la question RGPD
5. **IndexNow** (10 min) — petit bonus
6. **Mettre à jour `SEO-GEO.md`** avec la drift favicon

Total ciblé : **~1h15** pour avoir toute l'infra de mesure en place et un rapport d'audit.

Les Phase 3 et 4 se traiteront sur les semaines suivantes, **après avoir des données réelles**.

---

## Questions à trancher avant de commencer

1. **RGPD/cookies** : bannière de consentement complète (Axeptio, Didomi gratuits) OU Consent Mode v2 basique OU pas de GA4 avant d'avoir statué ?
2. **GA4 events** : quels events custom on track dès le début ? (ma suggestion : `quiz_completed`, `mcp_search`, `mcp_deep_analyze`)
3. **Priorité Phase 3** : pages piliers OU pages MCP individuelles OU glossaire ?
