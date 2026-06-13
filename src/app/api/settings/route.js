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

export async function GET() {
  const rows = db.prepare('SELECT key, value FROM brand_settings').all()
  const settings = { ...DEFAULTS }
  for (const row of rows) settings[row.key] = row.value
  return NextResponse.json({ settings })
}

export async function PUT(request) {
  try {
    const input = await request.json()
    const update = db.prepare(`
      INSERT INTO brand_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `)
    const save = db.transaction(settings => {
      for (const key of Object.keys(DEFAULTS)) {
        if (key in settings) update.run(key, cleanText(settings[key], 3000))
      }
    })
    save(input.settings || {})
    return GET()
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
