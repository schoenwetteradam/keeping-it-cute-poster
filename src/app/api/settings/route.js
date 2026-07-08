import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { cleanText } from '@/lib/validation'

const DEFAULTS = {
  salonName: 'Keeping It Cute Salon & Spa',
  voice: 'Warm, confident, welcoming, playful, and specific. Never corporate or generic.',
  services: 'Hair color, cuts, styling, protective styles, nails, skincare, and salon services.',
  location: '',
  bookingUrl: '',
  signaturePhrases: '',
  avoidPhrases: 'I am passionate about; I take pride in; elevate your look',
  boothBenefits: 'Supportive team culture, flexible schedules, professional environment, and room to grow an independent beauty business.',
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const rows = await db.settings.getAll()
  const settings = { ...DEFAULTS }
  for (const row of rows) settings[row.key] = row.value
  return NextResponse.json({ settings })
}

export async function PUT(request) {
  try {
    const input = await request.json()
    const provided = input.settings || {}
    const entries = Object.keys(DEFAULTS)
      .filter(key => key in provided)
      .map(key => ({ key, value: cleanText(provided[key], 3000) }))
    if (entries.length) await db.settings.upsertMany(entries)
    return GET()
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
