import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { cleanText, isPublicHttpUrl } from '@/lib/validation'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0'

export async function POST(request) {
  try {
    const { message, postId, imageUrl } = await request.json()
    const pageId = process.env.FACEBOOK_PAGE_ID
    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    const text = cleanText(message, 10000)

    if (!pageId || !accessToken) {
      return NextResponse.json(
        { error: 'Facebook is not configured. Add the page ID and access token to .env.local.' },
        { status: 400 }
      )
    }
    if (!text) return NextResponse.json({ error: 'Post text is required.' }, { status: 400 })

    const publicImageUrl = isPublicHttpUrl(imageUrl) ? imageUrl : ''
    const endpoint = publicImageUrl
      ? `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/photos`
      : `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/feed`
    const payload = publicImageUrl
      ? { url: publicImageUrl, caption: text, access_token: accessToken }
      : { message: text, access_token: accessToken }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok || data.error) {
      return NextResponse.json(
        { error: data.error?.message || 'Failed to publish the Facebook post.' },
        { status: response.status || 500 }
      )
    }

    if (postId) {
      db.prepare(`
        UPDATE generated_posts
        SET posted = 1, facebook_post_id = ?, external_post_id = ?, posted_at = datetime('now')
        WHERE id = ?
      `).run(data.id, data.id, postId)
    }
    return NextResponse.json({
      success: true,
      postId: data.id,
      url: `https://www.facebook.com/${String(data.id).replace('_', '/posts/')}`,
    })
  } catch (error) {
    console.error('Facebook post error:', error)
    return NextResponse.json({ error: error.message || 'Failed to post to Facebook.' }, { status: 500 })
  }
}
