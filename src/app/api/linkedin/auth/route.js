import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/linkedin/callback'

  if (!clientId) {
    return NextResponse.json(
      { error: 'LinkedIn not configured — add LINKEDIN_CLIENT_ID to .env.local' },
      { status: 400 }
    )
  }

  const state = randomBytes(24).toString('hex')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'r_liteprofile w_member_social r_organization_social w_organization_social',
    state,
  })

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  const response = NextResponse.redirect(authUrl)
  response.cookies.set('linkedin_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  })
  return response
}
