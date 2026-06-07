import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    const tokenPath = join(process.cwd(), '.linkedin-token.json')

    if (!existsSync(tokenPath)) {
      return NextResponse.json({ connected: false })
    }

    const raw = readFileSync(tokenPath, 'utf8')
    const token = JSON.parse(raw)

    if (!token.access_token) {
      return NextResponse.json({ connected: false })
    }

    const expired = token.expires_at && Date.now() > token.expires_at

    return NextResponse.json({ connected: true, expired: !!expired })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
