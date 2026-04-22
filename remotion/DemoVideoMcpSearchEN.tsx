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
import { loadFont as loadRoboto } from '@remotion/google-fonts/Roboto';
import SoftAurora from './SoftAurora';

const { fontFamily: geistFamily } = loadGeist();
const { fontFamily: robotoFamily } = loadRoboto();

export const FPS = 30;

// Scene durations (-20%)
const HERO_DURATION = Math.round(2.8 * FPS); // 2.8s
const BIGNUMBER_DURATION = Math.round(2.8 * FPS); // 2.8s
const SEARCH_DURATION = Math.round(4 * FPS); // 4s
const RESULTS_DURATION = Math.round(4.8 * FPS); // 4.8s
const OUTRO_DURATION = Math.round(2.8 * FPS); // 2.8s

export const DURATION_IN_FRAMES =
  HERO_DURATION +
  BIGNUMBER_DURATION +
  SEARCH_DURATION +
  RESULTS_DURATION +
  OUTRO_DURATION;

const BlackBg: React.FC = () => (
  <AbsoluteFill style={{ background: '#09090b' }} />
);

// SoftAurora background — synced with Remotion frames
const SoftAuroraBg: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps; // seconds, deterministic per frame

  return (
    <AbsoluteFill style={{ background: '#0c0a1a' }}>
      <SoftAurora
        time={time}
        speed={0.4}
        scale={1.8}
        brightness={0.7}
        color1="#a78bfa"
        color2="#6366f1"
        noiseFrequency={2.0}
        noiseAmplitude={1.2}
        bandHeight={0.5}
        bandSpread={1.2}
        octaveDecay={0.15}
        layerOffset={0.3}
        colorSpeed={0.8}
        width={1920}
        height={1080}
      />
    </AbsoluteFill>
  );
};

