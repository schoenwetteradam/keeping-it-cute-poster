import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(request) {
  try {
    const { posts } = await request.json()
    if (!posts || !Array.isArray(posts)) {
      return NextResponse.json({ error: 'posts array required' }, { status: 400 })
    }

    const rows = posts.map(p => ({
      id: randomUUID(),
      employee_name: p.employeeName || '',
      platform: p.platform || '',
      goal: p.goal || '',
      post_text: p.postText || '',
      context: p.context || '',
    }))
    await db.posts.insertMany(rows)
    const savedPosts = rows.map(row => ({
      id: row.id, platform: row.platform, employeeName: row.employee_name, goal: row.goal,
    }))

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
    const status = searchParams.get('status')
    const date = searchParams.get('date')

    const [posts, summary, performance] = await Promise.all([
      db.posts.list({ platform, goal, status, date, limit }),
      db.posts.summary(),
      db.posts.performance(),
    ])

    return NextResponse.json({ posts, summary, performance })
  } catch (error) {
    console.error('List posts error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
