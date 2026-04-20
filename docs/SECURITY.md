# Sécurité — Claude Code Quiz & MCP Search

> Dernière mise à jour : 2026-04-20

---

## 1. Authentification

### CAPTCHA (Cloudflare Turnstile)

Fichier widget : `app/login/page.tsx`
Fichier vérification : `app/api/auth/verify-captcha/route.ts`

L'inscription par email est protégée par **Cloudflare Turnstile** (CAPTCHA gratuit, invisible).

- Le widget apparaît uniquement en mode inscription (pas en connexion ni OAuth)
- Le token est vérifié côté serveur via l'API Cloudflare avant de créer le compte Supabase
- Si `NEXT_PUBLIC_TURNSTILE_SITE_KEY` n'est pas défini, le CAPTCHA est ignoré (graceful degradation)
- Mode : **Managed** (Cloudflare décide si un challenge est nécessaire)

Variables d'environnement : `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (client) + `TURNSTILE_SECRET_KEY` (serveur)

### Proxy (middleware)

### Proxy (middleware)

Fichier : `proxy.ts`

Toutes les pages sont protégées par le proxy Next.js sauf :
- `/` (page d'accueil)
- `/login`
- `/auth/callback`

Un utilisateur non authentifié qui tente d'accéder à `/quiz`, `/mcp-search`, `/onboarding`, `/admin/*` ou toute autre page est automatiquement redirigé vers `/login`.

Un utilisateur authentifié mais non onboardé est redirigé vers `/onboarding`.

### Routes API

**Toutes les routes API vérifient l'authentification** via `getAuthUser()` (fichier `lib/api-auth.ts`) qui appelle `supabase.auth.getUser()` côté serveur.

Seules exceptions :
- `/api/questions/generate` — protégée par `CRON_SECRET` (header `Authorization: Bearer`)
- `/api/mcp/usage` — protégée par `CRON_SECRET`
- `/api/auth/verify-captcha` — publique (vérifie un token Turnstile, pas de données sensibles)

Un appel API sans session Supabase valide retourne `401 Unauthorized`.

---

## 2. Rate Limiting

Fichier : `lib/rate-limit.ts`

Rate limiting en mémoire par IP (sliding window). Se réinitialise au redémarrage du serveur. Suffisant pour le scale actuel.

| Route | Limite | Fenêtre |
|-------|--------|---------|
| `/api/questions/random` | 10 requêtes | 1 minute |
| `/api/questions/answer` | 10 requêtes | 1 minute |
| `/api/mcp/search` | 10 requêtes | 1 minute |
| `/api/mcp/explain` | 5 requêtes | 1 minute |
| `/api/leaderboard` | 10 requêtes | 1 minute |

Les routes dépassant la limite retournent `429 Too Many Requests`.

### Limite mensuelle (deep analysis)

`/api/mcp/deep-analyze` est limité à **10 appels par mois par utilisateur**. Suivi dans la table `deep_analysis_usage` avec `user_id` + `created_at`. La limite se réinitialise le 1er de chaque mois.

---

## 3. Protection anti-scraping

### Questions du quiz

- Les questions ne sont accessibles que via `/api/questions/random` (auth + rate limit 60/min)
- L'API ne retourne **qu'une seule question à la fois**, aléatoirement
- Les réponses correctes ne sont **jamais** envoyées avec la question — il faut appeler `/api/questions/answer` pour vérifier
- Même en scrapant à pleine vitesse (10/min), il faudrait des heures pour récupérer toutes les questions, et on ne récupérerait que les questions + options (pas les réponses sans appel séparé)

### Données MCP

- La recherche MCP requiert auth + rate limit 20/min
- Chaque recherche consomme un appel OpenAI embeddings (coût pour nous)
- Les catégories sont accessibles mais ne contiennent que des compteurs
- Les outils MCP sont lisibles via Supabase anon key (RLS `USING (true)`) mais uniquement si on connaît le `mcp_id` — pas de listing complet possible sans passer par la recherche

### Row Level Security (Supabase)

| Table | Politique |
|-------|-----------|
| `questions` | SELECT uniquement si `active = true` |
| `profiles` | SELECT/UPDATE/INSERT uniquement pour `auth.uid() = id` |
| `mcps` | SELECT uniquement si `active = true` |
| `mcp_tools` | SELECT public (nécessaire pour le détail MCP) |
| `mcp_chunks` | SELECT public (nécessaire pour la recherche vectorielle) |
| `ai_usage_logs` | Pas de politique publique (admin uniquement) |
| `deep_analysis_usage` | SELECT uniquement pour `auth.uid() = user_id` |

---

## 4. Secrets et variables d'environnement

Fichier : `.env.local` (gitignored)

| Variable | Usage | Sensibilité |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase (publique) | Faible |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon Supabase (publique, limitée par RLS) | Faible |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin Supabase (bypass RLS) | **Critique** |
| `CRON_SECRET` | Protège les endpoints cron et admin | **Haute** |
| `OPENAI_API_KEY` | Clé API OpenAI pour embeddings et génération | **Critique** |

### Règles

- `SUPABASE_SERVICE_ROLE_KEY` n'est jamais utilisé côté client — uniquement dans les API routes et les scripts
- `createAdminClient()` (qui utilise le service role) est dans `lib/supabase/admin.ts`, importé uniquement côté serveur
- Les variables `NEXT_PUBLIC_*` sont les seules exposées au client
- `.env.local` est dans `.gitignore`

---

## 5. Protection des coûts IA

### Endpoints qui consomment des crédits OpenAI

| Endpoint | Modèle | Coût estimé/appel | Protection |
|----------|--------|-------------------|------------|
| `/api/mcp/search` | text-embedding-3-small | ~$0.00000004 | Auth + 20/min |
| `/api/mcp/explain` | gpt-4.1-nano | ~$0.001 | Auth + 30/min |
| `/api/mcp/deep-analyze` | gpt-4.1-nano | ~$0.001 | Auth + 10/mois |
| `/api/questions/generate` | anthropic/claude-sonnet-4.6 | ~$0.05 | CRON_SECRET |

### Monitoring

Tous les appels IA sont loggés dans la table `ai_usage_logs` avec :
- `endpoint` — quelle route
- `model` — quel modèle
- `input_tokens` / `output_tokens` — tokens consommés
- `cost_usd` — coût calculé

Dashboard accessible sur `/admin/usage` (protégé par CRON_SECRET) ou via :
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/mcp/usage
```

### Scénario pire cas

Un utilisateur malveillant avec un compte valide pourrait :
- Faire 20 recherches/min × 60min = 1 200 embeddings → coût : $0.00005 (négligeable)
- Faire 30 explain/min × 60min = 1 800 explications → coût : $1.80/heure
- Faire 10 deep-analyze/mois → coût : $0.01/mois

Le risque principal est l'endpoint `/api/mcp/explain` (30/min sans limite mensuelle). Si nécessaire, ajouter une limite mensuelle comme pour deep-analyze.

---

## 6. Améliorations futures possibles

- [ ] **Rate limiting persistant** — Remplacer le rate limiting en mémoire par Upstash Redis pour persister entre les redémarrages et les instances
- [ ] **Limite mensuelle sur explain** — Ajouter un plafond mensuel comme deep-analyze si le coût devient un problème
- [x] **CAPTCHA** — Cloudflare Turnstile (gratuit, invisible) sur l'inscription email. Vérification serveur via `/api/auth/verify-captcha`.
- [ ] **IP banning** — Bloquer les IPs qui dépassent régulièrement les rate limits
- [ ] **Audit log** — Logger les actions sensibles (création de compte, recherches, etc.)
- [ ] **CRON_SECRET** — Changer la valeur par défaut `change-this-to-a-random-secret` pour un vrai secret aléatoire avant le déploiement en prod
