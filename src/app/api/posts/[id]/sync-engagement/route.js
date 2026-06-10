import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(request, { params }) {
  try {
    const { id } = params
    const post = db.prepare('SELECT * FROM generated_posts WHERE id = ?').get(id)

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (!post.facebook_post_id) {
      return NextResponse.json({ error: 'No Facebook post ID associated with this post' }, { status: 400 })
    }

    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'FACEBOOK_PAGE_ACCESS_TOKEN not configured' }, { status: 400 })
    }

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${post.facebook_post_id}?fields=likes.summary(true),comments.summary(true),shares,insights.metric(post_impressions)&access_token=${accessToken}`
    )
    const data = await res.json()

    if (!res.ok || data.error) {
      return NextResponse.json({ error: data.error?.message || 'Failed to fetch Facebook engagement' }, { status: 500 })
    }

    const likes = data.likes?.summary?.total_count || 0
    const comments = data.comments?.summary?.total_count || 0
    const shares = data.shares?.count || 0
    const reach = data.insights?.data?.[0]?.values?.[0]?.value || 0

    db.prepare(`
      UPDATE generated_posts
      SET likes = ?, comments = ?, shares = ?, reach = ?, engagement_updated_at = datetime('now')
      WHERE id = ?
    `).run(likes, comments, shares, reach, id)

    return NextResponse.json({ success: true, likes, comments, shares, reach })
  } catch (error) {
    console.error('Sync engagement error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
