import { NextResponse } from 'next/server'
import { writeFileSync } from 'fs'
import { join } from 'path'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const returnedState = searchParams.get('state')
  const expectedState = request.cookies.get('linkedin_oauth_state')?.value

  if (error || !code || !returnedState || returnedState !== expectedState) {
    return NextResponse.redirect(new URL('/?linkedin=error', request.url))
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/linkedin/callback'

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?linkedin=error', request.url))
  }

  try {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || tokenData.error) {
      console.error('LinkedIn token error:', tokenData)
      return NextResponse.redirect(new URL('/?linkedin=error', request.url))
    }

    const tokenPath = join(process.cwd(), '.linkedin-token.json')
    const tokenPayload = {
      access_token: tokenData.access_token,
      expires_at: Date.now() + (tokenData.expires_in || 5184000) * 1000,
    }
    writeFileSync(tokenPath, JSON.stringify(tokenPayload, null, 2))

    return NextResponse.redirect(new URL('/?linkedin=connected', request.url))
  } catch (err) {
    console.error('LinkedIn callback error:', err)
    return NextResponse.redirect(new URL('/?linkedin=error', request.url))
  }
}
