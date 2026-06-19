import { NextResponse } from 'next/server'

export function middleware(request) {
  const user = process.env.ADMIN_USER
  const password = process.env.ADMIN_PASSWORD

  // If no credentials are configured, block all access with a clear message
  if (!user || !password) {
    return new NextResponse('App not configured: set ADMIN_USER and ADMIN_PASSWORD in .env.local', { status: 503 })
  }

  const auth = request.headers.get('authorization')
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
