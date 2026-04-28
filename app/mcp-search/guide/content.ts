import type { Locale } from '@/lib/i18n'

export type GuideContent = {
  metaTitle: string
  metaDescription: string
  navBack: string
  navHome: string
  badge: string
  heroTitle: string
  heroSubtitle: string

  // Section: What is this?
  whatTitle: string
  whatPara1Before: string
  whatPara1Strong: string
  whatPara1Middle: string
  whatPara1Stat: string
  whatPara1After: string
  whatPara2: string
  toolSearchDesc: string
  toolDetailsDesc: string
  toolLoginDesc: string

  // Step 1: Add the MCP to Claude (URL only, no key needed)
  addTitle: string
  addIntroBefore: string
  addIntroFreeStrong: string
  addIntroAfter: string
  addClaudeCode: string
  addClaudeCodePathBefore: string
  addClaudeCodePath: string
  addClaudeCodePathAfter: string
  addClaudeCodeNote: string
  addClaudeDesktop: string
  addClaudeDesktopPathBefore: string
  addClaudeDesktopMacPath: string
  addClaudeDesktopPathMiddle: string
  addClaudeDesktopWinPath: string
  addClaudeDesktopPathAfter: string
  addClaudeDesktopNote: string
  addCursor: string
  addCursorPathBefore: string
  addCursorPath: string
  addCursorPathAfter: string
  addCursorNoteBefore: string
  addCursorNoteShortcut: string
  addCursorNoteMiddle: string
  addCursorNoteAction: string
  addCursorNoteAfter: string
  addCli: string
  addCliDesc: string
  addSkipToUnlockBefore: string
  addSkipToUnlockCta: string
  addSkipToUnlockAfter: string
  addManualTitle: string

  // Step 2 (optional): Unlock unlimited
  unlockTitle: string
  unlockDesc: string
  unlockCtaText: string
  unlockHowToBefore: string
  unlockHowToStrong: string
  unlockHowToAfter: string
  unlockCliTitle: string
  unlockCliDesc: string

  // Step 3: First prompt
  firstPromptTitle: string
  firstPromptIntro: string
  firstPromptUser: string
  firstPromptAssistant: string
  firstPromptNoteBefore: string
  firstPromptNoteCode: string
  firstPromptNoteAfter: string

  // Section: Tools reference
  toolsRefTitle: string
  toolsParams: string
  toolsNoParams: string
  toolSearchSummary: string
  toolDetailsSummary: string
  toolLoginSummary: string
  toolSearchParams: Array<{ key: string; type: string; desc: string }>
  toolDetailsParams: Array<{ key: string; type: string; desc: string }>

  // Section: Examples
  examplesTitle: string
  examplesPrompts: string[]

  // Section: Troubleshooting
  troubleTitle: string
  troubleQ1: string
  troubleA1: string
  troubleQ2: string
  troubleA2Before: string
  troubleA2Code: string
  troubleA2After: string
  troubleQ3: string
  troubleA3Before: string
  troubleA3CtaText: string
  troubleA3After: string
  troubleQ4: string
  troubleA4: string

  // Section: Security
  securityTitle: string
  securityItem1: string
  securityItem2: string
  securityItem3: string
  securityItem4: string

  // Footer CTAs
  ctaTrySearch: string
  ctaFaq: string

  // Speakers
  speakerYou: string
  speakerClaude: string
}

const PLACEHOLDER_KEY = 'mcps_PASTE_YOUR_KEY_HERE'

export function buildHttpConfigAnonymous(mcpUrl: string): string {
  return `{
  "mcpServers": {
    "mcp-search": {
      "type": "http",
      "url": "${mcpUrl}"
    }
  }
}`
}

export function buildHttpConfigWithKey(mcpUrl: string, key: string = PLACEHOLDER_KEY): string {
  return `{
  "mcpServers": {
    "mcp-search": {
      "type": "http",
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer ${key}"
      }
    }
  }
}`
}

export function buildCliCommandAnonymous(mcpUrl: string): string {
  return `claude mcp add --transport http mcp-search ${mcpUrl}`
}

export function buildCliCommandWithKey(mcpUrl: string, key: string = PLACEHOLDER_KEY): string {
  return `claude mcp add --transport http mcp-search ${mcpUrl} --header "Authorization: Bearer ${key}"`
}

