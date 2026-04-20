/**
 * MCP category taxonomy — use-case oriented.
 *
 * Each MCP gets exactly ONE primary category.
 * Categories are grouped for display (Engineering, Go-to-Market, Product, General).
 */

export type CategoryGroup = 'engineering' | 'go-to-market' | 'product' | 'general'

export type CategoryDef = {
  id: string
  label: string
  labelFr: string
  group: CategoryGroup
  /** Keywords matched against MCP name + description + tool names. Order = priority. */
  keywords: string[]
  /** Negative keywords — if these match, skip this category even if keywords match */
  antiKeywords?: string[]
}

export const CATEGORY_GROUPS: Record<CategoryGroup, { label: string; labelFr: string }> = {
  engineering: { label: 'Engineering', labelFr: 'Engineering' },
  'go-to-market': { label: 'Go-to-Market', labelFr: 'Go-to-Market' },
  product: { label: 'Product', labelFr: 'Produit' },
  general: { label: 'General', labelFr: 'Général' },
}

export const CATEGORIES: CategoryDef[] = [
  // ── Engineering ──
  {
    id: 'dev-tools',
    label: 'Dev Tools',
    labelFr: 'Outils dev',
    group: 'engineering',
    keywords: [
      'github', 'gitlab', 'bitbucket', 'git commit', 'pull request',
      'ci/cd', 'npm package', 'pypi', 'package manager',
      'code review', 'linter', 'eslint', 'prettier', 'jest',
      'playwright', 'cypress', 'debugger', 'vscode',
      'copilot', 'code search', 'code generation', 'code snippet',
      'developer tool', 'stack overflow', 'codebase',
      'compile', 'transpile', 'bundler', 'webpack', 'turbopack',
      'version control', 'merge conflict', 'branch',
      'terminal command', 'shell', 'desktop commander',
      'benchmark',
    ],
    antiKeywords: ['prediction market', 'weather', 'hotel', 'flight', 'ticket search'],
  },
  {
    id: 'databases',
    label: 'Databases',
    labelFr: 'Bases de données',
    group: 'engineering',
    keywords: [
      'postgres', 'mysql', 'mongodb', 'sqlite', 'redis', 'supabase',
      'neon', 'prisma', 'drizzle', 'sql query', 'database', 'dynamodb',
      'elasticsearch', 'bigquery', 'snowflake', 'data warehouse',
      'cassandra', 'cockroach', 'mariadb', 'neo4j', 'graph database',
      'vector database', 'pinecone', 'weaviate', 'qdrant', 'milvus',
      'tinybird',
    ],
    antiKeywords: ['blockchain', 'knowledge base'],
  },
  {
    id: 'cloud-infra',
    label: 'Cloud & Infra',
    labelFr: 'Cloud & Infra',
    group: 'engineering',
    keywords: [
      'docker', 'kubernetes', 'k8s', 'terraform', 'aws ', 'amazon web services',
      'gcp', 'google cloud', 'azure', 'vercel', 'cloudflare', 'netlify',
      'heroku', 'infrastructure', 'devops',
      'observability', 'sentry', 'datadog', 'grafana',
      'prometheus', 'alerting', 'uptime',
      'load balancer', 'cdn', 'serverless', 'lambda',
      'ansible', 'pulumi', 'helm',
    ],
  },
  {
    id: 'security',
    label: 'Security',
    labelFr: 'Sécurité',
    group: 'engineering',
    keywords: [
      'oauth', 'sso', 'saml', 'jwt', 'certificate',
      'encryption', 'vulnerability', 'security scan', 'penetration test',
      'firewall', 'waf', 'access control',
      'zero trust', 'secret management', 'vault',
      'malware', 'threat', 'cybersecurity', 'cve',
    ],
    antiKeywords: ['social media', 'instagram', 'calendar'],
  },
  {
    id: 'ai-agents',
    label: 'AI & Agents',
    labelFr: 'IA & Agents',
    group: 'engineering',
    keywords: [
      'openai', 'anthropic', 'claude ', 'gpt-', 'chatgpt', 'gemini',
      'llm', 'large language model', 'language model',
      'agent framework', 'ai agent', 'autonomous agent',
      'memory mcp', 'long-term memory', 'semantic memory',
      'reasoning tool', 'chain of thought', 'planner agent',
      'mistral', 'cohere', 'perplexity', 'huggingface', 'replicate',
      'fine-tune', 'rag pipeline', 'prompt engineering',
      'function calling', 'tool calling',
      'vector search', 'embedding model',
    ],
  },

  // ── Go-to-Market ──
  {
    id: 'email',
    label: 'Email',
    labelFr: 'Email',
    group: 'go-to-market',
    keywords: [
      'gmail', 'outlook', 'sendgrid', 'mailgun', 'resend', 'postmark',
      'email send', 'email inbox', 'email campaign', 'newsletter',
      'mail server', 'smtp', 'imap', 'email api', 'agentmail',
      'email management', 'email draft', 'mailchimp',
    ],
  },
  {
    id: 'social-media',
    label: 'Social Media',
    labelFr: 'Réseaux sociaux',
    group: 'go-to-market',
    keywords: [
      'instagram', 'twitter', 'x.com', 'linkedin', 'facebook', 'tiktok',
      'reddit', 'youtube', 'pinterest', 'threads', 'mastodon', 'bluesky',
      'social media', 'social network', 'tweet', 'subreddit',
      'influencer', 'viral marketing',
    ],
    antiKeywords: ['code search'],
  },
  {
    id: 'communication',
    label: 'Chat & Messaging',
    labelFr: 'Chat & Messagerie',
    group: 'go-to-market',
    keywords: [
      'slack', 'discord', 'telegram', 'microsoft teams', 'whatsapp',
      'sms', 'twilio', 'messaging platform', 'chat bot', 'chatbot',
      'push notification', 'intercom', 'zendesk',
    ],
  },
  {
    id: 'meetings',
    label: 'Meetings & Video',
    labelFr: 'Réunions & Visio',
    group: 'go-to-market',
    keywords: [
      'zoom', 'google meet', 'microsoft teams meeting', 'webex',
      'video conference', 'video conferencing', 'webinar',
      'calendly', 'schedule meeting', 'booking meeting', 'meeting scheduler',
      'eventbrite', 'granola', 'meeting notes', 'meeting transcript',
      'zoom meeting', 'live call',
    ],
    antiKeywords: ['code review'],
  },
  {
    id: 'crm',
    label: 'CRM & Sales',
    labelFr: 'CRM & Ventes',
    group: 'go-to-market',
    keywords: [
      'salesforce', 'hubspot', 'pipedrive', 'attio',
      'crm', 'customer relationship', 'customer data',
      'lead scoring', 'lead generation', 'sales pipeline',
      'deal stage', 'opportunity stage', 'prospect',
      'buyer intent', 'meddic', 'outreach',
      'user management', 'user accounts', 'contact list',
      'clerk user', 'survey monkey', 'survey form',
    ],
    antiKeywords: ['social media', 'stock market'],
  },
  {
    id: 'content',
    label: 'Content & CMS',
    labelFr: 'Contenu & CMS',
    group: 'go-to-market',
    keywords: [
      'wordpress', 'contentful', 'sanity', 'strapi', 'ghost',
      'blog', 'cms', 'content management', 'seo', 'copywriting',
      'marketing', 'brand', 'advertising', 'google ads', 'campaign',
      'landing page', 'persona', 'content creation',
      'rss', 'news feed', 'article', 'headline',
      'news', 'trending', 'stories',
    ],
  },
  {
    id: 'commerce',
    label: 'E-commerce',
    labelFr: 'E-commerce',
    group: 'go-to-market',
    keywords: [
      'shopify', 'stripe', 'payment', 'checkout', 'cart', 'product catalog',
      'woocommerce', 'e-commerce', 'ecommerce', 'invoice',
      'billing', 'subscription', 'merchant',
      'hotel', 'booking', 'flight', 'ticket search', 'travel',
      'reservation', 'product search', 'shopping',
      'price comparison', 'price tracker', 'deal', 'best price',
      'real estate', 'property listing', 'redfin', 'zillow',
      'event discovery', 'local food',
    ],
    antiKeywords: ['app store', 'github'],
  },

  // ── Product ──
  {
    id: 'productivity',
    label: 'Productivity',
    labelFr: 'Productivité',
    group: 'product',
    keywords: [
      'notion', 'trello', 'jira', 'asana', 'linear', 'clickup',
      'todoist', 'calendar', 'schedule', 'task management', 'project management',
      'kanban', 'sprint', 'agile', 'meeting notes',
      'confluence', 'basecamp', 'monday.com', 'project plan',
      'to-do list', 'todo list', 'note taking',
      'e-signature', 'document signing', 'boldsign',
      'calculator', 'arithmetic', 'unit conversion',
      'zapier', 'workflow automation', 'automate workflow',
      'connect apps', 'n8n', 'make.com',
      'time zone', 'timestamp', 'cron expression', 'iso 8601',
      'domain availability', 'domain name search',
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics & Data',
    labelFr: 'Analytics & Data',
    group: 'product',
    keywords: [
      'google analytics', 'mixpanel', 'amplitude', 'posthog', 'segment',
      'data visualization', 'chart', 'spreadsheet',
      'google sheets', 'excel', 'csv', 'airtable', 'data analysis',
      'business intelligence', 'tableau', 'metabase', 'looker',
      'open data', 'dataset', 'statistics', 'census',
      'salary data', 'compensation data', 'government data',
    ],
  },
  {
    id: 'design',
    label: 'Design & Media',
    labelFr: 'Design & Médias',
    group: 'product',
    keywords: [
      'figma', 'canva', 'adobe', 'photoshop', 'illustrator', 'sketch',
      'design system', 'ui component', 'image generation', 'image editing',
      'video editing', 'audio', 'transcription', 'text-to-speech',
      'speech-to-text', 'music', 'media processing', 'pdf',
      'diagram', 'wireframe', 'icon', 'font',
      'google slides', 'presentation', 'powerpoint',
      'translation', 'localization', 'multilingual',
      'podcast', 'podcast episode', 'podcast transcript',
      'background removal', 'meme',
      'video platform',
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge & Research',
    labelFr: 'Savoirs & Recherche',
    group: 'product',
    keywords: [
      'arxiv', 'pubmed', 'academic paper', 'scientific', 'scholar',
      'research paper', 'citation', 'literature review', 'journal',
      'semantic scholar', 'biomedical', 'clinical', 'patent',
      'knowledge base', 'encyclopedia', 'wiki',
      'law', 'legal', 'court', 'regulation', 'statute', 'legislation',
      'documentation', 'reference', 'fact-check', 'verified knowledge',
      'up-to-date', 'official documentation',
      'education', 'curriculum', 'standards', 'university',
      'open data', 'transparency', 'government',
      'bible', 'scripture', 'religious text',
      'weather forecast', 'weather information', 'weather data',
      'climate data', 'temperature forecast', 'real-time weather',
    ],
    antiKeywords: ['code generation', 'code search', 'github'],
  },
  {
    id: 'hr-jobs',
    label: 'HR & Jobs',
    labelFr: 'RH & Emplois',
    group: 'product',
    keywords: [
      'recruitment', 'recruiting', 'hiring', 'applicant tracking',
      'job board', 'job listing', 'job search', 'remote job',
      'candidate search', 'resume', 'cv', 'talent acquisition',
      'hr software', 'human resources', 'payroll',
      'successfactors', 'workday', 'bamboohr', 'greenhouse',
      'himalayas', 'employee onboarding', 'performance review',
    ],
  },

  // ── General ──
  {
    id: 'web-search',
    label: 'Web Search',
    labelFr: 'Recherche web',
    group: 'general',
    keywords: [
      'web search', 'search engine', 'brave search', 'tavily', 'serp',
      'google search', 'bing search', 'duckduckgo', 'web scraping',
      'web crawl', 'browser automation', 'puppeteer', 'scrape',
      'web page', 'real-time search', 'search the web',
      'linkup', 'exa search', 'jina', 'fetch webpage',
      'fetch request', 'crawling',
    ],
  },
  {
    id: 'file-storage',
    label: 'Files & Storage',
    labelFr: 'Fichiers & Stockage',
    group: 'general',
    keywords: [
      'google drive', 'dropbox', 'onedrive', 'box', 's3', 'r2',
      'file upload', 'file management', 'cloud storage', 'filesystem',
      'file system', 'directory', 'document management', 'backup',
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Crypto',
    labelFr: 'Finance & Crypto',
    group: 'general',
    keywords: [
      'blockchain', 'cryptocurrency', 'bitcoin', 'ethereum', 'solana',
      'defi', 'nft', 'web3', 'crypto', 'trading', 'stock market',
      'financial data', 'accounting', 'bookkeeping', 'tax',
      'exchange rate', 'forex', 'portfolio',
      'prediction market', 'quant', 'derivatives', 'options pricing',
      'stock', 'market shift', 'vat', 'price movement',
      'sec filing', 'grant opportunity',
    ],
  },
  {
    id: 'maps-transport',
    label: 'Maps & Transport',
    labelFr: 'Cartes & Transport',
    group: 'general',
    keywords: [
      'google maps', 'openstreetmap', 'mapbox',
      'geocoding', 'directions', 'route planning',
      'public transport', 'public transit', 'subway', 'metro',
      'bus schedule', 'train schedule', 'train status',
      'arrival time', 'station arrival', 'service alert',
      'traffic', 'navigation', 'location data',
    ],
  },
  {
    id: 'entertainment',
    label: 'Entertainment & Games',
    labelFr: 'Loisirs & Jeux',
    group: 'general',
    keywords: [
      'video game', 'board game', 'dungeons & dragons', 'd&d ', 'tabletop rpg',
      'anime', 'manga', 'superhero', 'comic book',
      'movie', 'tv show', 'series', 'streaming platform',
      'spotify', 'music streaming',
      'sports score', 'match result', 'fantasy league',
      'puzzle', 'trivia', 'quiz game',
      'boardgamegeek', 'adventure game',
    ],
  },
  {
    id: 'other',
    label: 'Other',
    labelFr: 'Autre',
    group: 'general',
    keywords: [],
  },
]

/** Map from category ID to its definition */
export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c])) as Record<string, CategoryDef>

