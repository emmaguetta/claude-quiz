import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Claude Code Quiz — Learn & Explore'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #18181b 50%, #0a0a0a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: '#fafafa',
            letterSpacing: '-2px',
            marginBottom: 8,
          }}
        >
          Claude Code Quiz
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#a1a1aa',
            marginBottom: 40,
          }}
        >
          Learn & Explore
        </div>
        <div
          style={{
            display: 'flex',
            gap: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#27272a',
              borderRadius: 12,
              padding: '12px 24px',
              color: '#d4d4d8',
              fontSize: 22,
            }}
          >
            225+ Questions
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#27272a',
              borderRadius: 12,
              padding: '12px 24px',
              color: '#d4d4d8',
              fontSize: 22,
            }}
          >
            4700+ MCPs
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#27272a',
              borderRadius: 12,
              padding: '12px 24px',
              color: '#d4d4d8',
              fontSize: 22,
            }}
          >
            Multilingual
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
