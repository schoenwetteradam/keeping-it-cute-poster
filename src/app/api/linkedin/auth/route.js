import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/linkedin/callback'

  if (!clientId) {
    return NextResponse.json(
      { error: 'LinkedIn not configured — add LINKEDIN_CLIENT_ID to .env.local' },
      { status: 400 }
    )
  }

  const state = Math.random().toString(36).substring(2, 15)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'r_liteprofile w_member_social r_organization_social w_organization_social',
    state,
  })

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  return NextResponse.redirect(authUrl)
}
