import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { cleanText } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const patch = {}

    if ('label' in body) {
      const label = cleanText(body.label, 60)
      if (!label) return NextResponse.json({ error: 'Goal label is required.' }, { status: 400 })
      patch.label = label
    }
    if ('description' in body) patch.description = cleanText(body.description, 300)
    if ('aiGuidance' in body) patch.ai_guidance = cleanText(body.aiGuidance, 1000)
    if ('hashtagsInstagram' in body) patch.hashtags_instagram = cleanText(body.hashtagsInstagram, 300)
    if ('hashtagsLinkedin' in body) patch.hashtags_linkedin = cleanText(body.hashtagsLinkedin, 300)
    // id and is_builtin are never patchable here — a builtin's id is load-bearing
    // (renter-outcome UI and the booth_renter_* RPCs match 'booth_renters' literally).
    if (!Object.keys(patch).length) return NextResponse.json({ error: 'No editable fields provided.' }, { status: 400 })

    const goal = await db.goals.update(id, patch)
    if (!goal) return NextResponse.json({ error: 'Goal not found.' }, { status: 404 })
    return NextResponse.json({ goal })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const goal = await db.goals.getById(id)
    if (!goal) return NextResponse.json({ error: 'Goal not found.' }, { status: 404 })
    if (goal.is_builtin) return NextResponse.json({ error: "Built-in goals can't be deleted, only edited." }, { status: 400 })
    await db.goals.remove(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
