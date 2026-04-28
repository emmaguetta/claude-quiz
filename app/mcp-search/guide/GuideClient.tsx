'use client'

import Link from 'next/link'
import { useLocale } from '@/components/LocaleProvider'
import { LocaleToggle } from '@/components/LocaleToggle'
import { Badge } from '@/components/ui/badge'
import { CodeBlock } from '@/components/mcp-guide/CodeBlock'
import {
  getGuideContent,
  buildHttpConfigAnonymous,
  buildHttpConfigWithKey,
  buildCliCommandAnonymous,
} from './content'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://claudequiz.app'
const MCP_URL = `${SITE_URL}/api/mcp`

export function GuideClient() {
  const { locale } = useLocale()
  const c = getGuideContent(locale)
  const anonymousConfig = buildHttpConfigAnonymous(MCP_URL)
  const authenticatedConfig = buildHttpConfigWithKey(MCP_URL)
  const cliCommand = buildCliCommandAnonymous(MCP_URL)

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-900">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/mcp-search" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            {c.navBack}
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              {c.navHome}
            </Link>
            <LocaleToggle />
          </div>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <header className="space-y-4 mb-12">
          <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/15">
            {c.badge}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{c.heroTitle}</h1>
          <p className="text-lg text-zinc-400 leading-relaxed">{c.heroSubtitle}</p>
        </header>

        <Section anchor="what" title={c.whatTitle}>
          <p>
            {c.whatPara1Before}
            <strong>{c.whatPara1Strong}</strong>
            {c.whatPara1Middle}
            <strong>{c.whatPara1Stat}</strong>
            {c.whatPara1After}
          </p>
          <p>{c.whatPara2}</p>
          <ul className="list-disc list-inside space-y-1 text-zinc-300">
            <li>
              <code className="text-amber-300">search_mcps</code> : {c.toolSearchDesc}
            </li>
            <li>
              <code className="text-amber-300">get_mcp_details</code> : {c.toolDetailsDesc}
            </li>
            <li>
              <code className="text-amber-300">start_login</code> : {c.toolLoginDesc}
            </li>
          </ul>
        </Section>

        <Section anchor="add" title={c.addTitle} stepNumber={1}>
          <p>
            {c.addIntroBefore}
            <strong>{c.addIntroFreeStrong}</strong>
            {c.addIntroAfter}
          </p>

          <h3 className="text-zinc-200 font-semibold pt-2">{c.addClaudeCode}</h3>
          <p className="text-sm">
            {c.addClaudeCodePathBefore}
            <code className="text-amber-300">{c.addClaudeCodePath}</code>
            {c.addClaudeCodePathAfter}
          </p>
          <CodeBlock code={anonymousConfig} lang="json" title="~/.claude.json" />
          <p className="text-sm text-zinc-500">{c.addClaudeCodeNote}</p>

          <h3 className="text-zinc-200 font-semibold pt-4">{c.addClaudeDesktop}</h3>
          <p className="text-sm">
            {c.addClaudeDesktopPathBefore}
            <code className="text-amber-300">{c.addClaudeDesktopMacPath}</code>
            {c.addClaudeDesktopPathMiddle}
            <code className="text-amber-300">{c.addClaudeDesktopWinPath}</code>
            {c.addClaudeDesktopPathAfter}
          </p>
          <CodeBlock code={anonymousConfig} lang="json" title="claude_desktop_config.json" />
          <p className="text-sm text-zinc-500">{c.addClaudeDesktopNote}</p>

          <h3 className="text-zinc-200 font-semibold pt-4">{c.addCursor}</h3>
          <p className="text-sm">
            {c.addCursorPathBefore}
            <code className="text-amber-300">{c.addCursorPath}</code>
            {c.addCursorPathAfter}
          </p>
          <CodeBlock code={anonymousConfig} lang="json" title="~/.cursor/mcp.json" />
          <p className="text-sm text-zinc-500">
            {c.addCursorNoteBefore}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs">
              {c.addCursorNoteShortcut}
            </kbd>
            {c.addCursorNoteMiddle}
            <em>{c.addCursorNoteAction}</em>
            {c.addCursorNoteAfter}
          </p>

          <h3 className="text-zinc-200 font-semibold pt-4">{c.addCli}</h3>
          <p className="text-sm">{c.addCliDesc}</p>
          <CodeBlock code={cliCommand} lang="bash" title="terminal" />
        </Section>

        <Section anchor="unlock" title={c.unlockTitle} stepNumber={2}>
          <p>{c.unlockDesc}</p>
          <Link
            href="/mcp-setup"
            className="inline-flex items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-2.5 text-sm font-semibold hover:bg-amber-500/20 transition-colors"
          >
            {c.unlockCtaText}
          </Link>
          <p className="pt-3">
            {c.unlockHowToBefore}
            <strong>{c.unlockHowToStrong}</strong>
            {c.unlockHowToAfter}
          </p>
          <CodeBlock code={authenticatedConfig} lang="json" title="~/.claude.json" />
        </Section>

        <Section anchor="firstprompt" title={c.firstPromptTitle} stepNumber={3}>
          <p>{c.firstPromptIntro}</p>
          <ChatExample
            user={c.firstPromptUser}
            assistant={c.firstPromptAssistant}
            speakerYou={c.speakerYou}
            speakerClaude={c.speakerClaude}
          />
          <p className="text-sm text-zinc-500">
            {c.firstPromptNoteBefore}
            <code>{c.firstPromptNoteCode}</code>
            {c.firstPromptNoteAfter}
          </p>
        </Section>

        <Section anchor="tools" title={c.toolsRefTitle}>
          <ToolDoc
            name="search_mcps"
            description={c.toolSearchSummary}
            params={c.toolSearchParams}
            paramsLabel={c.toolsParams}
            noParamsLabel={c.toolsNoParams}
          />
          <ToolDoc
            name="get_mcp_details"
            description={c.toolDetailsSummary}
            params={c.toolDetailsParams}
            paramsLabel={c.toolsParams}
            noParamsLabel={c.toolsNoParams}
          />
          <ToolDoc
            name="start_login"
            description={c.toolLoginSummary}
            params={[]}
            paramsLabel={c.toolsParams}
            noParamsLabel={c.toolsNoParams}
          />
        </Section>

        <Section anchor="examples" title={c.examplesTitle}>
          <div className="space-y-3">
            {c.examplesPrompts.map((p, i) => (
              <PromptExample key={i} text={p} />
            ))}
          </div>
        </Section>

        <Section anchor="trouble" title={c.troubleTitle}>
          <Faq q={c.troubleQ1} a={<p>{c.troubleA1}</p>} />
          <Faq
            q={c.troubleQ2}
            a={
              <p>
                {c.troubleA2Before}
                <code>{c.troubleA2Code}</code>
                {c.troubleA2After}
              </p>
            }
          />
          <Faq
            q={c.troubleQ3}
            a={
              <p>
                {c.troubleA3Before}
                <Link href="/mcp-setup" className="text-amber-300 hover:text-amber-200 underline">
                  {c.troubleA3CtaText}
                </Link>
                {c.troubleA3After}
              </p>
            }
          />
          <Faq q={c.troubleQ4} a={<p>{c.troubleA4}</p>} />
        </Section>

        <Section anchor="security" title={c.securityTitle}>
          <ul className="list-disc list-inside space-y-1 text-zinc-300">
            <li>{c.securityItem1}</li>
            <li>{c.securityItem2}</li>
            <li>{c.securityItem3}</li>
            <li>{c.securityItem4}</li>
          </ul>
        </Section>

        <div className="mt-14 pt-8 border-t border-zinc-900 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
          <Link
            href="/mcp-search"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 px-5 py-2.5 text-sm font-semibold hover:bg-white transition-colors"
          >
            {c.ctaTrySearch}
          </Link>
          <Link
            href="/faq"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-300 px-5 py-2.5 text-sm hover:border-zinc-600 hover:text-zinc-100 transition-colors"
          >
            {c.ctaFaq}
          </Link>
        </div>
      </article>
    </main>
  )
}

