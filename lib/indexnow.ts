const KEY = '4bbf557176d232ce91df947ea95cfbe9'
const HOST = 'claudequiz.app'

export async function pingIndexNow(urls: string[]) {
  if (urls.length === 0) return { ok: true, skipped: true }
  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: `https://${HOST}/${KEY}.txt`,
        urlList: urls,
      }),
    })
    return { ok: res.ok, status: res.status }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
