import { NextResponse } from 'next/server'
import db from '@/lib/db'

export const dynamic = 'force-dynamic'

// Public (see src/proxy.js) so uptime monitors can watch the app.
// Intentionally minimal — no version numbers or config details.
export async function GET() {
  let database = false
  try {
    await db.settings.getAll()
    database = true
  } catch {
    // API unreachable or misconfigured — reported as database: false
  }
  return NextResponse.json({ ok: true, database }, { status: database ? 200 : 503 })
}
