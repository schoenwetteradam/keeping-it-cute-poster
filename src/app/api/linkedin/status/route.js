import { NextResponse } from 'next/server'
import { linkedInStatus } from '@/lib/linkedin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await linkedInStatus())
  } catch {
    return NextResponse.json({ connected: false })
  }
}
