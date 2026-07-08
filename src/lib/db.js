import { createHmac } from 'crypto'

const API_URL = (process.env.SALON_API_URL || '').replace(/\/+$/, '')
const API_KEY = process.env.SALON_API_KEY || ''
const JWT_SECRET = process.env.SALON_JWT_SECRET || ''

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Signs a short-lived JWT for the "salon_app_user" Postgres role. PostgREST
// verifies the signature against SALON_JWT_SECRET and switches into
// whichever role the "role" claim names.
function writerToken() {
  if (!JWT_SECRET) throw new Error('SALON_JWT_SECRET is not configured.')
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({ role: 'salon_app_user', exp: Math.floor(Date.now() / 1000) + 300 }))
  const data = `${header}.${payload}`
  const signature = createHmac('sha256', JWT_SECRET).update(data).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${data}.${signature}`
}

async function api(path, { method = 'GET', body, write = false, prefer } = {}) {
  if (!API_URL || !API_KEY) throw new Error('SALON_API_URL and SALON_API_KEY must be configured.')

  const res = await fetch(`${API_URL}${path}`, {
    method,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...(write ? { Authorization: `Bearer ${writerToken()}` } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) {
    let message = `Request to ${path} failed with status ${res.status}`
    try {
      const err = await res.json()
      message = err.message || err.hint || message
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message)
  }

  if (res.status === 204) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

const first = rows => (Array.isArray(rows) && rows.length ? rows[0] : null)

function dayRange(dateStr) {
  const start = new Date(`${dateStr}T00:00:00.000Z`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return [start.toISOString(), end.toISOString()]
}

const db = {
  media: {
    list: () => api('/media?select=*&order=created_at.desc'),
    getByFilename: filename => api(`/media?select=*&filename=eq.${encodeURIComponent(filename)}`).then(first),
    getById: id => api(`/media?select=*&id=eq.${id}`).then(first),
    insert: row => api('/media', {
      method: 'POST', write: true, prefer: 'return=representation', body: [row],
    }).then(first),
    remove: id => api(`/media?id=eq.${id}`, { method: 'DELETE', write: true }),
  },

  posts: {
    list: ({ platform, goal, status, date, limit = 20 } = {}) => {
      const search = new URLSearchParams()
      search.set('select', '*')
      search.set('order', 'created_at.desc')
      search.set('limit', String(limit))
      if (platform) search.set('platform', `eq.${platform}`)
      if (goal) search.set('goal', `eq.${goal}`)
      if (status === 'scheduled') { search.set('publish_status', 'eq.scheduled'); search.set('posted', 'eq.false') }
      if (status === 'failed') { search.set('publish_status', 'eq.failed'); search.set('posted', 'eq.false') }
      if (date) {
        const [start, end] = dayRange(date)
        search.append('created_at', `gte.${start}`)
        search.append('created_at', `lt.${end}`)
      }
      return api(`/generated_posts_enriched?${search.toString()}`)
    },
    summary: () => api('/rpc/posts_summary', { method: 'POST', body: {} }).then(first),
    performance: () => api('/rpc/posts_performance', { method: 'POST', body: {} }),
    topExamples: (platform, goal, limit = 3) => api('/rpc/top_examples', {
      method: 'POST', body: { p_platform: platform, p_goal: goal, p_limit: limit },
    }),

    getById: id => api(`/generated_posts?select=*&id=eq.${id}`).then(first),
    insertMany: rows => api('/generated_posts', {
      method: 'POST', write: true, prefer: 'return=representation', body: rows,
    }),
    updateText: (id, postText) => api(`/generated_posts?id=eq.${id}`, {
      method: 'PATCH', write: true, prefer: 'return=representation', body: { post_text: postText },
    }),
    updateEngagement: (id, { likes, comments, shares, reach }) => api(`/generated_posts?id=eq.${id}`, {
      method: 'PATCH', write: true,
      body: { likes, comments, shares, reach, engagement_updated_at: new Date().toISOString() },
    }),

    listScheduled: () => api('/generated_posts_enriched?select=*&scheduled_at=not.is.null&posted=eq.false&order=scheduled_at.asc'),
    setSchedule: (id, scheduledAt) => api(`/generated_posts?id=eq.${id}`, {
      method: 'PATCH', write: true, body: { scheduled_at: scheduledAt, publish_status: 'scheduled' },
    }),
    clearSchedule: id => api(`/generated_posts?id=eq.${id}`, {
      method: 'PATCH', write: true, body: { scheduled_at: null, publish_status: 'draft' },
    }),
    listDue: () => api(
      `/generated_posts?select=*&publish_status=eq.scheduled&scheduled_at=not.is.null&scheduled_at=lte.${encodeURIComponent(new Date().toISOString())}&posted=eq.false`
    ),
    listPostedOnFacebook: () => api('/generated_posts?select=*&posted=eq.true&facebook_post_id=not.is.null')
      .then(rows => rows.filter(row => row.facebook_post_id)),

    markPosted: (id, platform, externalId) => api('/rpc/mark_posted', {
      method: 'POST', write: true,
      body: { p_post_id: id, p_platform: platform, p_external_id: externalId || '' },
    }).then(first),
    markFailed: id => api('/rpc/mark_failed', { method: 'POST', write: true, body: { p_post_id: id } }).then(first),
    markFacebookPosted: (id, externalId) => api(`/generated_posts?id=eq.${id}`, {
      method: 'PATCH', write: true,
      body: { posted: true, facebook_post_id: externalId, external_post_id: externalId, posted_at: new Date().toISOString() },
    }),
    markExternalPosted: (id, externalId) => api(`/generated_posts?id=eq.${id}`, {
      method: 'PATCH', write: true,
      body: { posted: true, external_post_id: externalId, posted_at: new Date().toISOString() },
    }),
  },

  ratings: {
    upsert: ({ postId, rating, notes, ratedBy }) => api('/post_ratings?on_conflict=post_id,rated_by', {
      method: 'POST', write: true, prefer: 'resolution=merge-duplicates,return=representation',
      body: [{ post_id: postId, rating, notes: notes || '', rated_by: ratedBy || '', created_at: new Date().toISOString() }],
    }).then(first),
  },

  settings: {
    getAll: () => api('/brand_settings?select=key,value'),
    upsertMany: entries => api('/brand_settings?on_conflict=key', {
      method: 'POST', write: true, prefer: 'resolution=merge-duplicates',
      body: entries.map(({ key, value }) => ({ key, value, updated_at: new Date().toISOString() })),
    }),
  },

  templates: {
    list: () => api('/post_templates?select=*&order=created_at.desc'),
    insert: row => api('/post_templates', {
      method: 'POST', write: true, prefer: 'return=representation', body: [row],
    }).then(first),
    remove: id => api(`/post_templates?id=eq.${id}`, { method: 'DELETE', write: true }),
  },

  // Server-side state (OAuth tokens etc.). web_anon has no access to this
  // table, so even reads go through the salon_app_user JWT.
  appState: {
    get: key => api(`/app_state?select=value&key=eq.${encodeURIComponent(key)}`, { write: true })
      .then(rows => first(rows)?.value ?? null),
    set: (key, value) => api('/app_state?on_conflict=key', {
      method: 'POST', write: true, prefer: 'resolution=merge-duplicates',
      body: [{ key, value, updated_at: new Date().toISOString() }],
    }),
  },
}

export default db
