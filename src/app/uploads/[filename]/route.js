import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET(request, { params }) {
  const { filename } = params
  const filepath = path.join(process.cwd(), 'uploads', filename)

  if (!fs.existsSync(filepath)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const file = fs.readFileSync(filepath)
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4',
    '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
  }
  const contentType = mimeTypes[ext] || 'application/octet-stream'

  return new NextResponse(file, {
    headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000' }
  })
}
