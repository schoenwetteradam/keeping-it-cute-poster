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

    const summary = db.prepare(`
      SELECT
        COUNT(*) AS total_posts,
        SUM(CASE WHEN posted = 1 THEN 1 ELSE 0 END) AS published_posts,
        ROUND(AVG(NULLIF(likes + comments + shares, 0)), 1) AS avg_engagement,
        ROUND(AVG(pr.avg_rating), 1) AS avg_rating
      FROM generated_posts gp
      LEFT JOIN (
        SELECT post_id, AVG(rating) AS avg_rating
        FROM post_ratings
        GROUP BY post_id
      ) pr ON pr.post_id = gp.id
    `).get()

    const performance = db.prepare(`
      SELECT platform, goal, variant,
        COUNT(*) AS post_count,
        ROUND(AVG(likes + comments * 2 + shares * 3), 1) AS engagement_score,
        ROUND(AVG(pr.avg_rating), 1) AS avg_rating
      FROM generated_posts gp
      LEFT JOIN (
        SELECT post_id, AVG(rating) AS avg_rating
        FROM post_ratings
        GROUP BY post_id
      ) pr ON pr.post_id = gp.id
      GROUP BY platform, goal, variant
      HAVING COUNT(*) > 0
      ORDER BY engagement_score DESC, avg_rating DESC
    `).all()

    return NextResponse.json({ posts, summary, performance })
  } catch (error) {
    console.error('List posts error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
