import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const posts = db.prepare(`
    SELECT gp.*, AVG(pr.rating) as avg_rating
    FROM generated_posts gp
    LEFT JOIN post_ratings pr ON pr.post_id = gp.id
    WHERE gp.scheduled_at IS NOT NULL AND gp.posted = 0
    GROUP BY gp.id
    ORDER BY gp.scheduled_at ASC
  `).all()
  return NextResponse.json({ posts })
}

export async function PATCH(request) {
  try {
    const { postId, scheduledAt } = await request.json()
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })
    if (!scheduledAt) return NextResponse.json({ error: 'scheduledAt required' }, { status: 400 })

    db.prepare(`UPDATE generated_posts SET scheduled_at=?, publish_status='scheduled' WHERE id=?`).run(scheduledAt, postId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { postId } = await request.json()
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })
    db.prepare(`UPDATE generated_posts SET scheduled_at=NULL, publish_status='draft' WHERE id=?`).run(postId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
