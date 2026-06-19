import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { cleanText } from '@/lib/validation'

export async function GET() {
  const templates = db.prepare('SELECT * FROM post_templates ORDER BY created_at DESC').all()
  return NextResponse.json({ templates })
}

export async function POST(request) {
  try {
    const { name, goal, context, platforms } = await request.json()
    if (!name) return NextResponse.json({ error: 'Template name is required.' }, { status: 400 })
    const id = uuidv4()
    db.prepare('INSERT INTO post_templates (id, name, goal, context, platforms) VALUES (?, ?, ?, ?, ?)').run(
      id,
      cleanText(name, 100),
      goal || 'showcase',
      cleanText(context, 4000),
      JSON.stringify(Array.isArray(platforms) ? platforms : ['facebook', 'instagram', 'linkedin'])
    )
    const template = db.prepare('SELECT * FROM post_templates WHERE id = ?').get(id)
    return NextResponse.json({ template })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    db.prepare('DELETE FROM post_templates WHERE id = ?').run(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
