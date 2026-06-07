import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import db from '@/lib/db'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const uploadedBy = formData.get('uploadedBy') || ''

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = path.extname(file.name) || ''
    const id = uuidv4()
    const filename = `${id}${ext}`
    const filepath = path.join(UPLOADS_DIR, filename)

    const bytes = await file.arrayBuffer()
    fs.writeFileSync(filepath, Buffer.from(bytes))

    db.prepare(`
      INSERT INTO media (id, filename, original_name, mime_type, size, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, filename, file.name, file.type, file.size, uploadedBy)

    return NextResponse.json({
      id, filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedBy,
      createdAt: new Date().toISOString(),
      url: `/uploads/${filename}`,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