function Section({
  anchor,
  title,
  stepNumber,
  children,
}: {
  anchor: string
  title: string
  stepNumber?: number
  children: React.ReactNode
}) {
  return (
    <section
      id={anchor}
      className="scroll-mt-20 space-y-3 pb-12 border-b border-zinc-900 mb-12 last:border-0 last:mb-0 last:pb-0"
    >
      <h2 className="flex items-center gap-3 text-2xl font-bold text-zinc-50">
        {stepNumber !== undefined && (
          <span className="flex shrink-0 w-8 h-8 rounded-full border border-amber-500/30 bg-amber-500/10 items-center justify-center text-sm text-amber-300 font-mono">
            {stepNumber}
          </span>
        )}
        {title}
      </h2>
      <div className="text-zinc-300 leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

function ToolDoc({
  name,
  description,
  params,
  paramsLabel,
  noParamsLabel,
}: {
  name: string
  description: string
  params: Array<{ key: string; type: string; desc: string }>
  paramsLabel: string
  noParamsLabel: string
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
      <div>
        <code className="text-amber-300 font-mono text-base">{name}</code>
        <p className="text-zinc-400 text-sm mt-1">{description}</p>
      </div>
      {params.length > 0 ? (
        <div className="space-y-2 text-sm">
          <div className="text-xs uppercase tracking-wider text-zinc-500">{paramsLabel}</div>
          <ul className="space-y-1.5">
            {params.map(p => (
              <li key={p.key} className="flex flex-col sm:flex-row sm:gap-3">
                <code className="text-zinc-200 shrink-0 sm:w-32">{p.key}</code>
                <span className="text-zinc-500 sm:w-48 shrink-0 text-xs sm:text-sm">{p.type}</span>
                <span className="text-zinc-400">{p.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">{noParamsLabel}</p>
      )}
    </div>
  )
}

function ChatExample({
  user,
  assistant,
  speakerYou,
  speakerClaude,
}: {
  user: string
  assistant: string
  speakerYou: string
  speakerClaude: string
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/60">
        <div className="text-xs text-zinc-500 mb-1">{speakerYou}</div>
        <div className="text-sm text-zinc-100">{user}</div>
      </div>
      <div className="px-4 py-3">
        <div className="text-xs text-amber-300/80 mb-1">{speakerClaude}</div>
        <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">
          {assistant}
        </pre>
      </div>
    </div>
  )
}

function PromptExample({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-sm text-zinc-300 font-mono">
      {text}
    </div>
  )
}

function Faq({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <details className="rounded-lg border border-zinc-800 bg-zinc-900/30 group">
      <summary className="cursor-pointer px-4 py-3 text-zinc-100 font-medium flex items-center justify-between gap-3 list-none">
        <span>{q}</span>
        <span className="text-zinc-500 group-open:rotate-90 transition-transform shrink-0">›</span>
      </summary>
      <div className="px-4 pb-4 pt-1 text-sm text-zinc-300 leading-relaxed space-y-2">{a}</div>
    </details>
  )
}
