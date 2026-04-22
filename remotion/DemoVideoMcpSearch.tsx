import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont as loadGeist } from '@remotion/google-fonts/Geist';
import Aurora from './Aurora';

const { fontFamily: geistFamily } = loadGeist();

export const FPS = 30;

// Scene durations
const HERO_DURATION = 3.5 * FPS;
const SEARCH_DURATION = 5 * FPS;
const RESULTS_DURATION = 6 * FPS;
const PROFILES_DURATION = 5 * FPS;
const TOOLS_DURATION = 4 * FPS;
const OUTRO_DURATION = 3.5 * FPS;

export const DURATION_IN_FRAMES =
  HERO_DURATION +
  SEARCH_DURATION +
  RESULTS_DURATION +
  PROFILES_DURATION +
  TOOLS_DURATION +
  OUTRO_DURATION;

const BlackBg: React.FC = () => (
  <AbsoluteFill style={{ background: '#09090b' }} />
);

// ─── Scene 1: Hero ───────────────────────────────────────────────────────────
const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = spring({ frame, fps, config: { damping: 14 } });
  const subOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: '#09090b' }}>
        <Aurora
          colorStops={['#8b5cf6', '#6366f1', '#3b82f6']}
          amplitude={1.4}
          blend={0.7}
          speed={0.8}
          width={1920}
          height={1080}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: `${geistFamily}, -apple-system, sans-serif`,
          color: '#fafafa',
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: '#a78bfa',
            marginBottom: 20,
            opacity: titleY,
            fontWeight: 500,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          MCP Search Engine
        </div>
        <h1
          style={{
            fontSize: 96,
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.1,
            transform: `translateY(${(1 - titleY) * 40}px)`,
            opacity: titleY,
            fontWeight: 700,
            maxWidth: 1200,
          }}
        >
          Trouve le MCP parfait
        </h1>
        <p
          style={{
            fontSize: 32,
            color: '#c4b5fd',
            marginTop: 24,
            opacity: subOpacity,
            textAlign: 'center',
          }}
        >
          Recherche sémantique sur 4 764 MCPs · 32 347 outils
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene 2: Search typing ──────────────────────────────────────────────────
const SearchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const query = 'comment linkedin post';
  const typedChars = Math.min(
    query.length,
    Math.floor(interpolate(frame, [0, query.length * 3.5], [0, query.length], {
      extrapolateRight: 'clamp',
    }))
  );
  const typedText = query.slice(0, typedChars);
  const cursorVisible = frame % 30 < 20;

  const typingDone = typedChars >= query.length;
  const thinkingOpacity = typingDone
    ? interpolate(frame, [query.length * 3.5 + 10, query.length * 3.5 + 25], [0, 1], {
        extrapolateRight: 'clamp',
      })
    : 0;

  const headerOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: `${geistFamily}, -apple-system, sans-serif`,
        color: '#fafafa',
        padding: 80,
      }}
    >
      <div style={{ width: 1400 }}>
        <div style={{ marginBottom: 40, textAlign: 'center', opacity: headerOpacity }}>
          <h2 style={{ fontSize: 44, margin: 0, fontWeight: 600 }}>
            Décris ce que tu veux faire
          </h2>
          <p style={{ fontSize: 24, color: '#71717a', marginTop: 12 }}>
            La recherche sémantique comprend ton intention
          </p>
        </div>

        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '20px 28px',
              background: 'rgba(24,24,27,0.9)',
              border: '1px solid #3f3f46',
              borderRadius: 16,
              fontSize: 26,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#71717a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: 16, flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span style={{ color: '#e4e4e7' }}>{typedText}</span>
            {cursorVisible && (
              <span
                style={{
                  width: 2,
                  height: 28,
                  background: '#a78bfa',
                  marginLeft: 2,
                  display: 'inline-block',
                }}
              />
            )}
          </div>
        </div>

        {thinkingOpacity > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              marginTop: 30,
              opacity: thinkingOpacity,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#8b5cf6',
                  opacity: 0.4 + 0.6 * Math.sin(frame * 0.3 + i),
                }}
              />
            ))}
            <span style={{ color: '#71717a', fontSize: 20, marginLeft: 8 }}>
              Recherche vectorielle en cours...
            </span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 3: Results ────────────────────────────────────────────────────────
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const results = [
    {
      name: 'LinkedIn MCP',
      description: 'Publie des posts LinkedIn avec images et contrôles de visibilité. Réagis aux posts, ajoute, modifie ou supprime des commentaires...',
      matchTool: 'Publier des posts LinkedIn avec images et contrôles de visibilité',
      pricing: 'free' as const,
      users: 0,
    },
    {
      name: 'LinkedDraft LinkedIn Content MCP Server',
      description: 'Serveur MCP pour la création de contenu LinkedIn, génération de posts, réécriture, idéation, voice training...',
      matchTool: 'Serveur MCP pour la création de contenu LinkedIn, posts...',
      pricing: 'freemium' as const,
      users: 0,
    },
    {
      name: 'PostPulse',
      description: 'PostPulse est une API unifiée qui gère la complexité de la publication sur les réseaux sociaux. Au lieu de...',
      matchTool: 'PostPulse est une API unifiée qui gère la complexité...',
      pricing: 'free' as const,
      verified: true,
      users: 0,
    },
    {
      name: 'hyperplexity',
      description: '# Hyperplexity **Verified Research Engine** · hyperplexity.ai · [Launch App]...',
      matchTool: '# Hyperplexity **Verified Research Engine** · [hyperplexity',
      pricing: 'paid' as const,
      users: 1,
    },
    {
      name: 'Autopilots by Dania.ai',
      description: 'Automatisation des réseaux sociaux avec IA. Publie, planifie, gère les campagnes, DMs, analytics et génère du média...',
      matchTool: 'Automatisation des réseaux sociaux avec IA...',
      pricing: 'free' as const,
      users: 0,
    },
    {
      name: 'Social-API.ai',
      description: 'SocialAPI donne aux agents IA un seul serveur MCP pour lire et répondre à chaque interaction sociale — commentaires,...',
      matchTool: 'SocialAPI donne aux agents IA un seul serveur MCP pour...',
      pricing: 'freemium' as const,
      users: 0,
    },
  ];

  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        fontFamily: `${geistFamily}, -apple-system, sans-serif`,
        color: '#fafafa',
        padding: '60px 80px',
      }}
    >
      <div style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 28,
            opacity: headerOpacity,
          }}
        >
          <span style={{ fontSize: 22, color: '#fbbf24' }}>✨</span>
          <span style={{ fontSize: 22, color: '#fbbf24', fontWeight: 500 }}>
            Résultats re-classés par IA
          </span>
          <span style={{ fontSize: 20, color: '#71717a', marginLeft: 12 }}>
            30 MCPs trouvés pour
          </span>
          <span
            style={{
              fontSize: 20,
              color: '#c4b5fd',
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.3)',
              padding: '4px 14px',
              borderRadius: 8,
              fontFamily: 'Geist Mono, monospace',
            }}
          >
            "comment linkedin post"
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {results.map((r, i) => {
            const delay = 5 + i * 6;
            const appear = spring({ frame: frame - delay, fps, config: { damping: 14 } });

            return (
              <div
                key={r.name}
                style={{
                  width: 'calc(50% - 8px)',
                  padding: '24px 28px',
                  background: 'rgba(24,24,27,0.85)',
                  border: '1px solid #27272a',
                  borderRadius: 16,
                  opacity: appear,
                  transform: `translateY(${(1 - appear) * 15}px)`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22, fontWeight: 600, color: '#fafafa' }}>{r.name}</span>
                  {r.verified && (
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="#10b981" strokeWidth="2" />
                      <path d="M9 12l2 2 4-4" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {r.pricing === 'freemium' && (
                    <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                      Freemium
                    </span>
                  )}
                  {r.pricing === 'paid' && (
                    <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 999, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                      Payant
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 16, color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>{r.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(39,39,42,0.6)', padding: '6px 12px', borderRadius: 8 }}>
                  <span style={{ color: '#71717a', fontSize: 13 }}>→</span>
                  <span style={{ fontSize: 14, color: '#a1a1aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.matchTool}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  {r.users > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: '#71717a' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      {r.users}
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, border: '1px solid #3f3f46', background: '#27272a', fontSize: 13, color: '#d4d4d8' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Site
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 4: Profile-based filtering ────────────────────────────────────────
const ProfilesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardAppear = spring({ frame, fps, config: { damping: 14 } });
  const isSelected = (at: number | null) => at !== null && frame >= at;

  const profiles = [
    {
      title: 'ENGINEERING',
      items: [
        { label: 'Dev Tools', count: 192, selectAt: null },
        { label: 'Databases', count: 136, selectAt: null },
        { label: 'Cloud & Infra', count: 111, selectAt: null },
        { label: 'Security', count: 114, selectAt: null },
        { label: 'AI & Agents', count: 386, selectAt: 25 },
      ],
    },
    {
      title: 'GO-TO-MARKET',
      items: [
        { label: 'Email', count: 49, selectAt: null },
        { label: 'Social Media', count: 118, selectAt: 40 },
        { label: 'Chat & Messaging', count: 54, selectAt: null },
        { label: 'CRM & Sales', count: 69, selectAt: 55 },
        { label: 'Content & CMS', count: 244, selectAt: null },
      ],
    },
    {
      title: 'PRODUCT',
      items: [
        { label: 'Productivity', count: 234, selectAt: null },
        { label: 'Analytics & Data', count: 136, selectAt: null },
        { label: 'Design & Media', count: 177, selectAt: null },
        { label: 'Knowledge & Research', count: 262, selectAt: null },
      ],
    },
  ];

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: `${geistFamily}, -apple-system, sans-serif`,
        color: '#fafafa',
        padding: 80,
      }}
    >
      <div
        style={{
          width: 1400,
          transform: `translateY(${(1 - cardAppear) * 40}px)`,
          opacity: cardAppear,
        }}
      >
        <h2 style={{ fontSize: 48, margin: 0, fontWeight: 600 }}>
          Trouve les MCPs adaptés à ton profil
        </h2>
        <p style={{ fontSize: 24, color: '#71717a', marginTop: 12 }}>
          Engineering · Go-to-Market · Product — explore par profil
        </p>

        <div style={{ marginTop: 36, display: 'flex', gap: 32 }}>
          {profiles.map((group) => (
            <div key={group.title} style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: '#71717a', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
                {group.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.items.map((item) => {
                  const selected = isSelected(item.selectAt);
                  return (
                    <div
                      key={item.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 18px',
                        borderRadius: 10,
                        background: selected ? 'rgba(139,92,246,0.12)' : 'rgba(39,39,42,0.3)',
                        border: `1px solid ${selected ? 'rgba(139,92,246,0.4)' : 'transparent'}`,
                      }}
                    >
                      <span style={{ fontSize: 20, color: selected ? '#c4b5fd' : '#d4d4d8', fontWeight: selected ? 500 : 400 }}>
                        {selected && <span style={{ color: '#8b5cf6', marginRight: 8 }}>●</span>}
                        {item.label}
                      </span>
                      <span style={{ fontSize: 16, color: selected ? '#a78bfa' : '#52525b', fontFamily: 'Geist Mono, monospace' }}>
                        {item.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '16px 24px',
            background: 'rgba(139,92,246,0.06)',
            border: '1px solid rgba(139,92,246,0.15)',
            borderRadius: 12,
            opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <span style={{ fontSize: 18, color: '#a78bfa', fontWeight: 600 }}>All</span>
          <span style={{ fontSize: 18, color: '#71717a' }}>·</span>
          <span style={{ fontSize: 18, color: '#fafafa', fontFamily: 'Geist Mono, monospace' }}>4 764</span>
          <span style={{ fontSize: 18, color: '#71717a' }}>MCPs indexés</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 5: Explore by tool ────────────────────────────────────────────────
const ToolsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardAppear = spring({ frame, fps, config: { damping: 14 } });

  const tools = [
    { name: 'create_post', mcp: 'LinkedIn MCP', color: '#3b82f6' },
    { name: 'send_email', mcp: 'Resend MCP', color: '#10b981' },
    { name: 'query_database', mcp: 'Supabase MCP', color: '#f59e0b' },
    { name: 'generate_image', mcp: 'Replicate MCP', color: '#ec4899' },
    { name: 'search_docs', mcp: 'Notion MCP', color: '#8b5cf6' },
    { name: 'deploy_site', mcp: 'Vercel MCP', color: '#fafafa' },
  ];

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: `${geistFamily}, -apple-system, sans-serif`,
        color: '#fafafa',
        padding: 80,
      }}
    >
      <div
        style={{
          width: 1300,
          transform: `translateY(${(1 - cardAppear) * 40}px)`,
          opacity: cardAppear,
        }}
      >
        <h2 style={{ fontSize: 48, margin: 0, fontWeight: 600 }}>
          Explore par outil
        </h2>
        <p style={{ fontSize: 24, color: '#71717a', marginTop: 12 }}>
          32 347 outils individuels à travers tous les MCPs
        </p>

        <div style={{ marginTop: 36, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {tools.map((tool, i) => {
            const delay = 10 + i * 8;
            const appear = spring({ frame: frame - delay, fps, config: { damping: 14 } });

            return (
              <div
                key={tool.name}
                style={{
                  width: 'calc(50% - 7px)',
                  padding: '22px 28px',
                  background: 'rgba(24,24,27,0.85)',
                  border: '1px solid #27272a',
                  borderRadius: 14,
                  opacity: appear,
                  transform: `translateX(${(1 - appear) * -15}px)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: tool.color, flexShrink: 0 }} />
                <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 22, color: '#fbbf24' }}>{tool.name}</span>
                <span style={{ color: '#52525b', fontSize: 18 }}>→</span>
                <span style={{ fontSize: 18, color: '#a1a1aa' }}>{tool.mcp}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 6: Outro ──────────────────────────────────────────────────────────
const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: '#09090b' }}>
        <Aurora
          colorStops={['#8b5cf6', '#6366f1', '#3b82f6']}
          amplitude={1.4}
          blend={0.7}
          speed={0.8}
          width={1920}
          height={1080}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: `${geistFamily}, -apple-system, sans-serif`,
          color: '#fafafa',
        }}
      >
        <h1
          style={{
            fontSize: 90,
            margin: 0,
            transform: `scale(${scale})`,
            textAlign: 'center',
            fontWeight: 700,
          }}
        >
          Essaie maintenant
        </h1>
        <p
          style={{
            fontSize: 30,
            color: '#c4b5fd',
            marginTop: 24,
            textAlign: 'center',
            opacity: interpolate(frame, [15, 35], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          Gratuit · 4 764 MCPs disponibles
        </p>
        <p
          style={{
            fontSize: 24,
            color: '#a1a1aa',
            marginTop: 16,
            textAlign: 'center',
            opacity: interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          Connecte-toi et commente "Claude" pour recevoir le lien
        </p>
        <div
          style={{
            marginTop: 36,
            background: '#fafafa',
            color: '#18181b',
            padding: '20px 56px',
            borderRadius: 12,
            fontSize: 28,
            fontWeight: 600,
            transform: `scale(${spring({ frame: frame - 30, fps, config: { damping: 12 } })})`,
          }}
        >
          Lancer une recherche
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Main composition ────────────────────────────────────────────────────────
export const DemoVideoMcpSearch: React.FC = () => {
  let offset = 0;

  return (
    <AbsoluteFill>
      <Sequence from={offset} durationInFrames={HERO_DURATION}>
        <HeroScene />
      </Sequence>

      <Sequence from={(offset += HERO_DURATION)} durationInFrames={SEARCH_DURATION}>
        <BlackBg />
        <SearchScene />
      </Sequence>

      <Sequence from={(offset += SEARCH_DURATION)} durationInFrames={RESULTS_DURATION}>
        <BlackBg />
        <ResultsScene />
      </Sequence>

      <Sequence from={(offset += RESULTS_DURATION)} durationInFrames={PROFILES_DURATION}>
        <BlackBg />
        <ProfilesScene />
      </Sequence>

      <Sequence from={(offset += PROFILES_DURATION)} durationInFrames={TOOLS_DURATION}>
        <BlackBg />
        <ToolsScene />
      </Sequence>

      <Sequence from={(offset += TOOLS_DURATION)} durationInFrames={OUTRO_DURATION}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
