import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request, { params }) {
  try {
    const { id } = params
    const { rating, notes, ratedBy } = await request.json()

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 })
    }

    const existing = db.prepare(
      'SELECT id FROM post_ratings WHERE post_id = ? AND rated_by = ?'
    ).get(id, ratedBy || '')

    let ratingId
    if (existing) {
      ratingId = existing.id
      db.prepare(
        'UPDATE post_ratings SET rating = ?, notes = ?, created_at = datetime(\'now\') WHERE id = ?'
      ).run(rating, notes || '', ratingId)
    } else {
      ratingId = uuidv4()
      db.prepare(
        'INSERT INTO post_ratings (id, post_id, rating, notes, rated_by) VALUES (?, ?, ?, ?, ?)'
      ).run(ratingId, id, rating, notes || '', ratedBy || '')
    }

    const saved = db.prepare('SELECT * FROM post_ratings WHERE id = ?').get(ratingId)
    return NextResponse.json({ rating: saved })
  } catch (error) {
    console.error('Rate post error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
