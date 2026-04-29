'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLocale } from '@/components/LocaleProvider'
import { LocaleToggle } from '@/components/LocaleToggle'

type ExistingKey = {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt: string | null
}

type GeneratedKey = {
  id: string
  name: string
  prefix: string
  rawKey: string
  createdAt: string
}

const T = {
  fr: {
    back: '← Recherche MCP',
    home: 'Accueil',
    title: 'Passer en illimité',
    subtitle:
      'Tu as utilisé tes 3 recherches gratuites, ou tu sais que tu vas l’utiliser souvent ? Génère une clé API et ajoute-la à ta config Claude pour passer en illimité.',
    accountLabel: 'Connecté en tant que',
    generateTitle: 'Générer une clé API',
    generateDesc:
      'La clé est affichée une seule fois. Note-la dans un gestionnaire de mots de passe ou colle-la directement dans ta config.',
    namePlaceholder: 'Nom (ex: laptop perso)',
    generate: 'Générer la clé',
    generating: 'Génération…',
    revoking: 'Révocation…',
    keyShownOnceTitle: 'Clé créée, copie-la maintenant',
    keyShownOnceDesc:
      'Tu ne reverras pas cette clé. Si tu la perds, génère-en une nouvelle et révoque l’ancienne.',
    copied: '✓ Copié',
    copy: 'Copier',
    snippetTitle: 'Config à coller dans ton client MCP',
    snippetClaudeCode: 'Claude Code (~/.claude.json)',
    snippetCli: 'Ou via la CLI :',
    keysListTitle: 'Tes clés actives',
    keysListEmpty: 'Aucune clé encore. Génère-en une ci-dessus.',
    keyCreated: 'créée',
    keyLastUsed: 'utilisée',
    keyNeverUsed: 'jamais utilisée',
    revoke: 'Révoquer',
    confirmRevoke: 'Révoquer cette clé ? Tout client qui l’utilise sera déconnecté.',
    error: 'Erreur',
    learnMore: 'Voir le guide complet →',
  },
  en: {
    back: '← MCP Search',
    home: 'Home',
    title: 'Go unlimited',
    subtitle:
      "Used up your 3 free searches, or know you'll be using this often? Generate an API key and add it to your Claude config to go unlimited.",
    accountLabel: 'Signed in as',
    generateTitle: 'Generate an API key',
    generateDesc:
      'The key is shown ONCE. Save it in a password manager or paste it directly into your config.',
    namePlaceholder: 'Name (e.g. personal laptop)',
    generate: 'Generate key',
    generating: 'Generating…',
    revoking: 'Revoking…',
    keyShownOnceTitle: 'Key created, copy it now',
    keyShownOnceDesc:
      "You won't see this key again. If you lose it, generate a new one and revoke the old one.",
    copied: '✓ Copied',
    copy: 'Copy',
    snippetTitle: 'Snippet for your MCP client config',
    snippetClaudeCode: 'Claude Code (~/.claude.json)',
    snippetCli: 'Or via the CLI:',
    keysListTitle: 'Your active keys',
    keysListEmpty: 'No keys yet. Generate one above.',
    keyCreated: 'created',
    keyLastUsed: 'last used',
    keyNeverUsed: 'never used',
    revoke: 'Revoke',
    confirmRevoke: 'Revoke this key? Any client using it will be disconnected.',
    error: 'Error',
    learnMore: 'See the full guide →',
  },
}

