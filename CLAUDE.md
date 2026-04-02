@AGENTS.md

# Claude Code Quiz — Instructions projet

## Ce que c'est

Application Next.js 16 qui aide à apprendre Claude Code via des quiz interactifs à choix multiples.
Les questions sont stockées dans Supabase et générées automatiquement depuis les docs Anthropic via l'AI SDK.

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
