import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export async function POST(request) {
  try {
    const { message } = await request.json()

    const tokenPath = join(process.cwd(), '.linkedin-token.json')

    if (!existsSync(tokenPath)) {
      return NextResponse.json(
        { error: 'LinkedIn not connected — visit /api/linkedin/auth to connect' },
        { status: 401 }
      )
    }

    const raw = readFileSync(tokenPath, 'utf8')
    const token = JSON.parse(raw)

    if (!token.access_token) {
      return NextResponse.json(
        { error: 'LinkedIn token missing — reconnect via /api/linkedin/auth' },
        { status: 401 }
      )
    }

    if (token.expires_at && Date.now() > token.expires_at) {
      return NextResponse.json(
        { error: 'LinkedIn token expired — reconnect via /api/linkedin/auth' },
        { status: 401 }
      )
    }

    const companyId = process.env.LINKEDIN_COMPANY_ID
    const author = companyId
      ? `urn:li:organization:${companyId}`
      : await getPersonUrn(token.access_token)

    if (!author) {
      return NextResponse.json({ error: 'Could not determine LinkedIn author URN' }, { status: 500 })
    }

    const body = {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: message },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }

    const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    })

    const postData = await postRes.json()

    if (!postRes.ok) {
      const errMsg = postData.message || postData.serviceErrorCode || 'Failed to post to LinkedIn'
      return NextResponse.json({ error: errMsg }, { status: postRes.status || 500 })
    }

    const postId = postData.id || postData['id']
    return NextResponse.json({ success: true, postId, url: 'https://www.linkedin.com/feed/' })
  } catch (error) {
    console.error('LinkedIn post error:', error)
    return NextResponse.json({ error: error.message || 'Failed to post to LinkedIn' }, { status: 500 })
  }
}

async function getPersonUrn(accessToken) {
  try {
    const res = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json()
    return data.id ? `urn:li:person:${data.id}` : null
  } catch {
    return null
  }
}
