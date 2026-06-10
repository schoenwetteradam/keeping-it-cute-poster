import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request) {
  try {
    const { posts } = await request.json()
    if (!posts || !Array.isArray(posts)) {
      return NextResponse.json({ error: 'posts array required' }, { status: 400 })
    }

    const insert = db.prepare(`
      INSERT INTO generated_posts (id, employee_name, platform, goal, post_text, context)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const savedPosts = posts.map(p => {
      const id = uuidv4()
      insert.run(id, p.employeeName || '', p.platform || '', p.goal || '', p.postText || '', p.context || '')
      return { id, platform: p.platform, employeeName: p.employeeName, goal: p.goal }
    })

    return NextResponse.json({ savedPosts })
  } catch (error) {
    console.error('Save posts error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const goal = searchParams.get('goal')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    let where = 'WHERE 1=1'
    const params = []
    if (platform) { where += ' AND gp.platform = ?'; params.push(platform) }
    if (goal) { where += ' AND gp.goal = ?'; params.push(goal) }

    params.push(limit)

    const posts = db.prepare(`
      SELECT gp.*, AVG(pr.rating) as avg_rating, COUNT(pr.id) as rating_count
      FROM generated_posts gp
      LEFT JOIN post_ratings pr ON pr.post_id = gp.id
      ${where}
      GROUP BY gp.id
      ORDER BY avg_rating DESC, gp.likes DESC
      LIMIT ?
    `).all(...params)

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('List posts error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
