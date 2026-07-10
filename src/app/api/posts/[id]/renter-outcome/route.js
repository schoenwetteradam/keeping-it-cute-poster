import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { cleanText } from '@/lib/validation'

const VALID_OUTCOMES = new Set(['inquiry', 'tour_scheduled', 'signed'])

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const { outcome, notes } = await request.json()

    if (outcome !== null && !VALID_OUTCOMES.has(outcome)) {
      return NextResponse.json({ error: 'outcome must be inquiry, tour_scheduled, signed, or null' }, { status: 400 })
    }

    const [post] = await db.posts.setRenterOutcome(id, outcome, cleanText(notes, 500))
    if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
    return NextResponse.json({ post })
  } catch (error) {
    console.error('Set renter outcome error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
