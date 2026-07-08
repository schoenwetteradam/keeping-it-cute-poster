import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { publishPost, markPosted, markFailed } from '@/lib/publish'

export async function POST() {
  try {
    const due = await db.posts.listDue()

    const results = []
    for (const post of due) {
      try {
        const result = await publishPost(post.platform, post.post_text, post.media_url)
        await markPosted(post.id, post.platform, result.postId)
        results.push({ id: post.id, platform: post.platform, success: true, url: result.url })
      } catch (err) {
        await markFailed(post.id)
        results.push({ id: post.id, platform: post.platform, success: false, error: err.message })
      }
    }

    return NextResponse.json({ processed: results.length, results })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Vercel Cron and other schedulers call endpoints with GET.
export { POST as GET }
