import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont as loadBitcount } from '@remotion/google-fonts/BitcountSingleInk';
import { loadFont as loadGeist } from '@remotion/google-fonts/Geist';

const { fontFamily: geistFamily } = loadGeist();
import LetterGlitch from './LetterGlitch';
import Aurora from './Aurora';


const { fontFamily: bitcountFamily } = loadBitcount();


export const FPS = 30;

// Scenes
const HERO_DURATION = 4 * FPS; // 4s
const FILTERS_DURATION = 5 * FPS; // 5s
const QUIZ_DURATION = 9 * FPS; // 9s (question + answer combined)
const OUTRO_DURATION = 3 * FPS; // 3s

export const DURATION_IN_FRAMES =
  HERO_DURATION +
  QUIZ_DURATION +
  FILTERS_DURATION +
  OUTRO_DURATION;

// Black background for slides 2-4
const BlackBg: React.FC = () => (
  <AbsoluteFill style={{ background: '#09090b' }} />
);


// Scene 1 — Hero
const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = spring({ frame, fps, config: { damping: 14 } });
  const subOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const ctaScale = spring({ frame: frame - 40, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill>
      {/* Aurora background — orange Claude Code colors */}
      <AbsoluteFill style={{ background: '#09090b' }}>
        <Aurora
          colorStops={['#fb923c', '#fcd34d', '#ea580c']}
          amplitude={1.2}
          blend={0.6}
          speed={1.0}
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
          fontSize: 180,
          margin: 0,
          textAlign: 'center',
          lineHeight: 1,
          transform: `translateY(${(1 - titleY) * 40}px)`,
          opacity: titleY,
          textTransform: 'uppercase',
          fontFamily: `${bitcountFamily}, cursive`,
          color: '#c0c0c0',
          WebkitTextFillColor: '#c0c0c0',
          filter: 'grayscale(1) brightness(1.4)',
        }}
      >
        Maîtrise
      </h1>
      <h1
        style={{
          fontSize: 180,
          margin: 0,
          textAlign: 'center',
          lineHeight: 1,
          background:
            'linear-gradient(90deg, #fb923c, #fcd34d, #fb923c)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          transform: `translateY(${(1 - titleY) * 40}px)`,
          opacity: titleY,
          textTransform: 'uppercase',
          fontFamily: `${bitcountFamily}, cursive`,
          filter: 'drop-shadow(0 0 40px rgba(251,191,36,0.35))',
        }}
      >
        Claude Code
      </h1>
      <p
        style={{
          color: '#ffffff',
          fontSize: 32,
          marginTop: 30,
          opacity: subOpacity,
          fontFamily: `${geistFamily}, -apple-system, sans-serif`,
        }}
      >
        Des quiz interactifs pour progresser chaque semaine
      </p>
      <div
        style={{
          marginTop: 50,
          background: '#fafafa',
          color: '#18181b',
          padding: '24px 64px',
          borderRadius: 12,
          fontSize: 33,
          fontWeight: 600,
          transform: `scale(${ctaScale})`,
        }}
      >
        Commencer le quiz
      </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Scene 2 — Filters personalization
const FiltersScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardY = spring({ frame, fps, config: { damping: 14 } });

  // Timing (in frames, relative to scene start)
  const categories = [
    { label: 'commands', count: 42, selectAt: 20 },
    { label: 'shortcuts', count: 28, selectAt: 30 },
    { label: 'concepts', count: 56, selectAt: null },
    { label: 'mcp', count: 19, selectAt: 40 },
    { label: 'workflow', count: 34, selectAt: null },
  ];

  const difficulties = [
    { label: 'easy', count: 60, selectAt: 55 },
    { label: 'medium', count: 80, selectAt: 65 },
    { label: 'hard', count: 39, selectAt: null },
  ];

  const devChipAppear = interpolate(frame, [75, 90], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const isSelected = (selectAt: number | null) =>
    selectAt !== null && frame >= selectAt;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Geist, -apple-system, sans-serif',
        color: '#fafafa',
        padding: 80,
      }}
    >
      <div
        style={{
          width: 1200,
          background: 'rgba(24,24,27,0.85)',
          border: '1px solid #27272a',
          borderRadius: 24,
          padding: 60,
          transform: `translateY(${(1 - cardY) * 60}px)`,
          opacity: cardY,
          backdropFilter: 'blur(8px)',
        }}
      >
        <h2 style={{ fontSize: 56, margin: 0, lineHeight: 1.1 }}>
          Personnalise tes filtres
        </h2>
        <p
          style={{
            fontSize: 26,
            color: '#a1a1aa',
            marginTop: 16,
          }}
        >
          Choisis les catégories et la difficulté qui te correspondent
        </p>

        {/* Categories */}
        <div style={{ marginTop: 40 }}>
          <div
            style={{
              fontSize: 22,
              color: '#a1a1aa',
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
            }}
          >
            Catégories
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {categories.map((c, i) => {
              const selected = isSelected(c.selectAt);
              const pop = c.selectAt
                ? spring({
                    frame: frame - c.selectAt,
                    fps,
                    config: { damping: 10 },
                  })
                : 0;
              const scale = selected ? 1 + pop * 0.08 - pop * 0.08 + 1 * 0 : 1;
              return (
                <div
                  key={c.label}
                  style={{
                    padding: '14px 24px',
                    borderRadius: 12,
                    fontSize: 24,
                    border: `1px solid ${
                      selected ? '#fb923c' : '#3f3f46'
                    }`,
                    background: selected
                      ? 'rgba(251,146,60,0.15)'
                      : 'rgba(39,39,42,0.4)',
                    color: selected ? '#fdba74' : '#d4d4d8',
                    transform: `scale(${selected ? 1 + (1 - pop) * 0.15 : 1})`,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {selected && (
                    <span
                      style={{
                        color: '#fb923c',
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                  )}
                  <span>{c.label}</span>
                  <span
                    style={{
                      fontSize: 18,
                      color: selected ? '#fdba7488' : '#71717a',
                      fontFamily: 'Geist Mono, monospace',
                    }}
                  >
                    {c.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Difficulties */}
        <div style={{ marginTop: 32 }}>
          <div
            style={{
              fontSize: 22,
              color: '#a1a1aa',
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
            }}
          >
            Difficulté
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {difficulties.map((d) => {
              const selected = isSelected(d.selectAt);
              return (
                <div
                  key={d.label}
                  style={{
                    padding: '14px 28px',
                    borderRadius: 12,
                    fontSize: 24,
                    border: `1px solid ${
                      selected ? '#fb923c' : '#3f3f46'
                    }`,
                    background: selected
                      ? 'rgba(251,146,60,0.15)'
                      : 'rgba(39,39,42,0.4)',
                    color: selected ? '#fdba74' : '#d4d4d8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {selected && (
                    <span style={{ color: '#fb923c', fontWeight: 700 }}>
                      ✓
                    </span>
                  )}
                  <span>{d.label}</span>
                  <span
                    style={{
                      fontSize: 18,
                      color: selected ? '#fdba7488' : '#71717a',
                      fontFamily: 'Geist Mono, monospace',
                    }}
                  >
                    {d.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Profile chips — visible from start, selection animates in */}
        <div style={{ marginTop: 32 }}>
          <div
            style={{
              fontSize: 22,
              color: '#a1a1aa',
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
            }}
          >
            Profil
          </div>
          <div
            style={{
              display: 'flex',
              gap: 12,
            }}
          >
            <div
              style={{
                padding: '14px 28px',
                borderRadius: 12,
                fontSize: 24,
                border: `1px solid ${devChipAppear > 0.5 ? '#fb923c' : '#3f3f46'}`,
                background: devChipAppear > 0.5
                  ? 'rgba(251,146,60,0.15)'
                  : 'rgba(39,39,42,0.4)',
                color: devChipAppear > 0.5 ? '#fdba74' : '#d4d4d8',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {devChipAppear > 0.5 && (
                <span style={{ color: '#fb923c', fontWeight: 700 }}>✓</span>
              )}
              For Coding
            </div>
            <div
              style={{
                padding: '14px 28px',
                borderRadius: 12,
                fontSize: 24,
                border: '1px solid #3f3f46',
                background: 'rgba(39,39,42,0.4)',
                color: '#d4d4d8',
              }}
            >
              For Business
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 2+3 — Quiz (question → selection → answer reveal, single continuous scene)
const QuizScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase timing
  const REVEAL_START = 4 * FPS; // at 4s, selection happens
  const EXPLAIN_START = 5.5 * FPS; // at 5.5s, explanation appears

  const cardY = spring({ frame, fps, config: { damping: 14 } });

  // How far into reveal phase (0 → 1)
  const revealProgress = interpolate(
    frame,
    [REVEAL_START, REVEAL_START + 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Explanation fade + slide
  const explainProgress = interpolate(
    frame,
    [EXPLAIN_START, EXPLAIN_START + 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const options = [
    { text: 'claude code --resume', state: 'selected-wrong' },
    { text: 'claude --continue', state: 'correct' },
    { text: '/resume', state: 'idle' },
    { text: '/continue', state: 'idle' },
  ];

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Geist, -apple-system, sans-serif',
        color: '#fafafa',
        padding: 80,
      }}
    >
      <div
        style={{
          width: 1200,
          background: 'rgba(24,24,27,0.85)',
          border: '1px solid #27272a',
          borderRadius: 24,
          padding: 60,
          transform: `translateY(${(1 - cardY) * 60}px)`,
          opacity: cardY,
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Badges */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
          <span
            style={{
              background: '#27272a',
              color: '#a1a1aa',
              padding: '6px 16px',
              borderRadius: 999,
              fontSize: 20,
              border: '1px solid #3f3f46',
            }}
          >
            commands
          </span>
          <span
            style={{
              background: 'rgba(34,197,94,0.15)',
              color: '#4ade80',
              padding: '6px 16px',
              borderRadius: 999,
              fontSize: 20,
              border: '1px solid rgba(34,197,94,0.3)',
            }}
          >
            easy
          </span>
        </div>

        <h2 style={{ fontSize: 48, margin: 0, lineHeight: 1.2 }}>
          Quelle commande reprend la dernière session Claude Code ?
        </h2>

        <div
          style={{
            marginTop: 50,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {options.map((opt, i) => {
            // Phase 1: options appear one by one
            const appear = interpolate(
              frame,
              [20 + i * 8, 35 + i * 8],
              [0, 1],
              { extrapolateRight: 'clamp' },
            );

            const isWrong = opt.state === 'selected-wrong';
            const isCorrect = opt.state === 'correct';
            const isIdle = opt.state === 'idle';
            const r = revealProgress;

            // Smoothly interpolate colors based on reveal progress
            const borderColor = isWrong
              ? interpolateColors(r, [0, 1], ['#3f3f46', '#ef4444'])
              : isCorrect
              ? interpolateColors(r, [0, 1], ['#3f3f46', '#22c55e'])
              : '#3f3f46';

            const textColor = isWrong
              ? interpolateColors(r, [0, 1], ['#e4e4e7', '#fca5a5'])
              : isCorrect
              ? interpolateColors(r, [0, 1], ['#e4e4e7', '#86efac'])
              : interpolateColors(r, [0, 1], ['#e4e4e7', '#52525b']);

            const bgColor = isWrong
              ? interpolateColors(r, [0, 1], ['#27272a66', '#ef444420'])
              : isCorrect
              ? interpolateColors(r, [0, 1], ['#27272a66', '#22c55e20'])
              : '#27272a66';

            return (
              <div
                key={opt.text}
                style={{
                  padding: '24px 32px',
                  border: `1px solid ${borderColor}`,
                  borderRadius: 12,
                  fontSize: 30,
                  fontFamily: 'Geist Mono, monospace',
                  color: textColor,
                  background: bgColor,
                  opacity: appear,
                  transform: `translateX(${(1 - appear) * -20}px)`,
                }}
              >
                <span style={{ color: textColor, marginRight: 20 }}>
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt.text}
                {isWrong && r > 0.5 && (
                  <span style={{ float: 'right', color: '#ef4444', fontWeight: 700 }}>✗</span>
                )}
                {isCorrect && r > 0.5 && (
                  <span style={{ float: 'right', color: '#22c55e', fontWeight: 700 }}>✓</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Explanation — grows in from below */}
        {explainProgress > 0 && (
          <div
            style={{
              marginTop: 30,
              padding: 24,
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 12,
              fontSize: 24,
              color: '#d4d4d8',
              opacity: explainProgress,
              transform: `translateY(${(1 - explainProgress) * 20}px)`,
            }}
          >
            La bonne réponse est{' '}
            <code
              style={{
                color: '#86efac',
                background: 'rgba(34,197,94,0.15)',
                padding: '2px 8px',
                borderRadius: 6,
              }}
            >
              claude --continue
            </code>{' '}
            — elle reprend la dernière conversation active depuis le répertoire courant.
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// Scene 4 — Outro
const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill>
      {/* Aurora background — same as Hero */}
      <AbsoluteFill style={{ background: '#09090b' }}>
        <Aurora
          colorStops={['#fb923c', '#fcd34d', '#ea580c']}
          amplitude={1.2}
          blend={0.6}
          speed={1.0}
          width={1920}
          height={1080}
        />
      </AbsoluteFill>
      {/* Content */}
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
          fontSize: 110,
          margin: 0,
          transform: `scale(${scale})`,
          textAlign: 'center',
          textTransform: 'uppercase',
          fontFamily: 'Geist Mono, monospace',
          letterSpacing: -2,
        }}
      >
        Prêt à jouer ?
      </h1>
      <p
        style={{
          fontSize: 34,
          color: '#ffffff',
          marginTop: 30,
          textAlign: 'center',
          lineHeight: 1.5,
          opacity: interpolate(frame, [15, 35], [0, 1], {
            extrapolateRight: 'clamp',
          }),
        }}
      >
        Commente "Claude" et reçois le lien vers la webapp.
      </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const DemoVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* Slide 1 — Hero (Aurora bg intégré dans HeroScene) */}
      <Sequence from={0} durationInFrames={HERO_DURATION}>
        <HeroScene />
      </Sequence>

      {/* Slide 2 — Quiz: question → sélection → réponse (fond noir) */}
      <Sequence from={HERO_DURATION} durationInFrames={QUIZ_DURATION}>
        <BlackBg />
        <QuizScene />
      </Sequence>

      {/* Slide 3 — Filtres (fond noir) */}
      <Sequence
        from={HERO_DURATION + QUIZ_DURATION}
        durationInFrames={FILTERS_DURATION}
      >
        <BlackBg />
        <FiltersScene />
      </Sequence>

      {/* Slide 4 — Outro (LetterGlitch bg intégré dans OutroScene) */}
      <Sequence
        from={HERO_DURATION + QUIZ_DURATION + FILTERS_DURATION}
        durationInFrames={OUTRO_DURATION}
      >
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
