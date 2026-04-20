/**
 * Fetch GitHub stars for all MCPs with a valid GitHub repo URL
 * and update the database.
 *
 * Usage: npx tsx scripts/fetch-github-stars.ts
 *
 * Requires: GITHUB_TOKEN env var (optional but recommended for rate limits)
 *           SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const BATCH_SIZE = 50
const DELAY_MS = 1000 // 1s between batches to respect rate limits

function extractOwnerRepo(url: string): string | null {
  try {
    const match = url.match(/github\.com\/([^/]+\/[^/#?]+)/)
    if (!match) return null
    return match[1].replace(/\.git$/, '').replace(/#.*$/, '')
  } catch {
    return null
  }
}

async function fetchStars(ownerRepo: string): Promise<number | null> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'mcp-stars-fetcher',
  }
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${ownerRepo}`, { headers })
    if (res.status === 404) return null
    if (res.status === 403 || res.status === 429) {
      console.warn(`Rate limited. Waiting 60s...`)
      await new Promise(r => setTimeout(r, 60000))
      return fetchStars(ownerRepo) // retry once
    }
    if (!res.ok) return null
    const data = await res.json()
    return data.stargazers_count ?? null
  } catch {
    return null
  }
}

async function main() {
  console.log('Fetching MCPs with GitHub URLs...')

  // Fetch all in pages of 1000 (Supabase default limit)
  let allMcps: { id: string; name: string; repo_url: string | null; github_stars: number }[] = []
  let page = 0
  const PAGE_SIZE = 1000
  while (true) {
    const { data: batch, error: batchErr } = await supabase
      .from('mcps')
      .select('id, name, repo_url, github_stars')
      .like('repo_url', 'https://github.com/%/%')
      .neq('repo_url', 'https://github.com/')
      .eq('github_stars', 0)
      .order('use_count', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (batchErr || !batch || batch.length === 0) break
    allMcps = allMcps.concat(batch)
    if (batch.length < PAGE_SIZE) break
    page++
  }
  const mcps = allMcps
  const error = null

  if (error || !mcps) {
    console.error('Failed to fetch MCPs:', error)
    process.exit(1)
  }

  console.log(`Found ${mcps.length} MCPs with GitHub repos`)

  let updated = 0
  let failed = 0

  for (let i = 0; i < mcps.length; i += BATCH_SIZE) {
    const batch = mcps.slice(i, i + BATCH_SIZE)

    const results = await Promise.all(
      batch.map(async (mcp) => {
        const ownerRepo = extractOwnerRepo(mcp.repo_url!)
        if (!ownerRepo) return { id: mcp.id, stars: null }
        const stars = await fetchStars(ownerRepo)
        return { id: mcp.id, stars, name: mcp.name, ownerRepo }
      })
    )

    // Update DB
    for (const r of results) {
      if (r.stars !== null && r.stars !== undefined) {
        const { error: updateErr } = await supabase
          .from('mcps')
          .update({ github_stars: r.stars })
          .eq('id', r.id)

        if (updateErr) {
          console.error(`  Failed to update ${r.name}: ${updateErr.message}`)
          failed++
        } else {
          if (r.stars > 0) console.log(`  ✓ ${r.name} → ${r.stars} stars`)
          updated++
        }
      } else {
        failed++
      }
    }

    console.log(`Progress: ${Math.min(i + BATCH_SIZE, mcps.length)}/${mcps.length} (${updated} updated, ${failed} failed)`)

    if (i + BATCH_SIZE < mcps.length) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  console.log(`\nDone! Updated ${updated} MCPs, ${failed} failed.`)
}

main()