/**
 * Assign a single primary category to an MCP based on its name, description,
 * and tool names/descriptions. Uses weighted keyword matching with priority.
 */
export function inferPrimaryCategory(mcp: {
  name: string
  description?: string | null
  tools?: Array<{ name: string; description?: string | null }>
}): string {
  const nameLower = (mcp.name || '').toLowerCase()
  const descLower = (mcp.description || '').toLowerCase()
  const toolsText = (mcp.tools || [])
    .map(t => `${t.name} ${t.description || ''}`)
    .join(' ')
    .toLowerCase()

  // Name matches are worth 3x, description 2x, tools 1x
  let bestCategory = 'other'
  let bestScore = 0

  for (const cat of CATEGORIES) {
    if (cat.id === 'other') continue

    // Check anti-keywords first
    const fullText = `${nameLower} ${descLower}`
    if (cat.antiKeywords?.some(kw => fullText.includes(kw))) continue

    let score = 0
    for (const kw of cat.keywords) {
      if (nameLower.includes(kw)) score += 3
      if (descLower.includes(kw)) score += 2
      if (toolsText.includes(kw)) score += 1
    }

    if (score > bestScore) {
      bestScore = score
      bestCategory = cat.id
    }
  }

  return bestCategory
}

/** Get the group for a category ID */
export function getCategoryGroup(categoryId: string): CategoryGroup {
  return CATEGORY_MAP[categoryId]?.group || 'general'
}
