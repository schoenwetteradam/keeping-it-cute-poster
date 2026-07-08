import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST() {
  try {
    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'FACEBOOK_PAGE_ACCESS_TOKEN not configured' }, { status: 400 })
    }

    const postedPosts = await db.posts.listPostedOnFacebook()

    const results = []
    for (const post of postedPosts) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${post.facebook_post_id}?fields=likes.summary(true),comments.summary(true),shares,insights.metric(post_impressions)&access_token=${accessToken}`
        )
        const data = await res.json()

        if (!res.ok || data.error) {
          results.push({ id: post.id, error: data.error?.message || 'Failed' })
          continue
        }

        const likes = data.likes?.summary?.total_count || 0
        const comments = data.comments?.summary?.total_count || 0
        const shares = data.shares?.count || 0
        const reach = data.insights?.data?.[0]?.values?.[0]?.value || 0

        await db.posts.updateEngagement(post.id, { likes, comments, shares, reach })

        results.push({ id: post.id, likes, comments, shares, reach })
      } catch (e) {
        results.push({ id: post.id, error: e.message })
      }
    }

    return NextResponse.json({ synced: postedPosts.length, results })
  } catch (error) {
    console.error('Sync all error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
