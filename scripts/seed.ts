/**
 * Seed script — populate Supabase with initial questions.
 * Run: npx tsx scripts/seed.ts
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const questions = [
  // COMMANDS
  {
    question: 'Quelle commande slash permet de compresser l\'historique de conversation pour réduire l\'utilisation du contexte ?',
    options: ['/clear', '/compact', '/compress', '/reset'],
    correct_idx: 1,
    explanation: '/compact résume l\'historique de la conversation tout en préservant les informations essentielles, réduisant ainsi l\'utilisation des tokens de contexte.',
    category: 'commands',
    difficulty: 'easy',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/cli-reference',
  },
  {
    question: 'Quelle commande slash vide complètement l\'historique de conversation et repart de zéro ?',
    options: ['/compact', '/reset', '/clear', '/new'],
    correct_idx: 2,
    explanation: '/clear supprime l\'intégralité de l\'historique de la conversation en cours, permettant de repartir avec un contexte vide.',
    category: 'commands',
    difficulty: 'easy',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/cli-reference',
  },
  {
    question: 'Comment ajouter un fichier au contexte de Claude Code depuis le prompt ?',
    options: ['En tapant @nom_du_fichier', 'En tapant #nom_du_fichier', 'En tapant !nom_du_fichier', 'En tapant /add nom_du_fichier'],
    correct_idx: 1,
    explanation: 'Le caractère # permet de référencer et d\'ajouter un fichier au contexte directement depuis l\'invite de commande. Claude pourra alors lire et analyser son contenu.',
    category: 'commands',
    difficulty: 'easy',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
  {
    question: 'Quelle commande slash active le mode plan, où Claude propose une approche avant d\'agir ?',
    options: ['/think', '/plan', '/review', '/architect'],
    correct_idx: 1,
    explanation: '/plan active le mode plan (Plan Mode) dans lequel Claude élabore une stratégie d\'implémentation sans modifier de fichiers, permettant de valider l\'approche avant exécution.',
    category: 'commands',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
  {
    question: 'Quelle commande permet de voir et gérer les hooks configurés dans Claude Code ?',
    options: ['/hooks', '/settings', '/config', '/tools'],
    correct_idx: 0,
    explanation: '/hooks affiche et permet de gérer les hooks configurés — des scripts shell qui s\'exécutent en réponse à des événements comme les appels d\'outils.',
    category: 'commands',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/hooks',
  },
  {
    question: 'Quelle commande slash affiche les raccourcis clavier disponibles dans Claude Code ?',
    options: ['/shortcuts', '/keys', '/help', '/keybindings'],
    correct_idx: 2,
    explanation: '/help affiche l\'aide générale incluant les commandes disponibles et les raccourcis clavier. C\'est le point d\'entrée pour découvrir les fonctionnalités.',
    category: 'commands',
    difficulty: 'easy',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/cli-reference',
  },
  {
    question: 'Comment lancer Claude Code en mode non-interactif pour l\'utiliser dans un pipeline CI/CD ?',
    options: ['claude --headless', 'claude --ci', 'claude -p "prompt"', 'claude --batch'],
    correct_idx: 2,
    explanation: 'Le flag -p (ou --print) suivi d\'un prompt permet d\'exécuter Claude Code en mode non-interactif : il traite le prompt et affiche la réponse sur stdout, idéal pour les scripts et pipelines CI.',
    category: 'commands',
    difficulty: 'hard',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/cli-reference',
  },
  {
    question: 'Quel flag permet de lancer Claude Code sans aucun outil (lecture/écriture de fichiers désactivée) ?',
    options: ['--safe-mode', '--no-tools', '--readonly', '--sandbox'],
    correct_idx: 1,
    explanation: '--no-tools désactive tous les outils de Claude Code (lecture/écriture de fichiers, exécution de commandes). Utile pour des questions purement conversationnelles sans accès au système.',
    category: 'commands',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/cli-reference',
  },

  // SHORTCUTS
  {
    question: 'Quel raccourci clavier permet d\'interrompre une réponse en cours dans Claude Code ?',
    options: ['Ctrl+C', 'Escape', 'Ctrl+Z', 'Ctrl+X'],
    correct_idx: 0,
    explanation: 'Ctrl+C interrompt la réponse en cours de génération. Claude Code s\'arrête immédiatement, ce qui permet d\'éviter une réponse trop longue ou non souhaitée.',
    category: 'shortcuts',
    difficulty: 'easy',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
  {
    question: 'Quel raccourci ouvre le sélecteur de fichiers récents dans Claude Code ?',
    options: ['Ctrl+P', 'Ctrl+R', 'Ctrl+F', 'Tab'],
    correct_idx: 1,
    explanation: 'Ctrl+R ouvre l\'historique des fichiers récents, permettant de naviguer rapidement dans les fichiers récemment accédés ou modifiés par Claude Code.',
    category: 'shortcuts',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
  {
    question: 'Quel raccourci permet d\'entrer un retour à la ligne dans le prompt sans soumettre le message ?',
    options: ['Enter', 'Shift+Enter', 'Ctrl+Enter', 'Alt+Enter'],
    correct_idx: 1,
    explanation: 'Shift+Enter insère un saut de ligne dans le champ de saisie sans envoyer le message. Enter (seul) soumet le message.',
    category: 'shortcuts',
    difficulty: 'easy',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
  {
    question: 'Quel raccourci clavier permet d\'annuler la dernière action d\'un outil dans Claude Code ?',
    options: ['Ctrl+Z', 'Ctrl+U', 'Escape puis U', 'Il n\'est pas possible d\'annuler'],
    correct_idx: 3,
    explanation: 'Claude Code n\'a pas de raccourci d\'annulation natif pour les actions d\'outils. Pour annuler des modifications de fichiers, il faut utiliser git (git checkout ou git restore) ou demander à Claude de revenir en arrière.',
    category: 'shortcuts',
    difficulty: 'hard',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },

  // MCP
  {
    question: 'Que signifie l\'acronyme MCP dans le contexte de Claude Code ?',
    options: [
      'Multi-Context Protocol',
      'Model Context Protocol',
      'Machine Control Protocol',
      'Managed Compute Platform',
    ],
    correct_idx: 1,
    explanation: 'MCP (Model Context Protocol) est un protocole standard ouvert qui permet aux modèles d\'IA de se connecter à des outils et sources de données externes de manière standardisée.',
    category: 'mcp',
    difficulty: 'easy',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
  },
  {
    question: 'Comment ajouter un serveur MCP à Claude Code au niveau global (pour tous les projets) ?',
    options: [
      'claude mcp add --global <nom> <commande>',
      'claude mcp install --user <nom> <commande>',
      'Modifier ~/.claude/config.json manuellement',
      'Via la commande /mcp add dans le chat',
    ],
    correct_idx: 0,
    explanation: 'La commande `claude mcp add --global <nom> <commande>` ajoute un serveur MCP dans la configuration globale (~/.claude.json), le rendant disponible dans tous les projets.',
    category: 'mcp',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
  },
  {
    question: 'Quel type de serveur MCP s\'exécute comme processus local via stdio ?',
    options: ['HTTP server', 'WebSocket server', 'stdio server', 'REST server'],
    correct_idx: 2,
    explanation: 'Les serveurs MCP de type stdio s\'exécutent comme processus locaux et communiquent via stdin/stdout. C\'est le type le plus courant pour les outils locaux (ex: accès filesystem, bases de données).',
    category: 'mcp',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
  },
  {
    question: 'Où est stockée la configuration des serveurs MCP spécifiques à un projet ?',
    options: [
      '~/.claude.json',
      '.claude/settings.json dans le répertoire du projet',
      'package.json sous la clé "mcp"',
      '.mcp.json à la racine du projet',
    ],
    correct_idx: 3,
    explanation: 'Le fichier .mcp.json à la racine d\'un projet stocke la configuration des serveurs MCP spécifiques à ce projet. Il peut être commité dans git pour partager la configuration avec l\'équipe.',
    category: 'mcp',
    difficulty: 'hard',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
  },

  // CONCEPTS
  {
    question: 'Quel fichier Claude Code lit automatiquement dans chaque projet pour obtenir des instructions personnalisées ?',
    options: ['.clauderc', 'CLAUDE.md', '.claude/config.yaml', 'claude.config.js'],
    correct_idx: 1,
    explanation: 'CLAUDE.md est le fichier de mémoire du projet. Claude le lit automatiquement au démarrage de chaque session pour obtenir le contexte, les conventions et les instructions spécifiques au projet.',
    category: 'concepts',
    difficulty: 'easy',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/memory',
  },
  {
    question: 'Quelle est la différence principale entre CLAUDE.md (racine) et ~/.claude/CLAUDE.md ?',
    options: [
      'CLAUDE.md racine est pour le code, ~/.claude/CLAUDE.md pour les préférences',
      'CLAUDE.md racine est spécifique au projet, ~/.claude/CLAUDE.md est global pour tous les projets',
      'Il n\'y a aucune différence, les deux sont identiques',
      '~/.claude/CLAUDE.md est déprécié et ne doit pas être utilisé',
    ],
    correct_idx: 1,
    explanation: 'CLAUDE.md à la racine du projet contient les instructions spécifiques au projet (partageable avec l\'équipe). ~/.claude/CLAUDE.md contient les préférences personnelles de l\'utilisateur applicables à tous les projets.',
    category: 'concepts',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/memory',
  },
  {
    question: 'Qu\'est-ce que le mode "dangerously skip permissions" dans Claude Code ?',
    options: [
      'Un mode qui ignore les erreurs de syntaxe',
      'Un mode qui exécute toutes les actions sans demander de confirmation',
      'Un mode qui désactive l\'historique des commandes',
      'Un mode qui permet d\'éditer les fichiers système',
    ],
    correct_idx: 1,
    explanation: 'Le flag --dangerously-skip-permissions (ou le raccourci Shift+Tab pour basculer) permet à Claude d\'exécuter toutes les actions (écriture, exécution de commandes) sans demander de confirmation. À utiliser avec précaution dans des environnements sûrs (CI, conteneurs).',
    category: 'concepts',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/settings',
  },
  {
    question: 'Que sont les "hooks" dans Claude Code ?',
    options: [
      'Des plugins npm qui étendent les fonctionnalités',
      'Des scripts shell qui s\'exécutent automatiquement en réponse à des événements',
      'Des raccourcis clavier personnalisés',
      'Des templates de prompts réutilisables',
    ],
    correct_idx: 1,
    explanation: 'Les hooks sont des scripts shell configurés dans settings.json qui s\'exécutent automatiquement en réponse à des événements (avant/après un appel d\'outil, au début de session, etc.), permettant d\'automatiser des comportements répétitifs.',
    category: 'concepts',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/hooks',
  },
  {
    question: 'Comment Claude Code gère-t-il les secrets et variables d\'environnement dans un projet ?',
    options: [
      'Il les lit automatiquement depuis .env et les inclut dans le contexte',
      'Il ignore tous les fichiers .env par sécurité',
      'Il lit le fichier .env mais ne les envoie jamais au modèle',
      'Il faut les définir manuellement via /set-env',
    ],
    correct_idx: 1,
    explanation: 'Par défaut, Claude Code n\'accède pas automatiquement aux fichiers .env. Pour les secrets, il faut les passer via l\'environnement shell ou les configurer dans les paramètres. Claude Code évite de traiter les secrets pour des raisons de sécurité.',
    category: 'concepts',
    difficulty: 'hard',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/settings',
  },

  // WORKFLOW
  {
    question: 'Quelle est la meilleure pratique pour fournir du contexte à Claude Code sur un bug complexe ?',
    options: [
      'Décrire le bug en une seule phrase courte',
      'Partager les logs d\'erreur, le fichier concerné avec # et reproduire les étapes',
      'Demander à Claude de chercher le bug lui-même sans indication',
      'Envoyer tout le code source du projet d\'un coup',
    ],
    correct_idx: 1,
    explanation: 'Fournir les logs d\'erreur, référencer les fichiers pertinents avec # et décrire les étapes de reproduction donne à Claude le contexte nécessaire pour diagnostiquer efficacement. Plus le contexte est précis, meilleure est la solution.',
    category: 'workflow',
    difficulty: 'easy',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
  {
    question: 'Comment créer un sous-agent (subagent) dans Claude Code pour paralléliser des tâches ?',
    options: [
      'Utiliser la commande /spawn',
      'Claude Code peut lancer des sous-agents automatiquement via l\'outil Agent',
      'En ouvrant plusieurs terminaux avec claude simultanément',
      'En utilisant le flag --parallel',
    ],
    correct_idx: 1,
    explanation: 'Claude Code dispose d\'un outil Agent natif qui lui permet de lancer des sous-agents pour des tâches parallèles. Cela permet de travailler sur plusieurs branches ou tâches indépendantes simultanément.',
    category: 'workflow',
    difficulty: 'hard',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
  {
    question: 'Quelle est la meilleure façon de demander à Claude Code de ne pas modifier les tests existants lors d\'un refactoring ?',
    options: [
      'Ce n\'est pas possible, Claude modifie ce qu\'il juge nécessaire',
      'Le spécifier clairement dans le prompt de la tâche',
      'Mettre les fichiers de test en lecture seule avec chmod',
      'Utiliser /lock sur les fichiers de test',
    ],
    correct_idx: 1,
    explanation: 'Spécifier explicitement les contraintes dans le prompt (ex: "refactorise sans modifier les tests") est la méthode la plus fiable. Claude Code suit les instructions données et respecte les contraintes clairement énoncées.',
    category: 'workflow',
    difficulty: 'easy',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
  {
    question: 'Quel est l\'avantage d\'utiliser le mode plan (/plan) avant de lancer une implémentation complexe ?',
    options: [
      'Il rend Claude plus rapide',
      'Il permet de valider l\'approche avant toute modification de fichiers',
      'Il active des modèles plus puissants',
      'Il génère automatiquement les tests unitaires',
    ],
    correct_idx: 1,
    explanation: 'Le mode plan permet à Claude de décomposer la tâche et proposer une stratégie sans modifier aucun fichier. Cela permet de détecter des erreurs d\'approche tôt et d\'aligner Claude sur les attentes avant l\'exécution.',
    category: 'workflow',
    difficulty: 'easy',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
  {
    question: 'Comment partager la configuration MCP d\'un projet avec toute l\'équipe ?',
    options: [
      'Partager ~/.claude.json par email',
      'Commiter .mcp.json dans le dépôt git',
      'Utiliser /export-config',
      'Les configurations MCP ne sont pas partageables',
    ],
    correct_idx: 1,
    explanation: 'Le fichier .mcp.json à la racine du projet peut être commité dans git, permettant à tous les membres de l\'équipe d\'avoir les mêmes serveurs MCP configurés automatiquement quand ils clonent le projet.',
    category: 'mcp',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
  },
  {
    question: 'Dans Claude Code, que fait la touche Escape en cours de frappe d\'un message ?',
    options: [
      'Envoie le message immédiatement',
      'Efface tout le texte du champ de saisie',
      'Quitte Claude Code',
      'Annule le dernier appel d\'outil',
    ],
    correct_idx: 1,
    explanation: 'Appuyer sur Escape efface le contenu du champ de saisie actuel sans quitter Claude Code. C\'est utile pour recommencer un prompt sans avoir à tout sélectionner et supprimer manuellement.',
    category: 'shortcuts',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
  {
    question: 'Quel est le rôle de la section "tools" dans CLAUDE.md ?',
    options: [
      'Lister les MCP servers disponibles',
      'Configurer quels outils Claude peut utiliser',
      'CLAUDE.md ne supporte pas de section "tools"',
      'Documenter les outils de développement du projet',
    ],
    correct_idx: 2,
    explanation: 'CLAUDE.md est un fichier Markdown libre — il n\'a pas de sections structurées imposées. C\'est un document d\'instructions en langage naturel que Claude lit pour comprendre le contexte du projet. Les outils sont configurés dans settings.json.',
    category: 'concepts',
    difficulty: 'hard',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/memory',
  },
  {
    question: 'Comment limiter les permissions de Claude Code à la lecture seule (pas d\'écriture ni d\'exécution) ?',
    options: [
      '--read-only flag',
      'En configurant allowedTools dans settings.json pour exclure Write et Bash',
      '/permissions readonly dans le chat',
      'Ce n\'est pas possible nativement',
    ],
    correct_idx: 1,
    explanation: 'Le fichier settings.json permet de configurer allowedTools et disallowedTools pour contrôler précisément quels outils Claude peut utiliser. En excluant Write, Edit et Bash, on obtient un mode lecture seule.',
    category: 'concepts',
    difficulty: 'hard',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/settings',
  },
  {
    question: 'Quelle commande permet de voir le coût en tokens de la session en cours ?',
    options: ['/usage', '/tokens', '/cost', '/stats'],
    correct_idx: 0,
    explanation: '/usage affiche les statistiques de la session en cours : tokens d\'entrée, tokens de sortie, coût estimé et cache hits. Utile pour monitorer l\'utilisation du contexte.',
    category: 'commands',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/cli-reference',
  },
  {
    question: 'Quel événement de hook se déclenche AVANT que Claude Code exécute un outil ?',
    options: ['PreToolUse', 'BeforeToolCall', 'OnToolStart', 'ToolPreHook'],
    correct_idx: 0,
    explanation: 'PreToolUse est l\'événement de hook déclenché avant qu\'un outil soit appelé. Il permet d\'injecter du contexte supplémentaire, de valider l\'action ou même de bloquer l\'exécution en retournant un code de sortie non-zéro.',
    category: 'concepts',
    difficulty: 'hard',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/hooks',
  },
  {
    question: 'Quel format de sortie un hook PreToolUse doit-il retourner pour injecter du contexte dans Claude Code ?',
    options: [
      'Du texte brut sur stdout',
      'Du JSON avec une clé "additionalContext" sur stdout',
      'Du YAML sur stderr',
      'Un fichier temporaire avec les données',
    ],
    correct_idx: 1,
    explanation: 'Les hooks PreToolUse et PostToolUse peuvent retourner un objet JSON avec "additionalContext" sur stdout. Ce texte est alors injecté dans le contexte de Claude, lui permettant d\'adapter son comportement.',
    category: 'concepts',
    difficulty: 'hard',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/hooks',
  },
  {
    question: 'Quel modèle Claude Code utilise-t-il par défaut ?',
    options: [
      'claude-3-opus-20240229',
      'claude-3-5-sonnet-20241022',
      'Le dernier modèle Claude disponible (configurable)',
      'claude-instant-1-2',
    ],
    correct_idx: 2,
    explanation: 'Claude Code utilise par défaut le modèle le plus récent et capable disponible. Le modèle peut être modifié via le flag --model ou la configuration. Actuellement, il s\'agit de claude-sonnet-4.x.',
    category: 'concepts',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/settings',
  },
  {
    question: 'Quelle syntaxe utiliser dans un prompt Claude Code pour référencer un dossier entier ?',
    options: ['@dossier/', '#dossier/', '!dossier/', '/add dossier/'],
    correct_idx: 1,
    explanation: 'Le caractère # suivi d\'un chemin (fichier ou dossier) permet d\'ajouter du contenu au contexte. Pour un dossier, Claude inclura les fichiers pertinents de cette arborescence.',
    category: 'commands',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
  {
    question: 'Dans quel fichier configure-t-on les hooks de Claude Code au niveau projet ?',
    options: [
      '.claude/hooks.json',
      '.claude/settings.json',
      'CLAUDE.md section hooks',
      '.clauderc',
    ],
    correct_idx: 1,
    explanation: 'Les hooks sont configurés dans .claude/settings.json (niveau projet) ou ~/.claude/settings.json (niveau global). La clé "hooks" contient les événements et les commandes à exécuter.',
    category: 'concepts',
    difficulty: 'hard',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/hooks',
  },
  {
    question: 'Comment passer des variables d\'environnement personnalisées à Claude Code au démarrage ?',
    options: [
      'Via /setenv NOM=valeur dans le chat',
      'En les définissant dans le shell avant de lancer claude (NOM=valeur claude)',
      'Dans CLAUDE.md sous une section [env]',
      'Via le flag --env NOM=valeur',
    ],
    correct_idx: 1,
    explanation: 'Les variables d\'environnement sont héritées du shell parent. En les définissant avant la commande claude (ex: API_KEY=xxx claude), elles sont disponibles pour les outils Bash et les hooks.',
    category: 'workflow',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/settings',
  },
  {
    question: 'Qu\'est-ce que le "context window" dans Claude Code et pourquoi est-il important ?',
    options: [
      'La fenêtre graphique de l\'application desktop',
      'La quantité maximale de texte (tokens) que Claude peut traiter en une seule conversation',
      'Le nombre de fichiers simultanément ouverts',
      'La durée maximale d\'une session',
    ],
    correct_idx: 1,
    explanation: 'La fenêtre de contexte est la quantité maximale de tokens (mots/caractères) que Claude peut traiter. Une fois atteinte, les messages anciens sont oubliés. /compact permet de la libérer en résumant l\'historique.',
    category: 'concepts',
    difficulty: 'easy',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
  {
    question: 'Quel est le but principal du fichier .gitignore par rapport à Claude Code ?',
    options: [
      'Claude Code l\'utilise pour savoir quels fichiers ne pas lire automatiquement',
      'Il n\'a aucun impact sur Claude Code',
      'Claude l\'utilise comme liste d\'exclusion lors de la recherche de fichiers pertinents',
      'Il est automatiquement mis à jour par Claude Code',
    ],
    correct_idx: 2,
    explanation: 'Claude Code respecte .gitignore lors de ses recherches et explorations du codebase. Les fichiers ignorés par git (node_modules, dist, secrets) ne seront généralement pas inclus automatiquement dans le contexte.',
    category: 'concepts',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
  {
    question: 'Comment Claude Code s\'intègre-t-il avec les éditeurs de code comme VS Code ?',
    options: [
      'Via une extension VS Code officielle',
      'Via une intégration terminal dans l\'éditeur (pas d\'extension)',
      'Ce n\'est pas possible, Claude Code est CLI uniquement',
      'Via le Language Server Protocol (LSP)',
    ],
    correct_idx: 0,
    explanation: 'Claude Code dispose d\'une extension VS Code officielle (et JetBrains) qui s\'intègre directement dans l\'IDE. Elle permet d\'utiliser Claude Code sans quitter l\'éditeur, avec accès au contexte de l\'éditeur ouvert.',
    category: 'concepts',
    difficulty: 'medium',
    source_url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  },
]

async function main() {
  console.log(`Inserting ${questions.length} questions…`)

  const { data, error } = await supabase.from('questions').insert(questions).select('id')

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log(`✓ Inserted ${data?.length} questions successfully.`)
}

main()
