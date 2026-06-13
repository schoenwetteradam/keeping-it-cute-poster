import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { cleanText } from '@/lib/validation'

export async function PATCH(request, { params }) {
  try {
    const postText = cleanText((await request.json()).postText, 8000)
    if (!postText) {
      return NextResponse.json({ error: 'Post text is required.' }, { status: 400 })
    }
    const result = db.prepare('UPDATE generated_posts SET post_text = ? WHERE id = ?')
      .run(postText, params.id)
    if (!result.changes) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
    }
    return NextResponse.json({ success: true, postText })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
