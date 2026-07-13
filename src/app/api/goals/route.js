import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { cleanText } from '@/lib/validation'

export const dynamic = 'force-dynamic'

function slugify(label) {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'goal'
}

function uniqueSlug(label, existingIds) {
  const base = slugify(label)
  if (!existingIds.includes(base)) return base
  let n = 2
  while (existingIds.includes(`${base}_${n}`)) n++
  return `${base}_${n}`
}

export async function GET() {
  const goals = await db.goals.list()
  return NextResponse.json({ goals })
}

export async function POST(request) {
  try {
    const { label, description, aiGuidance, hashtagsInstagram, hashtagsLinkedin } = await request.json()
    const cleanLabel = cleanText(label, 60)
    if (!cleanLabel) return NextResponse.json({ error: 'Goal label is required.' }, { status: 400 })

    const existing = await db.goals.list()
    const id = uniqueSlug(cleanLabel, existing.map(g => g.id))
    const maxSortOrder = existing.reduce((max, g) => Math.max(max, g.sort_order ?? 0), -1)

    const goal = await db.goals.insert({
      id,
      label: cleanLabel,
      description: cleanText(description, 300),
      ai_guidance: cleanText(aiGuidance, 1000),
      hashtags_instagram: cleanText(hashtagsInstagram, 300),
      hashtags_linkedin: cleanText(hashtagsLinkedin, 300),
      is_builtin: false,
      sort_order: maxSortOrder + 1,
    })
    return NextResponse.json({ goal })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
