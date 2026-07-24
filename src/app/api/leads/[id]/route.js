import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { cleanText } from '@/lib/validation'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = new Set(['new', 'contacted', 'touring', 'signed', 'lost'])

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const patch = {}

    if ('status' in body) {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
      }
      patch.status = body.status
      // Moving a lead out of "new" means someone acted on it — stamp the
      // contact time so the stale-lead nudge stops flagging it.
      if (body.status !== 'new') patch.last_contacted_at = new Date().toISOString()
    }
    if ('statusNotes' in body) patch.status_notes = cleanText(body.statusNotes, 2000)
    if ('markContacted' in body && body.markContacted) patch.last_contacted_at = new Date().toISOString()

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: 'No changes provided.' }, { status: 400 })
    }

    const lead = await db.leads.update(id, patch)
    if (!lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Update lead error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
