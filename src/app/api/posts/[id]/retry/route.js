import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { publishPost, markPosted, markFailed } from '@/lib/publish'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const post = await db.posts.getById(id)
    if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
    if (post.posted) return NextResponse.json({ error: 'Post is already published.' }, { status: 400 })

    const result = await publishPost(post.platform, post.post_text, post.media_url)
    await markPosted(id, post.platform, result.postId)
    return NextResponse.json({ success: true, url: result.url })
  } catch (error) {
    const { id } = await params
    await markFailed(id)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