const FR: GuideContent = {
  metaTitle: "Guide d'installation - MCP Search",
  metaDescription:
    'Connecte le moteur de recherche MCP de claude-quiz à Claude Code, Claude Desktop ou Cursor en quelques minutes.',
  navBack: '← Retour à la recherche',
  navHome: 'Accueil',
  badge: 'Nouveau · MCP server',
  heroTitle: 'Utilise notre moteur MCP directement dans Claude',
  heroSubtitle:
    "Ajoute notre URL à la config de Claude Code, Claude Desktop ou Cursor pour utiliser le moteur depuis ton chat. Les 3 premières recherches sont gratuites, ensuite tu génères une clé API pour passer en illimité.",

  whatTitle: "C'est quoi ?",
  whatPara1Before: 'Notre ',
  whatPara1Strong: 'serveur MCP',
  whatPara1Middle:
    ' est un endpoint HTTP hébergé qui expose le moteur de recherche claude-quiz comme un outil dans Claude. Il indexe plus de ',
  whatPara1Stat: '4 700 serveurs MCP',
  whatPara1After: ' et 32 000 outils, avec recherche sémantique (embeddings + ranking hybride).',
  whatPara2: 'Il expose trois outils que Claude peut appeler automatiquement quand tu en as besoin :',
  toolSearchDesc: 'recherche par prompt naturel',
  toolDetailsDesc: "détails complets d'un MCP par slug",
  toolLoginDesc: "lien vers la page de génération de clé API",

  // Step 1
  addTitle: 'Ajoute le MCP à ton client',
  addIntroBefore: 'Colle ce snippet dans ton client. Tu obtiens ',
  addIntroFreeStrong: '3 recherches gratuites par session',
  addIntroAfter:
    " sans clé d'API : Claude Code envoie automatiquement un identifiant de session.",
  addClaudeCode: 'Claude Code',
  addClaudeCodePathBefore: 'Édite ',
  addClaudeCodePath: '~/.claude.json',
  addClaudeCodePathAfter: ' :',
  addClaudeCodeNote:
    "Quitte et relance Claude Code. La commande `/mcp` dans le chat doit lister `mcp-search` comme connecté.",
  addClaudeDesktop: 'Claude Desktop',
  addClaudeDesktopPathBefore: 'Sur macOS : ',
  addClaudeDesktopMacPath: '~/Library/Application Support/Claude/claude_desktop_config.json',
  addClaudeDesktopPathMiddle: ' (Windows : ',
  addClaudeDesktopWinPath: '%APPDATA%\\Claude\\claude_desktop_config.json',
  addClaudeDesktopPathAfter: ').',
  addClaudeDesktopNote: 'Redémarre Claude Desktop entièrement (Quit, pas juste fermer la fenêtre).',
  addCursor: 'Cursor',
  addCursorPathBefore: 'Édite ',
  addCursorPath: '~/.cursor/mcp.json',
  addCursorPathAfter: ' avec le même format que Claude Code.',
  addCursorNoteBefore: 'Recharge la fenêtre Cursor (',
  addCursorNoteShortcut: '⌘⇧P',
  addCursorNoteMiddle: ' → ',
  addCursorNoteAction: 'Reload Window',
  addCursorNoteAfter: ') pour que la config soit prise en compte.',
  addCli: 'En une commande (Claude Code)',
  addCliDesc: 'Lance ça dans ton terminal :',
  addSkipToUnlockBefore: 'Tu as déjà un compte et tu veux générer une clé pour passer en illimité tout de suite ? ',
  addSkipToUnlockCta: 'Va directement à l’étape 2 →',
  addSkipToUnlockAfter: '',
  addManualTitle: 'Ou édite la config à la main',

  // Step 2
  unlockTitle: 'Passe en illimité (optionnel)',
  unlockDesc:
    "Au-delà des 3 recherches gratuites, le serveur te renvoie un message demandant une clé API. Tu peux en générer une à tout moment :",
  unlockCtaText: 'Générer ma clé API →',
  unlockHowToBefore:
    "Une fois la clé copiée, modifie ta config : ajoute un champ ",
  unlockHowToStrong: '"headers"',
  unlockHowToAfter:
    " avec ta clé en Bearer. Voici la config complète (remplace `mcps_PASTE_YOUR_KEY_HERE` par ta vraie clé) :",
  unlockCliTitle: 'Ou en une commande',
  unlockCliDesc:
    "Au lieu d'éditer le fichier JSON, lance directement (remplace `mcps_PASTE_YOUR_KEY_HERE` par ta vraie clé) :",

  // Step 3
  firstPromptTitle: 'Premier prompt',
  firstPromptIntro: "Dans n'importe quel chat Claude, demande quelque chose en langage naturel :",
  firstPromptUser: 'Trouve-moi un MCP pour gérer mes calendriers Google',
  firstPromptAssistant: `J'ai trouvé 5 MCPs pertinents pour gérer Google Calendar :

1. **google-calendar-mcp** (1.2k stars, vérifié)
   Tools : list_events, create_event, update_event, delete_event…
2. **gcal-pro** (340 stars)
   …

Je recommanderais google-calendar-mcp pour commencer : c'est le plus utilisé, vérifié par Smithery, et il couvre tous les cas d'usage standard.

Tu veux que je te montre comment l'installer ?`,
  firstPromptNoteBefore: 'Claude appelle ',
  firstPromptNoteCode: 'search_mcps',
  firstPromptNoteAfter:
    " en arrière-plan, reçoit les données structurées, puis génère sa propre explication contextuelle.",

  toolsRefTitle: 'Référence des tools',
  toolsParams: 'Paramètres',
  toolsNoParams: 'Aucun paramètre.',
  toolSearchSummary: 'Recherche sémantique parmi les 4 700+ MCPs.',
  toolDetailsSummary:
    "Détails complets d'un MCP par slug : tous les tools avec leurs schemas, repo, install, etc.",
  toolLoginSummary: 'Renvoie le lien vers la page de génération de clé API.',
  toolSearchParams: [
    { key: 'query', type: 'string (requis)', desc: 'Description en langage naturel' },
    { key: 'limit', type: 'number (optionnel)', desc: 'Max résultats (1-25, défaut 10)' },
    { key: 'categories', type: 'string[] (optionnel)', desc: 'Filtre par catégories' },
    {
      key: 'toolTags',
      type: 'string[] (optionnel)',
      desc: 'Filtre par tag de marque (ex: ["github", "slack"])',
    },
  ],
  toolDetailsParams: [{ key: 'slug', type: 'string (requis)', desc: 'Slug retourné par search_mcps' }],

  examplesTitle: 'Exemples de prompts',
  examplesPrompts: [
    "Trouve-moi un MCP pour automatiser Gmail",
    "Quel MCP utiliser pour requêter une base PostgreSQL ?",
    "Donne-moi les détails du MCP github-mcp",
    "Compare les MCPs pour gérer Slack",
    "Y a-t-il un MCP pour Linear ? Liste les outils qu'il expose.",
  ],

  troubleTitle: 'Dépannage',
  troubleQ1: "`mcp-search` n'apparaît pas dans Claude après la config",
  troubleA1:
    "Quitte et relance complètement le client (pas juste fermer la fenêtre). Vérifie que `type` est bien `\"http\"` et que l'URL est correcte. Dans Claude Code, tape `/mcp` pour voir le statut.",
  troubleQ2: '« Free tier exhausted » alors que je viens d\'ajouter ma clé',
  troubleA2Before: 'Vérifie que ',
  troubleA2Code: 'Authorization: Bearer mcps_…',
  troubleA2After:
    " est bien dans les `headers` de ta config (pas dans `args` ou ailleurs), sans espaces autour de la clé. Re-déclare le serveur si tu n'es pas sûr.",
  troubleQ3: "J'ai perdu ma clé / je veux la révoquer",
  troubleA3Before: "Va sur ",
  troubleA3CtaText: 'la page de setup',
  troubleA3After:
    ", clique sur « Révoquer » à côté de la clé concernée. Tu peux en générer une nouvelle, le client utilisera la nouvelle dès la prochaine config update.",
  troubleQ4: 'Erreur "Embedding API error"',
  troubleA4:
    "C'est un problème côté serveur (clé OpenAI manquante ou quota dépassé). Réessaye dans quelques minutes.",

  securityTitle: 'Sécurité & vie privée',
  securityItem1:
    "La clé est stockée hashée (SHA-256) côté serveur. Le serveur ne peut pas retrouver la valeur en clair, donc on ne peut pas te la rappeler.",
  securityItem2:
    "Tu peux avoir jusqu'à 5 clés actives. Révoque celles que tu n'utilises plus depuis la page de setup.",
  securityItem3:
    "Aucun mot de passe ne transite par Claude. Toute l'authentification se fait sur le site claude-quiz dans ton navigateur.",
  securityItem4:
    "Tes recherches sont loguées comme les recherches normales du site (pour analyser les coûts IA), mais nous ne stockons pas le contenu des résultats.",

  ctaTrySearch: 'Tester la recherche →',
  ctaFaq: 'FAQ générale',

  speakerYou: 'Toi',
  speakerClaude: 'Claude',
}

