import db from '@/lib/db'

const TOKEN_KEY = 'linkedin_token'

export async function saveLinkedInToken(token) {
  await db.appState.set(TOKEN_KEY, token)
}

// Returns { access_token, expires_at } or null when not connected / expired.
export async function getLinkedInToken() {
  const token = await db.appState.get(TOKEN_KEY)
  if (!token?.access_token) return null
  if (token.expires_at && Date.now() > token.expires_at) return null
  return token
}

export async function linkedInStatus() {
  const token = await db.appState.get(TOKEN_KEY)
  if (!token?.access_token) return { connected: false }
  const expired = Boolean(token.expires_at && Date.now() > token.expires_at)
  return { connected: true, expired }
}