export function McpSetupClient({ userEmail, mcpUrl }: { userEmail: string; mcpUrl: string }) {
  const { locale } = useLocale()
  const t = T[locale]
  const [keys, setKeys] = useState<ExistingKey[]>([])
  const [name, setName] = useState('')
  const [generated, setGenerated] = useState<GeneratedKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  async function fetchKeys() {
    const res = await fetch('/api/mcp/v1/auth/list-keys')
    if (res.ok) {
      const data = await res.json()
      setKeys(data.keys ?? [])
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  async function handleGenerate() {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/mcp/v1/auth/generate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Unknown error')
        return
      }
      setGenerated(data)
      setName('')
      fetchKeys()
    } catch (err) {
      setErrorMsg(String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm(t.confirmRevoke)) return
    setRevokingId(id)
    try {
      await fetch('/api/mcp/v1/auth/revoke-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      fetchKeys()
    } finally {
      setRevokingId(null)
    }
  }

  async function copyText(text: string, marker: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(marker)
      setTimeout(() => setCopiedKey(null), 1800)
    } catch {
      // ignore
    }
  }

  const snippet = generated
    ? buildSnippet(mcpUrl, generated.rawKey)
    : null
  const cliCommand = generated
    ? `claude mcp add --transport http mcp-search ${mcpUrl} --header "Authorization: Bearer ${generated.rawKey}"`
    : null

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-900">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/mcp-search" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            {t.back}
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              {t.home}
            </Link>
            <LocaleToggle />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14 space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{t.title}</h1>
          <p className="text-zinc-400 leading-relaxed">{t.subtitle}</p>
          <div className="text-sm text-zinc-500 pt-2">
            {t.accountLabel} <span className="text-zinc-300 font-mono">{userEmail}</span>
          </div>
        </header>

        <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">{t.generateTitle}</h2>
          <p className="text-sm text-zinc-400">{t.generateDesc}</p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              maxLength={50}
              className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 flex-1"
            />
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-zinc-100 text-zinc-900 hover:bg-white font-semibold"
            >
              {loading ? t.generating : t.generate}
            </Button>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-400">
              {t.error}: {errorMsg}
            </p>
          )}
        </section>

        {generated && snippet && cliCommand && (
          <section className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.05] p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-amber-200">⚠ {t.keyShownOnceTitle}</h2>
            <p className="text-sm text-zinc-300">{t.keyShownOnceDesc}</p>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 sm:p-4 flex items-center justify-between gap-3">
              <code className="text-amber-300 text-xs sm:text-sm font-mono break-all flex-1">
                {generated.rawKey}
              </code>
              <button
                onClick={() => copyText(generated.rawKey, 'raw')}
                className="text-xs text-zinc-400 hover:text-zinc-100 shrink-0 px-2 py-1 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                {copiedKey === 'raw' ? t.copied : t.copy}
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">{t.snippetClaudeCode}</span>
                <button
                  onClick={() => copyText(snippet, 'snippet')}
                  className="text-zinc-500 hover:text-zinc-200"
                >
                  {copiedKey === 'snippet' ? t.copied : t.copy}
                </button>
              </div>
              <pre className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 sm:p-4 overflow-x-auto text-xs sm:text-sm">
                <code className="font-mono text-zinc-200 whitespace-pre">{snippet}</code>
              </pre>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">{t.snippetCli}</span>
                <button
                  onClick={() => copyText(cliCommand, 'cli')}
                  className="text-zinc-500 hover:text-zinc-200"
                >
                  {copiedKey === 'cli' ? t.copied : t.copy}
                </button>
              </div>
              <pre className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 sm:p-4 overflow-x-auto text-xs sm:text-sm">
                <code className="font-mono text-zinc-200 whitespace-pre-wrap break-all">{cliCommand}</code>
              </pre>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t.keysListTitle}</h2>
          {keys.length === 0 ? (
            <p className="text-sm text-zinc-500">{t.keysListEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {keys.map(k => (
                <li
                  key={k.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-zinc-100 font-medium truncate">{k.name}</div>
                    <div className="text-xs text-zinc-500 font-mono">{k.prefix}…</div>
                    <div className="text-xs text-zinc-600 mt-1">
                      {t.keyCreated} {new Date(k.createdAt).toLocaleDateString(locale)} ·{' '}
                      {k.lastUsedAt
                        ? `${t.keyLastUsed} ${new Date(k.lastUsedAt).toLocaleDateString(locale)}`
                        : t.keyNeverUsed}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRevoke(k.id)}
                    disabled={revokingId === k.id}
                    variant="outline"
                    className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-red-500/40 hover:text-red-300 shrink-0"
                  >
                    {revokingId === k.id ? t.revoking : t.revoke}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="pt-4 border-t border-zinc-900">
          <Link
            href="/mcp-search/guide"
            className="text-sm text-zinc-400 hover:text-zinc-100"
          >
            {t.learnMore}
          </Link>
        </div>
      </div>
    </main>
  )
}

function buildSnippet(mcpUrl: string, key: string): string {
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
