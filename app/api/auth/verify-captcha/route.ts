import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { token } = await request.json()

  if (!token) {
    return NextResponse.json({ success: false, error: 'Token manquant' }, { status: 400 })
  }

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set')
    return NextResponse.json({ success: false, error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  })

  const data = await res.json()

  if (!data.success) {
    return NextResponse.json({ success: false, error: 'Vérification CAPTCHA échouée' }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}
