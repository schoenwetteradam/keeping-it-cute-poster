import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { cleanText } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const templates = await db.templates.list()
  return NextResponse.json({ templates })
}

export async function POST(request) {
  try {
    const { name, goal, context, platforms } = await request.json()
    if (!name) return NextResponse.json({ error: 'Template name is required.' }, { status: 400 })
    const template = await db.templates.insert({
      id: uuidv4(),
      name: cleanText(name, 100),
      goal: goal || 'showcase',
      context: cleanText(context, 4000),
      platforms: Array.isArray(platforms) ? platforms : ['facebook', 'instagram', 'linkedin'],
    })
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
    await db.templates.remove(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
