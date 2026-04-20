/**
 * MCP tool-brand taxonomy — orthogonal axis to categories.
 *
 * An MCP can match 0, 1 or multiple tools. Tool tags are used as a secondary
 * filter combinable with use-case categories (e.g. category=social-media + tool=linkedin).
 *
 * Matching is strict: we only tag a brand when a distinctive keyword appears in
 * the MCP name or description. Tool-level text is ignored to avoid false positives
 * (many generic MCPs mention e.g. "Google" in tool descriptions without being Google tools).
 */

export type ToolTagDef = {
  id: string
  label: string
  /** Words that must match in name or description (lowercased, word-boundary aware). */
  keywords: string[]
  /** If a keyword matches here, skip this tag even if keywords matched. */
  antiKeywords?: string[]
}

export const TOOL_TAGS: ToolTagDef[] = [
  // ── Big tech platforms ──
  {
    id: 'google',
    label: 'Google',
    keywords: [
      'google drive', 'google calendar', 'google sheets', 'google slides',
      'google docs', 'google meet', 'google maps', 'google analytics',
      'google ads', 'google search', 'google tasks', 'google workspace',
      'gmail', 'gemini', 'bigquery', 'google cloud',
    ],
  },
  {
    id: 'microsoft',
    label: 'Microsoft',
    keywords: [
      'microsoft teams', 'microsoft outlook', 'microsoft excel',
      'microsoft word', 'microsoft powerpoint', 'onedrive', 'onenote',
      'sharepoint', 'azure ', 'microsoft graph', 'bing search',
      'microsoft 365', 'office 365',
    ],
  },
  {
    id: 'apple',
    label: 'Apple',
    keywords: ['icloud', 'apple music', 'apple notes', 'apple calendar', 'apple mail'],
  },

  // ── Social & messaging ──
  { id: 'linkedin', label: 'LinkedIn', keywords: ['linkedin'] },
  { id: 'facebook', label: 'Facebook', keywords: ['facebook'] },
  { id: 'instagram', label: 'Instagram', keywords: ['instagram'] },
  { id: 'whatsapp', label: 'WhatsApp', keywords: ['whatsapp'] },
  { id: 'twitter', label: 'X (Twitter)', keywords: ['twitter', 'x.com', 'tweet'] },
  { id: 'tiktok', label: 'TikTok', keywords: ['tiktok'] },
  { id: 'youtube', label: 'YouTube', keywords: ['youtube'] },
  { id: 'reddit', label: 'Reddit', keywords: ['reddit', 'subreddit'] },
  { id: 'pinterest', label: 'Pinterest', keywords: ['pinterest'] },
  { id: 'discord', label: 'Discord', keywords: ['discord'] },
  { id: 'slack', label: 'Slack', keywords: ['slack'] },
  { id: 'telegram', label: 'Telegram', keywords: ['telegram'] },
  { id: 'zoom', label: 'Zoom', keywords: ['zoom'] },

  // ── Dev platforms ──
  { id: 'github', label: 'GitHub', keywords: ['github'] },
  { id: 'gitlab', label: 'GitLab', keywords: ['gitlab'] },
  { id: 'bitbucket', label: 'Bitbucket', keywords: ['bitbucket'] },
  { id: 'vercel', label: 'Vercel', keywords: ['vercel'] },
  { id: 'cloudflare', label: 'Cloudflare', keywords: ['cloudflare'] },
  { id: 'netlify', label: 'Netlify', keywords: ['netlify'] },
  { id: 'aws', label: 'AWS', keywords: ['aws ', 'amazon web services', ' s3 ', 'dynamodb', 'lambda function'] },
  { id: 'docker', label: 'Docker', keywords: ['docker'] },
  { id: 'kubernetes', label: 'Kubernetes', keywords: ['kubernetes', 'k8s'] },
  { id: 'supabase', label: 'Supabase', keywords: ['supabase'] },

  // ── Productivity / work ──
  { id: 'notion', label: 'Notion', keywords: ['notion'] },
  { id: 'jira', label: 'Jira', keywords: ['jira', 'atlassian'] },
  { id: 'confluence', label: 'Confluence', keywords: ['confluence'] },
  { id: 'linear', label: 'Linear', keywords: ['linear app', 'linear.app', 'linear issue'] },
  { id: 'asana', label: 'Asana', keywords: ['asana'] },
  { id: 'trello', label: 'Trello', keywords: ['trello'] },
  { id: 'airtable', label: 'Airtable', keywords: ['airtable'] },
  { id: 'monday', label: 'Monday.com', keywords: ['monday.com'] },
  { id: 'clickup', label: 'ClickUp', keywords: ['clickup'] },
  { id: 'calendly', label: 'Calendly', keywords: ['calendly'] },
  { id: 'figma', label: 'Figma', keywords: ['figma'] },
  { id: 'canva', label: 'Canva', keywords: ['canva'] },

  // ── Commerce / payment ──
  { id: 'shopify', label: 'Shopify', keywords: ['shopify'] },
  { id: 'stripe', label: 'Stripe', keywords: ['stripe'] },
  { id: 'square', label: 'Square', keywords: [' square '] },
  { id: 'paypal', label: 'PayPal', keywords: ['paypal'] },
  { id: 'woocommerce', label: 'WooCommerce', keywords: ['woocommerce'] },

  // ── AI providers ──
  { id: 'anthropic', label: 'Anthropic / Claude', keywords: ['anthropic', 'claude '] },
  { id: 'openai', label: 'OpenAI / GPT', keywords: ['openai', 'chatgpt', 'gpt-'] },
  { id: 'huggingface', label: 'Hugging Face', keywords: ['huggingface', 'hugging face'] },
  { id: 'replicate', label: 'Replicate', keywords: ['replicate'] },
  { id: 'perplexity', label: 'Perplexity', keywords: ['perplexity'] },
  { id: 'mistral', label: 'Mistral', keywords: ['mistral'] },

  // ── Data / CRM ──
  { id: 'hubspot', label: 'HubSpot', keywords: ['hubspot'] },
  { id: 'salesforce', label: 'Salesforce', keywords: ['salesforce'] },
  { id: 'attio', label: 'Attio', keywords: ['attio'] },
  { id: 'intercom', label: 'Intercom', keywords: ['intercom'] },
  { id: 'zendesk', label: 'Zendesk', keywords: ['zendesk'] },

  // ── Email ──
  { id: 'sendgrid', label: 'SendGrid', keywords: ['sendgrid'] },
  { id: 'resend', label: 'Resend', keywords: ['resend'] },
  { id: 'mailchimp', label: 'Mailchimp', keywords: ['mailchimp'] },
]

export const TOOL_MAP = Object.fromEntries(TOOL_TAGS.map(t => [t.id, t])) as Record<string, ToolTagDef>

/**
 * Infer the set of tool tags that apply to an MCP.
 * Returns an array of tool IDs (possibly empty).
 */
export function inferToolTags(mcp: {
  name: string
  description?: string | null
}): string[] {
  const haystack = `${mcp.name || ''} ${mcp.description || ''}`.toLowerCase()
  if (!haystack.trim()) return []

  const matched: string[] = []
  for (const tag of TOOL_TAGS) {
    if (tag.antiKeywords?.some(kw => haystack.includes(kw))) continue
    if (tag.keywords.some(kw => haystack.includes(kw))) matched.push(tag.id)
  }
  return matched
}