const EN: GuideContent = {
  metaTitle: 'Install Guide - MCP Search',
  metaDescription:
    'Connect the claude-quiz MCP search engine to Claude Code, Claude Desktop, or Cursor in a few minutes.',
  navBack: '← Back to search',
  navHome: 'Home',
  badge: 'New · MCP server',
  heroTitle: 'Use our MCP search engine directly inside Claude',
  heroSubtitle:
    "Add our URL to your Claude Code, Claude Desktop, or Cursor config to use the engine from your chat. The first 3 searches are free, then generate an API key for unlimited use.",

  whatTitle: 'What is this?',
  whatPara1Before: 'Our ',
  whatPara1Strong: 'MCP server',
  whatPara1Middle:
    ' is a hosted HTTP endpoint that exposes the claude-quiz search engine as a tool inside Claude. It indexes more than ',
  whatPara1Stat: '4,700 MCP servers',
  whatPara1After: ' and 32,000 tools, with semantic search (embeddings + hybrid ranking).',
  whatPara2: 'It exposes three tools that Claude can call automatically when you need them:',
  toolSearchDesc: 'natural-language search',
  toolDetailsDesc: 'full details for an MCP by slug',
  toolLoginDesc: 'link to the API key generation page',

  // Step 1
  addTitle: 'Add the MCP to your client',
  addIntroBefore: 'Paste this snippet into your client. You get ',
  addIntroFreeStrong: '3 free searches per session',
  addIntroAfter:
    ' without an API key — Claude Code sends a session id automatically.',
  addClaudeCode: 'Claude Code',
  addClaudeCodePathBefore: 'Edit ',
  addClaudeCodePath: '~/.claude.json',
  addClaudeCodePathAfter: ':',
  addClaudeCodeNote:
    'Quit and relaunch Claude Code. The `/mcp` command in chat should list `mcp-search` as connected.',
  addClaudeDesktop: 'Claude Desktop',
  addClaudeDesktopPathBefore: 'On macOS: ',
  addClaudeDesktopMacPath: '~/Library/Application Support/Claude/claude_desktop_config.json',
  addClaudeDesktopPathMiddle: ' (Windows: ',
  addClaudeDesktopWinPath: '%APPDATA%\\Claude\\claude_desktop_config.json',
  addClaudeDesktopPathAfter: ').',
  addClaudeDesktopNote: 'Fully restart Claude Desktop (Quit, not just close the window).',
  addCursor: 'Cursor',
  addCursorPathBefore: 'Edit ',
  addCursorPath: '~/.cursor/mcp.json',
  addCursorPathAfter: ' with the same format as Claude Code.',
  addCursorNoteBefore: 'Reload the Cursor window (',
  addCursorNoteShortcut: '⌘⇧P',
  addCursorNoteMiddle: ' → ',
  addCursorNoteAction: 'Reload Window',
  addCursorNoteAfter: ') so the config is picked up.',
  addCli: 'One-liner (Claude Code)',
  addCliDesc: 'Run this in your terminal:',
  addSkipToUnlockBefore: 'Already have an account and want to generate a key for unlimited use right away? ',
  addSkipToUnlockCta: 'Skip to step 2 →',
  addSkipToUnlockAfter: '',
  addManualTitle: 'Or edit your config manually',

  // Step 2
  unlockTitle: 'Go unlimited (optional)',
  unlockDesc:
    'Past the 3 free searches, the server asks for an API key. You can generate one anytime:',
  unlockCtaText: 'Generate my API key →',
  unlockHowToBefore: 'Once the key is copied, edit your config: add a ',
  unlockHowToStrong: '"headers"',
  unlockHowToAfter:
    ' field with your key as Bearer. Here is the full config (replace `mcps_PASTE_YOUR_KEY_HERE` with your real key):',
  unlockCliTitle: 'Or as a one-liner',
  unlockCliDesc:
    "Instead of editing the JSON file, just run (replace `mcps_PASTE_YOUR_KEY_HERE` with your real key):",

  // Step 3
  firstPromptTitle: 'First prompt',
  firstPromptIntro: 'In any Claude chat, ask something in natural language:',
  firstPromptUser: 'Find me an MCP to manage my Google Calendars',
  firstPromptAssistant: `I found 5 relevant MCPs for managing Google Calendar:

1. **google-calendar-mcp** (1.2k stars, verified)
   Tools: list_events, create_event, update_event, delete_event…
2. **gcal-pro** (340 stars)
   …

I'd recommend google-calendar-mcp to start with: it's the most popular, verified by Smithery, and covers all standard use cases.

Want me to show you how to install it?`,
  firstPromptNoteBefore: 'Claude calls ',
  firstPromptNoteCode: 'search_mcps',
  firstPromptNoteAfter:
    ' in the background, gets the structured data, then generates its own contextual explanation.',

  toolsRefTitle: 'Tools reference',
  toolsParams: 'Parameters',
  toolsNoParams: 'No parameters.',
  toolSearchSummary: 'Semantic search across 4,700+ MCPs.',
  toolDetailsSummary:
    'Full details for an MCP by slug: every tool with input schema, repo, install, etc.',
  toolLoginSummary: 'Returns the URL of the API key generation page.',
  toolSearchParams: [
    { key: 'query', type: 'string (required)', desc: 'Natural-language description' },
    { key: 'limit', type: 'number (optional)', desc: 'Max results (1-25, default 10)' },
    { key: 'categories', type: 'string[] (optional)', desc: 'Filter by categories' },
    {
      key: 'toolTags',
      type: 'string[] (optional)',
      desc: 'Filter by brand tag (e.g. ["github", "slack"])',
    },
  ],
  toolDetailsParams: [{ key: 'slug', type: 'string (required)', desc: 'Slug returned by search_mcps' }],

  examplesTitle: 'Prompt examples',
  examplesPrompts: [
    'Find me an MCP to automate Gmail',
    'Which MCP should I use to query a PostgreSQL database?',
    'Give me the details of the github-mcp MCP',
    'Compare MCPs for managing Slack',
    'Is there an MCP for Linear? List the tools it exposes.',
  ],

  troubleTitle: 'Troubleshooting',
  troubleQ1: '`mcp-search` does not show up in Claude after configuring',
  troubleA1:
    'Fully quit and relaunch the client (not just close the window). Make sure `type` is `"http"` and the URL is correct. In Claude Code, type `/mcp` to check the status.',
  troubleQ2: '"Free tier exhausted" right after I added my key',
  troubleA2Before: 'Make sure ',
  troubleA2Code: 'Authorization: Bearer mcps_…',
  troubleA2After:
    " is in the `headers` of your config (not in `args` or elsewhere) with no surrounding spaces. Re-declare the server if you're unsure.",
  troubleQ3: 'I lost my key / I want to revoke it',
  troubleA3Before: 'Go to ',
  troubleA3CtaText: 'the setup page',
  troubleA3After:
    ', click "Revoke" next to the affected key. You can generate a new one — the client picks it up next time you update the config.',
  troubleQ4: '"Embedding API error"',
  troubleA4:
    "It's a server-side issue (missing OpenAI key or quota exceeded). Try again in a few minutes.",

  securityTitle: 'Security & privacy',
  securityItem1:
    "The key is stored as a SHA-256 hash on the server. The server can't recover the plaintext, so we can never re-show it to you.",
  securityItem2:
    "You can have up to 5 active keys. Revoke any you don't use anymore from the setup page.",
  securityItem3:
    'No password ever transits through Claude. All authentication happens on the claude-quiz site in your browser.',
  securityItem4:
    "Your searches are logged like normal site searches (for AI cost tracking), but we don't store the contents of the results.",

  ctaTrySearch: 'Try the search →',
  ctaFaq: 'General FAQ',

  speakerYou: 'You',
  speakerClaude: 'Claude',
}

export function getGuideContent(locale: Locale): GuideContent {
  return locale === 'fr' ? FR : EN
}
