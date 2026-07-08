import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { deleteFromR2, publicUrlFor } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rows = await db.media.list()
  const media = rows.map(r => ({
    ...r,
    url: publicUrlFor(r.filename),
  }))
  return NextResponse.json({ media })
}

export async function DELETE(request) {
  try {
    const { id } = await request.json()
    const row = await db.media.getById(id)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await deleteFromR2(row.filename)
    await db.media.remove(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
