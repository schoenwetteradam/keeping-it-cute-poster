import { NextResponse } from 'next/server'

// Endpoints a scheduler (Vercel Cron or a systemd timer on the VM) may call
// with `Authorization: Bearer ${CRON_SECRET}` instead of basic auth.
const CRON_PATHS = new Set(['/api/schedule/process', '/api/posts/sync-all'])

// Public pages/endpoints that must be reachable without the salon login —
// the booth-rental landing page and its form submission. Everything else,
// including GET /api/leads (which returns customer PII), stays gated.
const PUBLIC_PATHS = new Set(['/rent'])

export function proxy(request) {
  const { pathname } = request.nextUrl
  const auth = request.headers.get('authorization')

  if (pathname === '/api/health') {
    return NextResponse.next()
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  // Static marketing assets the public landing page needs (photos of the salon).
  if (pathname.startsWith('/images/')) {
    return NextResponse.next()
  }

  // The landing page's contact form posts here; only POST is public. GET
  // /api/leads lists real leads and stays behind the login below.
  if (pathname === '/api/leads' && request.method === 'POST') {
    return NextResponse.next()
  }

  const cronSecret = process.env.CRON_SECRET
  if (CRON_PATHS.has(pathname) && cronSecret && auth === `Bearer ${cronSecret}`) {
    return NextResponse.next()
  }

  const user = process.env.ADMIN_USER
  const password = process.env.ADMIN_PASSWORD

  // If no credentials are configured, block all access with a clear message
  if (!user || !password) {
    return new NextResponse('App not configured: set ADMIN_USER and ADMIN_PASSWORD in the environment', { status: 503 })
  }

  const expected = 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64')

  if (auth !== expected) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Keeping It Cute"' },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
