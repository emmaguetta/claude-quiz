import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://claudequiz.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // AI crawlers — explicitly allow
      { userAgent: 'GPTBot', allow: '/', disallow: ['/login', '/onboarding', '/admin/', '/api/', '/auth/'] },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: ['/login', '/onboarding', '/admin/', '/api/', '/auth/'] },
      { userAgent: 'ClaudeBot', allow: '/', disallow: ['/login', '/onboarding', '/admin/', '/api/', '/auth/'] },
      { userAgent: 'Claude-Web', allow: '/', disallow: ['/login', '/onboarding', '/admin/', '/api/', '/auth/'] },
      { userAgent: 'PerplexityBot', allow: '/', disallow: ['/login', '/onboarding', '/admin/', '/api/', '/auth/'] },
      { userAgent: 'Applebot-Extended', allow: '/', disallow: ['/login', '/onboarding', '/admin/', '/api/', '/auth/'] },
      { userAgent: 'Google-Extended', allow: '/', disallow: ['/login', '/onboarding', '/admin/', '/api/', '/auth/'] },
      { userAgent: 'cohere-ai', allow: '/', disallow: ['/login', '/onboarding', '/admin/', '/api/', '/auth/'] },
      // Default
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/login', '/onboarding', '/mcp-search/saved', '/admin/', '/api/', '/auth/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
