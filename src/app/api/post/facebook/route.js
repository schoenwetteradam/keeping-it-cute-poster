import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(request) {
  try {
    const { message, postId } = await request.json()

    const pageId = process.env.FACEBOOK_PAGE_ID
    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN

    if (!pageId || !accessToken) {
      return NextResponse.json(
        { error: 'Facebook not configured — add FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN to .env.local' },
        { status: 400 }
      )
    }

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, access_token: accessToken }),
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      const errMsg = data.error?.message || 'Failed to post to Facebook'
      return NextResponse.json({ error: errMsg }, { status: res.status || 500 })
    }

    const fbPostId = data.id
    const url = `https://www.facebook.com/${fbPostId.replace('_', '/posts/')}`

    // Update DB record if we have a postId
    if (postId) {
      try {
        db.prepare(
          "UPDATE generated_posts SET posted = 1, facebook_post_id = ? WHERE id = ?"
        ).run(fbPostId, postId)
      } catch (e) {
        console.error('Failed to update generated_posts:', e)
      }
    }

    return NextResponse.json({ success: true, postId: fbPostId, url })
  } catch (error) {
    console.error('Facebook post error:', error)
    return NextResponse.json({ error: error.message || 'Failed to post to Facebook' }, { status: 500 })
  }
}
