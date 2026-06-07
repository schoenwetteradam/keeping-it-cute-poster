import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import db from '@/lib/db'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

export async function GET() {
  const rows = db.prepare('SELECT * FROM media ORDER BY created_at DESC').all()
  const media = rows.map(r => ({
    ...r,
    url: `/uploads/${r.filename}`,
  }))
  return NextResponse.json({ media })
}

export async function DELETE(request) {
  try {
    const { id } = await request.json()
    const row = db.prepare('SELECT * FROM media WHERE id = ?').get(id)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const filepath = path.join(UPLOADS_DIR, row.filename)
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)

    db.prepare('DELETE FROM media WHERE id = ?').run(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
