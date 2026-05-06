import { NextResponse } from 'next/server'
import { getIssuer, getResourceUrl, SUPPORTED_SCOPE } from '@/lib/oauth'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(
    {
      resource: getResourceUrl(),
      authorization_servers: [getIssuer()],
      scopes_supported: [SUPPORTED_SCOPE],
      bearer_methods_supported: ['header'],
      resource_documentation: `${getIssuer()}/mcp-search`,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}
