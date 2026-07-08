import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { cleanText } from '@/lib/validation'

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const postText = cleanText((await request.json()).postText, 8000)
    if (!postText) {
      return NextResponse.json({ error: 'Post text is required.' }, { status: 400 })
    }
    const updated = await db.posts.updateText(id, postText)
    if (!updated.length) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
    }
    return NextResponse.json({ success: true, postText })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
