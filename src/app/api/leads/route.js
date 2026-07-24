import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { cleanText } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// POST is public (called by the /rent landing page form) — the proxy lets it
// through the admin gate. GET is NOT public; the proxy keeps it behind auth.

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    // A public endpoint — cap submissions per IP to blunt spam/abuse.
    if (!rateLimit(`lead:${ip}`, 5)) {
      return NextResponse.json({ error: 'Too many submissions. Please try again in a minute.' }, { status: 429 })
    }

    const body = await request.json()

    // Honeypot: a hidden field real people never see. If it's filled, a bot
    // did it — return success so the bot moves on, but drop the submission.
    if (cleanText(body.company, 100)) {
      return NextResponse.json({ success: true })
    }

    const name = cleanText(body.name, 120)
    const phone = cleanText(body.phone, 40)
    const email = cleanText(body.email, 200)

    if (!name) {
      return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
    }
    if (!phone && !email) {
      return NextResponse.json({ error: 'Please leave a phone number or email so we can reach you.' }, { status: 400 })
    }

    const lead = await db.leads.insert({
      name,
      phone,
      email,
      services: cleanText(body.services, 200),
      license_status: cleanText(body.licenseStatus, 120),
      current_situation: cleanText(body.currentSituation, 120),
      client_base: cleanText(body.clientBase, 120),
      timeframe: cleanText(body.timeframe, 120),
      availability: cleanText(body.availability, 120),
      message: cleanText(body.message, 2000),
      source: 'landing_page',
      status: 'new',
    })

    return NextResponse.json({ success: true, id: lead?.id })
  } catch (error) {
    console.error('Lead submission error:', error)
    return NextResponse.json({ error: 'Something went wrong sending your info. Please try again.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const leads = await db.leads.list()
    return NextResponse.json({ leads })
  } catch (error) {
    console.error('List leads error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
