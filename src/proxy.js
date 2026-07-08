import { NextResponse } from 'next/server'

// Endpoints a scheduler (Vercel Cron or a systemd timer on the VM) may call
// with `Authorization: Bearer ${CRON_SECRET}` instead of basic auth.
const CRON_PATHS = new Set(['/api/schedule/process', '/api/posts/sync-all'])

export function proxy(request) {
  const { pathname } = request.nextUrl
  const auth = request.headers.get('authorization')

  if (pathname === '/api/health') {
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
