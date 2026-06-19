import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { publishPost, markPosted, markFailed } from '@/lib/publish'

export async function POST() {
  try {
    const due = db.prepare(`
      SELECT * FROM generated_posts
      WHERE publish_status = 'scheduled'
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= datetime('now')
        AND posted = 0
    `).all()

    const results = []
    for (const post of due) {
      try {
        const result = await publishPost(post.platform, post.post_text, post.media_url)
        markPosted(post.id, post.platform, result.postId)
        results.push({ id: post.id, platform: post.platform, success: true, url: result.url })
      } catch (err) {
        markFailed(post.id)
        results.push({ id: post.id, platform: post.platform, success: false, error: err.message })
      }
    }

    return NextResponse.json({ processed: results.length, results })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
