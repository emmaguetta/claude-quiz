import { NextResponse } from 'next/server'
import { loadMcpCategories } from '@/lib/mcp/categories-data'

export async function GET() {
  try {
    const payload = await loadMcpCategories()
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
