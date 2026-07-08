import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(request, { params }) {
  try {
    const { id } = params
    const { rating, notes, ratedBy } = await request.json()

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 })
    }

    const saved = await db.ratings.upsert({ postId: id, rating, notes: notes || '', ratedBy: ratedBy || '' })
    return NextResponse.json({ rating: saved })
  } catch (error) {
    console.error('Rate post error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
