import { NextResponse } from 'next/server'
import db from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const posts = await db.posts.listScheduled()
  return NextResponse.json({ posts })
}

export async function PATCH(request) {
  try {
    const { postId, scheduledAt } = await request.json()
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })
    if (!scheduledAt) return NextResponse.json({ error: 'scheduledAt required' }, { status: 400 })

    await db.posts.setSchedule(postId, scheduledAt)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { postId } = await request.json()
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })
    await db.posts.clearSchedule(postId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