// ─── Scene 1: Hero ───────────────────────────────────────────────────────────
const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 30], [30, 0], { extrapolateRight: 'clamp' });
  const subOpacity = interpolate(frame, [30, 55], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <SoftAuroraBg />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          color: '#fafafa',
        }}
      >
        <div
          style={{
            fontSize: 20,
            color: '#a78bfa',
            marginBottom: 28,
            opacity: titleOpacity,
            fontFamily: `${robotoFamily}, sans-serif`,
            fontWeight: 500,
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          MCP Search Engine
        </div>
        <h1
          style={{
            fontFamily: `${robotoFamily}, sans-serif`,
            fontSize: 110,
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.1,
            transform: `translateY(${titleY}px)`,
            opacity: titleOpacity,
            fontWeight: 700,
            textShadow: '0 2px 30px rgba(0,0,0,0.6), 0 0px 60px rgba(0,0,0,0.3)',
          }}
        >
          Find the MCP you need
        </h1>
        <p
          style={{
            fontFamily: `${robotoFamily}, sans-serif`,
            fontSize: 28,
            color: '#c4b5fd',
            marginTop: 32,
            opacity: subOpacity,
            textAlign: 'center',
            fontWeight: 400,
            letterSpacing: 0.5,
          }}
        >
          Search in plain language, we match your intent
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Slot machine digit — spins through numbers then lands
const SlotDigit: React.FC<{ target: string; delay: number }> = ({ target, delay }) => {
  const frame = useCurrentFrame();

  const SPIN_DURATION = 25; // frames of spinning
  const localFrame = Math.max(0, frame - delay);
  const spinning = localFrame < SPIN_DURATION;
  const settled = interpolate(localFrame, [SPIN_DURATION, SPIN_DURATION + 8], [0, 1], { extrapolateRight: 'clamp' });

  // During spin, cycle through random digits
  const spinDigit = spinning ? String(Math.floor(Math.abs(Math.sin(localFrame * 7.3 + delay * 3)) * 10)) : target;
  const displayChar = target === ',' || target === '+' ? target : spinDigit;

  // Vertical offset during spin (shaking effect)
  const spinY = spinning ? Math.sin(localFrame * 2.5) * 6 : 0;

  const opacity = interpolate(localFrame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <span
      style={{
        display: 'inline-block',
        transform: `translateY(${spinY}px)`,
        opacity,
        // Slight blur while spinning
        filter: spinning ? 'blur(1.5px)' : 'blur(0px)',
        transition: 'filter 0.1s',
      }}
    >
      {displayChar}
    </span>
  );
};

// ─── Scene 2: Big number — 4,500+ MCPs (slot machine) ───────────────────────
const BigNumberScene: React.FC = () => {
  const frame = useCurrentFrame();

  const labelOpacity = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: 'clamp' });
  const labelY = interpolate(frame, [35, 55], [15, 0], { extrapolateRight: 'clamp' });

  const digits = '4,500+'.split('');

  return (
    <AbsoluteFill>
      <SoftAuroraBg />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          color: '#fafafa',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: `${robotoFamily}, sans-serif`,
              fontSize: 180,
              fontWeight: 700,
              lineHeight: 1,
              textShadow: '0 2px 30px rgba(0,0,0,0.6), 0 0px 60px rgba(0,0,0,0.3)',
            }}
          >
            {digits.map((d, i) => (
              <SlotDigit key={i} target={d} delay={i * 4} />
            ))}
          </div>
          <div
            style={{
              fontFamily: `${robotoFamily}, sans-serif`,
              fontSize: 40,
              fontWeight: 400,
              marginTop: 20,
              opacity: labelOpacity,
              transform: `translateY(${labelY}px)`,
              color: '#e4e4e7',
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            MCPs available
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scene 3: Search typing ──────────────────────────────────────────────────
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
            Describe what you need
          </h2>
          <p style={{ fontSize: 24, color: '#71717a', marginTop: 12 }}>
            Just type, we understand your query
          </p>
        </div>

        {/* Search bar */}
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

        {/* Thinking dots */}
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
              Searching...
            </span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 4: Results (3 cards) ─────────────────────────────────────────────
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const results = [
    {
      name: 'LinkedIn MCP',
      description: 'Publish posts to LinkedIn with images and visibility controls. React to posts and add, edit, or delete comments.',
      matchTool: 'comment_on_post',
      pricing: 'free' as const,
      users: 340,
      verified: false,
    },
    {
      name: 'LinkedDraft',
      description: 'LinkedIn MCP server for AI content creation, post generation, rewriting, topic ideation, and voice training.',
      matchTool: 'reply_to_linkedin_comment',
      pricing: 'freemium' as const,
      users: 120,
      verified: false,
    },
    {
      name: 'PostPulse',
      description: 'A unified API and integration suite that handles the complexity of social media publishing across platforms.',
      matchTool: 'add_comment_to_post',
      pricing: 'free' as const,
      users: 890,
      verified: true,
    },
  ];

  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

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
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 32,
            opacity: headerOpacity,
          }}
        >
          <span style={{ fontSize: 22, color: '#a1a1aa' }}>
            30 MCPs found for
          </span>
          <span
            style={{
              fontSize: 22,
              color: '#c4b5fd',
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.3)',
              padding: '6px 16px',
              borderRadius: 8,
              fontFamily: 'Geist Mono, monospace',
            }}
          >
            "comment linkedin post"
          </span>
        </div>

        {/* 3 result cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {results.map((r, i) => {
            const delay = 10 + i * 12;
            const appear = spring({ frame: frame - delay, fps, config: { damping: 14 } });

            return (
              <div
                key={r.name}
                style={{
                  padding: '28px 32px',
                  background: 'rgba(24,24,27,0.85)',
                  border: '1px solid #27272a',
                  borderRadius: 16,
                  opacity: appear,
                  transform: `translateY(${(1 - appear) * 20}px)`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28, fontWeight: 600, color: '#fafafa' }}>
                    {r.name}
                  </span>
                  {r.verified && (
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="#10b981" strokeWidth="2" />
                      <path d="M9 12l2 2 4-4" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {r.pricing === 'freemium' && (
                    <span style={{ fontSize: 14, padding: '4px 10px', borderRadius: 999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                      Freemium
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 20, color: '#a1a1aa', margin: '8px 0 0' }}>
                  {r.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 14 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 16, color: '#71717a' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    {r.users.toLocaleString()}
                  </span>
                  <div
                    style={{
                      marginLeft: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'rgba(39,39,42,0.6)',
                      padding: '6px 14px',
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ color: '#71717a', fontSize: 14 }}>→</span>
                    <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 16, color: '#fbbf24' }}>
                      {r.matchTool}
                    </span>
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

// ─── Scene 5: Outro ──────────────────────────────────────────────────────────
const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill>
      <SoftAuroraBg />
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
            fontSize: 100,
            margin: 0,
            transform: `scale(${scale})`,
            textAlign: 'center',
            fontWeight: 700,
            textShadow: '0 2px 30px rgba(0,0,0,0.6), 0 0px 60px rgba(0,0,0,0.3)',
          }}
        >
          Try it now
        </h1>
        <p
          style={{
            fontSize: 34,
            color: '#e4e4e7',
            marginTop: 28,
            textAlign: 'center',
            textShadow: '0 2px 20px rgba(0,0,0,0.5)',
            opacity: interpolate(frame, [15, 35], [0, 1], {
              extrapolateRight: 'clamp',
            }),
          }}
        >
          Free · 4,500+ MCPs available
        </p>
        <div
          style={{
            marginTop: 40,
            background: '#fafafa',
            color: '#18181b',
            padding: '28px 72px',
            borderRadius: 14,
            fontSize: 34,
            fontWeight: 600,
            textAlign: 'center',
            transform: `scale(${spring({ frame: frame - 25, fps, config: { damping: 12 } })})`,
            boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
          }}
        >
          Connect & comment "MCP" to get the link
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Main composition ────────────────────────────────────────────────────────
export const DemoVideoMcpSearchEN: React.FC = () => {
  let offset = 0;

  return (
    <AbsoluteFill>
      <Sequence from={offset} durationInFrames={HERO_DURATION}>
        <HeroScene />
      </Sequence>

      <Sequence from={(offset += HERO_DURATION)} durationInFrames={BIGNUMBER_DURATION}>
        <BigNumberScene />
      </Sequence>

      <Sequence from={(offset += BIGNUMBER_DURATION)} durationInFrames={SEARCH_DURATION}>
        <BlackBg />
        <SearchScene />
      </Sequence>

      <Sequence from={(offset += SEARCH_DURATION)} durationInFrames={RESULTS_DURATION}>
        <BlackBg />
        <ResultsScene />
      </Sequence>

      <Sequence from={(offset += RESULTS_DURATION)} durationInFrames={OUTRO_DURATION}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
