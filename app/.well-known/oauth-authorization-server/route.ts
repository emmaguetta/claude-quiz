import { NextResponse } from 'next/server'
import { getIssuer, SUPPORTED_SCOPE } from '@/lib/oauth'

export const runtime = 'nodejs'

export async function GET() {
  const issuer = getIssuer()
  return NextResponse.json(
    {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/api/oauth/token`,
      registration_endpoint: `${issuer}/api/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: [SUPPORTED_SCOPE],
      service_documentation: `${issuer}/mcp-search`,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}
