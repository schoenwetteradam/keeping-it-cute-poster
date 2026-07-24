'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', color: 'bg-blue-600' },
  { id: 'instagram', label: 'Instagram', color: 'bg-fuchsia-600' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-sky-700' },
]

// Shown until /api/goals resolves (or if it fails) so the dropdown is never empty.
const FALLBACK_GOALS = [
  { id: 'booth_renters', label: 'Attract Booth Renters', description: 'Reach independent beauty professionals looking for their next salon home.' },
  { id: 'new_clients', label: 'Attract New Clients', description: 'Help potential clients picture the service, result, and experience.' },
  { id: 'showcase', label: 'Showcase My Work', description: 'Share a transformation, technique, or service without a hard sell.' },
  { id: 'community', label: 'Build Community', description: 'Share tips, celebrate the team, or start a genuine conversation.' },
]

const VARIANTS = [
  { id: 'balanced', label: 'Balanced' },
  { id: 'personal', label: 'Personal' },
  { id: 'bold', label: 'Bold' },
]

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100'
const panelClass = 'rounded-2xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6'

// PostgREST returns jsonb columns as already-parsed JSON, not a string — but
// older cached rows or manual edits could still hand back a string, so accept both.
function parsePlatforms(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return [] }
  }
  return []
}

async function api(url, options) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Something went wrong.')
  return data
}

function Notice({ type = 'info', children }) {
  const styles = {
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-red-200 bg-red-50 text-red-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  }
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles[type]}`}>{children}</div>
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button type="button" onClick={copy} className="rounded-lg border border-pink-200 px-3 py-2 text-xs font-semibold text-pink-700 hover:bg-pink-50">
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function RatingCard({ postId, employeeName }) {
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('idle')

  const submit = async () => {
    if (!rating) return
    setStatus('saving')
    try {
      await api(`/api/posts/${postId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, notes, ratedBy: employeeName }),
      })
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  if (!postId) return null
  if (status === 'saved') return <p className="mt-4 border-t border-pink-100 pt-3 text-xs font-semibold text-emerald-600">Feedback saved. Future drafts will learn from it.</p>

  return (
    <div className="mt-4 border-t border-pink-100 pt-3">
      <p className="mb-2 text-xs font-semibold text-slate-500">Rate this draft to improve future suggestions</p>
      <div className="flex gap-1" aria-label="Post rating">
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button" onClick={() => setRating(star)} className={`text-xl ${rating >= star ? 'text-amber-400' : 'text-slate-200'}`} aria-label={`${star} stars`}>
            ★
          </button>
        ))}
      </div>
      {rating > 0 ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} placeholder="Optional: too formal, great hook, more playful..." />
          <button type="button" onClick={submit} disabled={status === 'saving'} className="shrink-0 rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {status === 'saving' ? 'Saving...' : 'Save rating'}
          </button>
        </div>
      ) : null}
      {status === 'error' ? <p className="mt-2 text-xs text-red-600">Could not save the rating.</p> : null}
    </div>
  )
}

const RENTER_OUTCOMES = [
  { id: 'inquiry', label: 'Got an inquiry' },
  { id: 'tour_scheduled', label: 'Tour scheduled' },
  { id: 'signed', label: 'Renter signed!' },
]

function RenterOutcomeControl({ postId, initialOutcome = null }) {
  const [current, setCurrent] = useState(initialOutcome)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!postId) return null

  const setOutcome = async outcomeId => {
    const next = current === outcomeId ? null : outcomeId
    setSaving(true)
    setError('')
    try {
      await api(`/api/posts/${postId}/renter-outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: next }),
      })
      setCurrent(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 border-t border-amber-100 pt-3">
      <p className="mb-2 text-xs font-semibold text-slate-500">Real-world outcome — did this bring in a renter?</p>
      <div className="flex flex-wrap gap-2">
        {RENTER_OUTCOMES.map(o => (
          <button
            key={o.id}
            type="button"
            disabled={saving}
            onClick={() => setOutcome(o.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
              current === o.id ? 'bg-amber-500 text-white' : 'border border-amber-200 text-amber-700 hover:bg-amber-50'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

function MediaPreview({ item, className = '' }) {
  if (!item) return null
  const type = item.mime_type || item.type || ''
  if (type.startsWith('video/')) return <video src={item.url} controls className={className} />
  return <img src={item.url} alt={item.original_name || 'Selected media'} className={className} />
}

// ── Image Crop Modal ──────────────────────────────────────────────────────────

function ImageCropModal({ src, fileName, onConfirm, onCancel }) {
  const imgRef = useRef(null)
  const containerRef = useRef(null)
  const [drag, setDrag] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const getPos = e => {
    const rect = containerRef.current.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    }
  }

  const onMouseDown = e => {
    e.preventDefault()
    const pos = getPos(e)
    setDrag({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
    setIsDragging(true)
  }
  const onMouseMove = e => {
    if (!isDragging) return
    const pos = getPos(e)
    setDrag(d => ({ ...d, currentX: pos.x, currentY: pos.y }))
  }
  const onMouseUp = () => setIsDragging(false)

  const cropRect = drag ? {
    left: Math.min(drag.startX, drag.currentX),
    top: Math.min(drag.startY, drag.currentY),
    width: Math.abs(drag.currentX - drag.startX),
    height: Math.abs(drag.currentY - drag.startY),
  } : null

  const hasCrop = cropRect && cropRect.width > 10 && cropRect.height > 10

  const confirmCrop = () => {
    if (!hasCrop) { onConfirm(null); return }
    const img = imgRef.current
    const containerRect = containerRef.current.getBoundingClientRect()
    const scaleX = img.naturalWidth / containerRect.width
    const scaleY = img.naturalHeight / containerRect.height
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(cropRect.width * scaleX)
    canvas.height = Math.round(cropRect.height * scaleY)
    canvas.getContext('2d').drawImage(
      img,
      cropRect.left * scaleX, cropRect.top * scaleY,
      canvas.width, canvas.height,
      0, 0, canvas.width, canvas.height
    )
    canvas.toBlob(blob => onConfirm(new File([blob], fileName, { type: 'image/jpeg' })), 'image/jpeg', 0.92)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 overflow-auto max-h-[95vh]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Crop image</h3>
          <p className="text-xs text-slate-400">Drag to select the area to keep</p>
        </div>
        <div
          ref={containerRef}
          className="relative select-none overflow-hidden rounded-xl bg-slate-100 cursor-crosshair"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <img
            ref={imgRef}
            src={src}
            alt="Crop"
            className="block w-full pointer-events-none"
            style={{ maxHeight: '60vh', objectFit: 'contain' }}
            draggable={false}
          />
          {hasCrop && (
            <div
              className="absolute border-2 border-white pointer-events-none"
              style={{
                left: cropRect.left, top: cropRect.top,
                width: cropRect.width, height: cropRect.height,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              }}
            />
          )}
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={confirmCrop} className="rounded-xl bg-pink-600 px-5 py-2 text-sm font-bold text-white">
            {hasCrop ? 'Apply crop' : 'Use original'}
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-bold text-slate-600">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Platform Preview Cards ────────────────────────────────────────────────────

function FacebookPreview({ text, imageUrl, salonName }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white overflow-hidden text-sm shadow">
      <div className="flex items-center gap-3 p-4 border-b border-slate-100">
        <div className="h-10 w-10 rounded-full bg-pink-500 flex items-center justify-center text-white font-black text-base shrink-0">
          {(salonName || 'K')[0]}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{salonName || 'Keeping It Cute'}</p>
          <p className="text-xs text-slate-400">Just now · 🌐</p>
        </div>
      </div>
      <p className="px-4 py-3 text-slate-800 whitespace-pre-line leading-6">{text}</p>
      {imageUrl && <img src={imageUrl} alt="" className="w-full object-cover max-h-64" />}
      <div className="flex gap-5 border-t border-slate-100 px-4 py-3 text-slate-500 text-xs font-semibold">
        <span>👍 Like</span><span>💬 Comment</span><span>↗ Share</span>
      </div>
    </div>
  )
}

function InstagramPreview({ text, imageUrl }) {
  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white overflow-hidden shadow">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-amber-400 shrink-0" />
        <p className="text-sm font-semibold text-slate-900">keepingitcute</p>
      </div>
      {imageUrl
        ? <img src={imageUrl} alt="" className="w-full aspect-square object-cover" />
        : <div className="aspect-square bg-gradient-to-br from-pink-50 to-amber-50 flex items-center justify-center text-slate-300 text-sm">No image selected</div>
      }
      <div className="p-3">
        <div className="flex gap-4 mb-2 text-xl">
          <span>🤍</span><span>💬</span><span>➤</span>
        </div>
        <p className="text-xs text-slate-800 leading-5 whitespace-pre-line">
          <span className="font-semibold">keepingitcute </span>{text}
        </p>
      </div>
    </div>
  )
}

function LinkedInPreview({ text, imageUrl, salonName }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white overflow-hidden text-sm shadow">
      <div className="flex items-start gap-3 p-4">
        <div className="h-12 w-12 rounded-full bg-sky-700 flex items-center justify-center text-white font-black text-lg shrink-0">
          {(salonName || 'K')[0]}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{salonName || 'Keeping It Cute'}</p>
          <p className="text-xs text-slate-500">Salon & Spa · Just now · 🌐</p>
        </div>
      </div>
      <p className="px-4 pb-3 text-slate-800 whitespace-pre-line leading-6">{text}</p>
      {imageUrl && <img src={imageUrl} alt="" className="w-full object-cover max-h-60" />}
      <div className="flex gap-4 border-t border-slate-100 px-4 py-3 text-slate-500 text-xs font-semibold">
        <span>👍 Like</span><span>💬 Comment</span><span>🔁 Repost</span><span>➤ Send</span>
      </div>
    </div>
  )
}

function PlatformPreview({ platform, text, imageUrl, salonName }) {
  if (platform === 'facebook') return <FacebookPreview text={text} imageUrl={imageUrl} salonName={salonName} />
  if (platform === 'instagram') return <InstagramPreview text={text} imageUrl={imageUrl} />
  if (platform === 'linkedin') return <LinkedInPreview text={text} imageUrl={imageUrl} salonName={salonName} />
  return null
}

// ── Media Library ─────────────────────────────────────────────────────────────

function MediaLibrary({ onUse }) {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const data = await api('/api/media')
      setMedia(data.media || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const upload = async file => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      await api('/api/media/upload', { method: 'POST', body })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const remove = async id => {
    if (!window.confirm('Delete this media file?')) return
    try {
      await api('/api/media', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Salon Media Library</h2>
            <p className="mt-1 text-sm text-slate-500">Keep approved photos and videos ready for the whole team.</p>
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-xl bg-pink-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Upload media'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" className="hidden" onChange={e => upload(e.target.files?.[0])} />
        </div>
        {error ? <div className="mt-4"><Notice type="error">{error}</Notice></div> : null}
      </section>
      <section className={panelClass}>
        {loading ? <p className="text-sm text-slate-400">Loading media...</p> : null}
        {!loading && media.length === 0 ? <p className="text-sm text-slate-400">No media yet. Upload the salon's best work to get started.</p> : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {media.map(item => (
            <article key={item.id} className="overflow-hidden rounded-xl border border-pink-100 bg-slate-50">
              <MediaPreview item={item} className="h-36 w-full object-cover" />
              <div className="p-3">
                <p className="truncate text-xs font-medium text-slate-600">{item.original_name}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => onUse(item)} className="flex-1 rounded-lg bg-pink-600 px-2 py-2 text-xs font-bold text-white">Use</button>
                  <button type="button" onClick={() => remove(item.id)} className="rounded-lg border border-red-200 px-2 py-2 text-xs font-bold text-red-600">Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

// ── Settings / Brand Brain ────────────────────────────────────────────────────

function StaffRosterField({ value, onChange }) {
  const names = (value || '').split('\n').map(s => s.trim()).filter(Boolean)
  const [draft, setDraft] = useState('')

  const add = () => {
    const name = draft.trim()
    if (!name || names.includes(name)) { setDraft(''); return }
    onChange([...names, name].join('\n'))
    setDraft('')
  }

  const remove = name => onChange(names.filter(n => n !== name).join('\n'))

  return (
    <div className="sm:col-span-2">
      <span className="mb-2 block text-sm font-semibold text-slate-700">Staff roster</span>
      <p className="mb-2 text-xs text-slate-400">Names shown in the &quot;Your name&quot; dropdown on the Create tab.</p>
      {names.length ? (
        <ul className="mb-3 flex flex-wrap gap-2">
          {names.map(name => (
            <li key={name} className="flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1.5 text-sm font-semibold text-pink-700">
              {name}
              <button type="button" onClick={() => remove(name)} className="text-pink-400 hover:text-pink-700" aria-label={`Remove ${name}`}>×</button>
            </li>
          ))}
        </ul>
      ) : <p className="mb-3 text-sm text-slate-400">No staff added yet — everyone will type their name freely until you add some.</p>}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          className={inputClass}
          placeholder="Add a staff member"
        />
        <button type="button" onClick={add} className="whitespace-nowrap rounded-xl border border-pink-200 px-4 py-2 text-sm font-bold text-pink-700 hover:bg-pink-50">Add</button>
      </div>
    </div>
  )
}

function StaffNameField({ value, onChange, roster }) {
  const [useCustom, setUseCustom] = useState(false)

  if (!roster.length || useCustom) {
    return (
      <div>
        <input value={value} onChange={e => onChange(e.target.value)} className={inputClass} placeholder="Jessica" required />
        {roster.length ? (
          <button type="button" onClick={() => { setUseCustom(false); onChange('') }} className="mt-1 text-xs font-semibold text-pink-600 hover:underline">
            Choose from staff list
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <select
      value={roster.includes(value) ? value : ''}
      onChange={e => {
        if (e.target.value === '__other__') { setUseCustom(true); onChange('') }
        else onChange(e.target.value)
      }}
      className={inputClass}
      required
    >
      <option value="" disabled>Select your name</option>
      {roster.map(name => <option key={name} value={name}>{name}</option>)}
      <option value="__other__">Someone else…</option>
    </select>
  )
}

function SettingsTab() {
  const [settings, setSettings] = useState(null)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [envStatus, setEnvStatus] = useState(null)

  useEffect(() => {
    api('/api/settings')
      .then(data => { setSettings(data.settings); setStatus('idle') })
      .catch(err => { setMessage(err.message); setStatus('error') })
    api('/api/settings/env-status').catch(() => null).then(d => d && setEnvStatus(d))
  }, [])

  const save = async e => {
    e.preventDefault()
    setStatus('saving')
    try {
      const data = await api('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings }) })
      setSettings(data.settings)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    } catch (err) {
      setMessage(err.message)
      setStatus('error')
    }
  }

  if (!settings) return <section className={panelClass}><p className="text-sm text-slate-400">Loading the Brand Brain...</p></section>

  const fields = [
    ['salonName', 'Salon name', 'text'],
    ['voice', 'Brand voice', 'textarea'],
    ['services', 'Services and specialties', 'textarea'],
    ['location', 'Location and service area', 'text'],
    ['bookingUrl', 'Booking URL', 'url'],
    ['signaturePhrases', 'Signature phrases', 'textarea'],
    ['avoidPhrases', 'Phrases or claims to avoid', 'textarea'],
    ['boothBenefits', 'Booth renter benefits', 'textarea'],
  ]

  const ENV_VARS = [
    { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', required: true },
    { key: 'FACEBOOK_PAGE_ID', label: 'Facebook Page ID', required: false },
    { key: 'FACEBOOK_PAGE_ACCESS_TOKEN', label: 'Facebook Page Access Token', required: false },
    { key: 'INSTAGRAM_BUSINESS_ACCOUNT_ID', label: 'Instagram Business Account ID', required: false },
    { key: 'LINKEDIN_COMPANY_ID', label: 'LinkedIn Company ID (optional)', required: false },
  ]

  return (
    <div className="space-y-6">
      <form onSubmit={save} className={panelClass}>
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">Salon Brand Brain</h2>
          <p className="mt-1 text-sm text-slate-500">These facts and voice rules are used in every generated draft.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map(([key, label, type]) => (
            <label key={key} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
              <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
              {type === 'textarea' ? (
                <textarea rows={3} value={settings[key]} onChange={e => setSettings(c => ({ ...c, [key]: e.target.value }))} className={inputClass} />
              ) : (
                <input type={type} value={settings[key]} onChange={e => setSettings(c => ({ ...c, [key]: e.target.value }))} className={inputClass} />
              )}
            </label>
          ))}
          <StaffRosterField value={settings.staffRoster} onChange={v => setSettings(c => ({ ...c, staffRoster: v }))} />
        </div>
        {status === 'error' ? <div className="mt-4"><Notice type="error">{message}</Notice></div> : null}
        <button type="submit" disabled={status === 'saving'} className="mt-6 rounded-xl bg-pink-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved ✓' : 'Save Brand Brain'}
        </button>
      </form>

      <section className={panelClass}>
        <h2 className="mb-1 text-lg font-bold text-slate-900">Platform Credentials</h2>
        <p className="mb-4 text-sm text-slate-500">
          All API keys and tokens are stored as environment variables in <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env.local</code> — never in the database. Set them on the server and restart.
        </p>
        <div className="space-y-2">
          {ENV_VARS.map(({ key, label, required }) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                <p className="text-xs text-slate-400 font-mono">{key}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${required ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-500'}`}>
                {required ? 'Required' : 'Optional'}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-400">LinkedIn uses OAuth — connect via the LinkedIn button on any post draft.</p>
      </section>

      <GoalsManager />
    </div>
  )
}

function GoalEditor({ goal, onSave, onCancel }) {
  const [label, setLabel] = useState(goal.label)
  const [description, setDescription] = useState(goal.description)
  const [aiGuidance, setAiGuidance] = useState(goal.ai_guidance)
  const [hashtagsInstagram, setHashtagsInstagram] = useState(goal.hashtags_instagram)
  const [hashtagsLinkedin, setHashtagsLinkedin] = useState(goal.hashtags_linkedin)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!label.trim()) { setError('Label is required.'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({ label, description, aiGuidance, hashtagsInstagram, hashtagsLinkedin })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-pink-100 bg-white p-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">Label</span>
        <input value={label} onChange={e => setLabel(e.target.value)} className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">Description (shown under the dropdown on Create)</span>
        <input value={description} onChange={e => setDescription(e.target.value)} className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">AI guidance — what should this type of post do, and how should it sound?</span>
        <textarea rows={2} value={aiGuidance} onChange={e => setAiGuidance(e.target.value)} className={inputClass} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Instagram hashtag pool</span>
          <input value={hashtagsInstagram} onChange={e => setHashtagsInstagram(e.target.value)} className={inputClass} placeholder="#salonlife #btccuts ..." />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">LinkedIn hashtag pool</span>
          <input value={hashtagsLinkedin} onChange={e => setHashtagsLinkedin(e.target.value)} className={inputClass} placeholder="#beauty #hairstylist ..." />
        </label>
      </div>
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">Cancel</button>
      </div>
    </div>
  )
}

function NewGoalForm({ onCreate, onCancel }) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const create = async () => {
    if (!label.trim()) { setError('Label is required.'); return }
    setSaving(true)
    setError('')
    try {
      await onCreate({ label: label.trim(), description: description.trim() })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-pink-200 bg-white p-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">Label</span>
        <input value={label} onChange={e => setLabel(e.target.value)} className={inputClass} placeholder="e.g. Holiday Promo" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">Description (shown under the dropdown on Create)</span>
        <input value={description} onChange={e => setDescription(e.target.value)} className={inputClass} placeholder="e.g. Promote seasonal specials and gift cards" />
      </label>
      <p className="text-xs text-slate-400">You can add AI guidance and hashtags after creating it.</p>
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button type="button" onClick={create} disabled={saving} className="rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
          {saving ? 'Adding...' : 'Add goal'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">Cancel</button>
      </div>
    </div>
  )
}

function GoalsManager() {
  const [goals, setGoals] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/goals').then(d => setGoals(d.goals || [])).catch(err => setError(err.message))
  }, [])

  const saveGoal = async (id, patch) => {
    const data = await api(`/api/goals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    setGoals(gs => gs.map(g => g.id === id ? data.goal : g))
    setEditingId(null)
  }

  const createGoal = async payload => {
    const data = await api('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setGoals(gs => [...gs, data.goal])
    setCreating(false)
  }

  const removeGoal = async id => {
    setDeletingId(id)
    try {
      await api(`/api/goals/${id}`, { method: 'DELETE' })
      setGoals(gs => gs.filter(g => g.id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (!goals) return <section className={panelClass}><p className="text-sm text-slate-400">Loading content goals...</p></section>

  return (
    <section className={panelClass}>
      <h2 className="mb-1 text-lg font-bold text-slate-900">Content Goals</h2>
      <p className="mb-4 text-sm text-slate-500">
        These drive the &quot;Post goal&quot; dropdown on Create and shape how the AI writes for each one.
        The four built-in goals can be edited but not deleted. Changes appear on Create after a page refresh.
      </p>
      {error ? <div className="mb-3"><Notice type="error">{error}</Notice></div> : null}
      <div className="space-y-2">
        {goals.map(g => (
          <div key={g.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {g.label}
                  {g.is_builtin ? <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">Built-in</span> : null}
                </p>
                <p className="text-xs text-slate-400">{g.description}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => setEditingId(editingId === g.id ? null : g.id)} className="rounded-lg border border-pink-200 px-3 py-1.5 text-xs font-bold text-pink-700 hover:bg-pink-50">
                  {editingId === g.id ? 'Close' : 'Edit'}
                </button>
                {!g.is_builtin ? (
                  <button type="button" onClick={() => removeGoal(g.id)} disabled={deletingId === g.id} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 disabled:opacity-50">
                    {deletingId === g.id ? '...' : 'Delete'}
                  </button>
                ) : null}
              </div>
            </div>
            {editingId === g.id ? <GoalEditor goal={g} onSave={patch => saveGoal(g.id, patch)} onCancel={() => setEditingId(null)} /> : null}
          </div>
        ))}
      </div>
      {creating ? (
        <NewGoalForm onCreate={createGoal} onCancel={() => setCreating(false)} />
      ) : (
        <button type="button" onClick={() => setCreating(true)} className="mt-4 rounded-xl border border-pink-200 px-4 py-2 text-sm font-bold text-pink-700 hover:bg-pink-50">
          + Add a content goal
        </button>
      )}
    </section>
  )
}

// ── Help ──────────────────────────────────────────────────────────────────────

function HelpStep({ n, children }) {
  return (
    <li className="flex gap-3 rounded-xl border border-slate-100 bg-white p-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-600 text-xs font-bold text-white">{n}</span>
      <div className="text-sm text-slate-700">{children}</div>
    </li>
  )
}

function HelpNote({ type = 'info', children }) {
  const styles = {
    info: 'border-pink-500 bg-pink-50 text-pink-900',
    good: 'border-emerald-500 bg-emerald-50 text-emerald-900',
    warn: 'border-amber-500 bg-amber-50 text-amber-900',
  }
  const tagStyles = { info: 'text-pink-600', good: 'text-emerald-600', warn: 'text-amber-600' }
  const tags = { info: 'Note', good: 'Why it matters', warn: 'Heads up' }
  return (
    <div className={`mt-4 rounded-xl border-l-4 px-4 py-3 text-sm ${styles[type]}`}>
      <p className={`mb-1 text-xs font-bold uppercase tracking-wide ${tagStyles[type]}`}>{tags[type]}</p>
      {children}
    </div>
  )
}

function HelpSection({ id, num, title, lede, children }) {
  return (
    <section id={id} className={panelClass}>
      <h2 className="mb-1 text-lg font-bold text-slate-900">
        <span className="mr-2 font-mono text-sm font-normal text-pink-600">{num}</span>{title}
      </h2>
      {lede ? <p className="mb-4 text-sm text-slate-500">{lede}</p> : null}
      {children}
    </section>
  )
}

function HelpTab() {
  return (
    <div className="space-y-5">
      <div className={panelClass}>
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-pink-600">Keeping It Cute Salon &amp; Spa · Internal Reference</p>
        <h1 className="text-2xl font-black text-slate-900">The Content Assistant, front to back</h1>
        <p className="mt-2 text-sm text-slate-500">Everything you need to draft, polish, schedule, and learn from social posts — without touching a line of code.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5"><b className="text-slate-500">Web address</b> <code className="ml-1 text-pink-600">social.keepingitcute.net</code></span>
          <span className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5"><b className="text-slate-500">Login</b> ask Adam or Jessica for the username/password</span>
          <span className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5"><b className="text-slate-500">Works on</b> phone, tablet, or computer</span>
        </div>
      </div>

      <HelpSection id="start" num="01" title="Getting in" lede="One shared login for the whole team — no personal accounts to manage.">
        <ol className="space-y-2">
          <HelpStep n={1}>Go to <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">social.keepingitcute.net</code> on any device.</HelpStep>
          <HelpStep n={2}>Your browser will ask for a username and password — this is the shared salon login, not your personal email. Get it from Adam or Jessica if you don&apos;t have it yet.</HelpStep>
          <HelpStep n={3}>You&apos;ll land on the <b>Create</b> tab. That&apos;s the home screen every time you log in.</HelpStep>
        </ol>
      </HelpSection>

      <HelpSection id="create" num="02" title="Creating a post" lede="You write the raw idea; the assistant turns it into three ready-to-post directions per platform.">
        <ol className="space-y-2">
          <HelpStep n={1}><b>Enter your name</b> in Your name — posts are written in your voice, first-person. If the salon has set up a staff list in Brand Brain, this is a dropdown; otherwise just type it.</HelpStep>
          <HelpStep n={2}><b>Pick a goal</b> from Post goal. This changes how the post is written, not just the topic — pick the one that matches your actual intent. Goals can be added or renamed in Brand Brain, so this list may grow over time.</HelpStep>
          <HelpStep n={3}><b>Describe the post</b> in What should the post say? — be specific. &quot;Balayage on curly hair, client wanted a low-maintenance grow-out&quot; writes a far better post than &quot;did a color today.&quot;</HelpStep>
          <HelpStep n={4}><b>Add a photo or video</b> (optional but strongly recommended) — Upload new for a fresh file, or Choose library to reuse something already uploaded. You can crop after selecting.</HelpStep>
          <HelpStep n={5}><b>Check the platforms</b> you want drafts for — Facebook, Instagram, LinkedIn. Uncheck any that don&apos;t apply.</HelpStep>
          <HelpStep n={6}>Click <b>Generate smart drafts</b> and wait a few seconds.</HelpStep>
        </ol>
        <HelpNote type="good">
          The assistant looks back at your salon&apos;s own best-performing past posts for that exact goal before writing — a &quot;Showcase&quot; post and a &quot;Booth Renters&quot; post pull from completely different examples. Picking the right goal is one of the biggest levers you have over post quality.
        </HelpNote>
        <HelpNote type="info">
          Already have a setup you like — same goal, same notes, same platforms? Click <b>Load template</b> above the goal picker instead of starting from scratch, or save your current setup as a new one with <b>Save as template</b> after generating.
        </HelpNote>
      </HelpSection>

      <HelpSection id="publish" num="03" title="Reviewing & publishing" lede="Every platform gets three directions: Balanced, Personal, and Bold. Pick, edit, and send.">
        <ol className="space-y-2">
          <HelpStep n={1}>For each platform, click between <b>Balanced</b> / <b>Personal</b> / <b>Bold</b> to compare directions.</HelpStep>
          <HelpStep n={2}>Edit the text directly in the box if anything needs a tweak — a name, a price, a fact. Click <b>Preview</b> to see roughly how it&apos;ll look on the actual platform.</HelpStep>
          <HelpStep n={3}>Click <b>Save draft</b> to lock in your edits before doing anything else.</HelpStep>
          <HelpStep n={4}>When it&apos;s ready, click <b>Publish to Facebook</b> / <b>Publish to Instagram</b> / <b>Publish to LinkedIn</b>.</HelpStep>
        </ol>
        <HelpNote type="info">
          Instagram refuses to publish without a photo or video attached to the post. Facebook and LinkedIn don&apos;t require one.
        </HelpNote>
      </HelpSection>

      <HelpSection id="schedule" num="04" title="Scheduling for later" lede="Don't want it live right now? Queue it for a specific time instead.">
        <ol className="space-y-2">
          <HelpStep n={1}>Under the platform&apos;s text box, pick a date and time in the schedule field.</HelpStep>
          <HelpStep n={2}>Click <b>Schedule</b>. You&apos;ll see a confirmation.</HelpStep>
          <HelpStep n={3}>It publishes itself automatically at that time — nobody needs to be logged in or watching. You can check what&apos;s queued any time on the Insights tab.</HelpStep>
        </ol>
      </HelpSection>

      <HelpSection id="rate" num="05" title="Rating drafts — this is how it gets smarter" lede="This is the one habit that actually matters. Skip everything else on this page before you skip this.">
        <p className="text-sm text-slate-700">
          After publishing (or any time later, from History), rate the post 1–5 stars and add a one-line note — <i>&quot;brought in three DMs,&quot; &quot;felt too stiff,&quot; &quot;clients loved the before/after.&quot;</i> That note is worth more than the star rating alone.
        </p>
        <HelpNote type="good">
          Every time you generate a new post, the assistant looks at your salon&apos;s highest-rated and best-performing past posts for that goal and platform, and writes toward that pattern. An unrated post teaches it nothing. A handful of honest ratings a week is what separates this from a generic AI tool.
        </HelpNote>
      </HelpSection>

      <HelpSection id="renters" num="06" title="Tracking booth renters" lede="Likes don't pay rent. This tracks whether a post actually led to a real renter.">
        <p className="mb-4 text-sm text-slate-700">
          Any post made with the <b>Attract Booth Renters</b> goal gets a small outcome tracker — on the post itself right after publishing, in History, and in the Insights tab. Whoever fields the response marks it:
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <h3 className="text-sm font-bold text-slate-800">Got an inquiry</h3>
            <p className="mt-1 text-xs text-slate-500">Someone reached out — DM, call, walk-in asking about the space.</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <h3 className="text-sm font-bold text-slate-800">Tour scheduled</h3>
            <p className="mt-1 text-xs text-slate-500">You&apos;ve booked a time to show them the salon.</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <h3 className="text-sm font-bold text-slate-800">Renter signed!</h3>
            <p className="mt-1 text-xs text-slate-500">They signed a lease. This is the number that actually matters.</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-700">
          Click again on the same button to undo a mis-click. The Insights tab rolls all of this up into a <b>Booth Renter Funnel</b> — posts → inquiries → tours → signed — broken down by which style of post actually converts, not just which one got the most likes.
        </p>
      </HelpSection>

      <HelpSection id="leads" num="07" title="Your rental page & lead pipeline" lede="This is the part that turns posts into actual renters. Don't skip it.">
        <p className="mb-4 text-sm text-slate-700">
          The app has a public <b>rental page</b> — a real web page anyone can visit (no login) that pitches renting a chair here and has a &quot;let&apos;s talk&quot; form. When someone fills it out, they land in the <b>Leads</b> tab automatically. That&apos;s the difference between &quot;DM us&quot; (where leads vanish) and a name, number, and follow-up you can actually work.
        </p>
        <ol className="space-y-2">
          <HelpStep n={1}>Open the <b>Leads</b> tab and copy your rental page link (it ends in <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/rent</code>). Put it in your Instagram bio, your Facebook page, and any &quot;now renting&quot; posts.</HelpStep>
          <HelpStep n={2}>When an inquiry comes in, it shows up as a <b>New</b> lead with their contact info. Tap the phone or email to reach out.</HelpStep>
          <HelpStep n={3}>Move each lead down the pipeline as you go: <b>New → Contacted → Touring → Signed</b> (or Lost). Add a note so anyone on the team can see what&apos;s happened.</HelpStep>
          <HelpStep n={4}>If a new lead sits {STALE_DAYS}+ days without follow-up, the tab flags it in pink. That flag is money leaking — call them.</HelpStep>
        </ol>
        <HelpNote type="good">
          A booth renter is recurring monthly income — one signed renter is worth more than thousands of likes. This pipeline exists so no inquiry ever gets forgotten in someone&apos;s DMs.
        </HelpNote>
      </HelpSection>

      <HelpSection id="media" num="08" title="Media library" lede="Every photo and video you've ever uploaded lives here, reusable across future posts.">
        <ol className="space-y-2">
          <HelpStep n={1}>Open the <b>Media</b> tab to browse everything uploaded so far.</HelpStep>
          <HelpStep n={2}>Upload straight from there, or via Upload new while creating a post.</HelpStep>
          <HelpStep n={3}>JPG, PNG, WebP, MP4, or MOV, up to 25 MB. Good lighting and a clean background make a noticeably bigger difference than resolution.</HelpStep>
        </ol>
      </HelpSection>

      <HelpSection id="brand" num="09" title="Brand Brain" lede="The salon's voice, in one place — read by every single generation.">
        <p className="mb-4 text-sm text-slate-700">
          This is the fastest lever for making posts sound like <i>this salon</i> and not a generic template — it applies immediately, with zero data needed. Worth 10 minutes with Adam or Jessica to fill in properly, especially:
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2">Field</th>
                <th className="px-4 py-2">What to put there</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td className="px-4 py-2 font-semibold text-slate-700">Voice</td><td className="px-4 py-2 text-slate-600">How the salon actually talks — warm, playful, direct, whatever&apos;s true</td></tr>
              <tr><td className="px-4 py-2 font-semibold text-slate-700">Signature phrases</td><td className="px-4 py-2 text-slate-600">Things you say often and want to show up naturally</td></tr>
              <tr><td className="px-4 py-2 font-semibold text-slate-700">Avoid phrases</td><td className="px-4 py-2 text-slate-600">Generic filler you&apos;re sick of seeing in AI content — be specific</td></tr>
              <tr><td className="px-4 py-2 font-semibold text-slate-700">Booth benefits</td><td className="px-4 py-2 text-slate-600">What actually makes renting here worth it — used only for renter-goal posts</td></tr>
              <tr><td className="px-4 py-2 font-semibold text-slate-700">Staff roster</td><td className="px-4 py-2 text-slate-600">Add each team member once so &quot;Your name&quot; becomes a dropdown instead of free text</td></tr>
              <tr><td className="px-4 py-2 font-semibold text-slate-700">Content Goals</td><td className="px-4 py-2 text-slate-600">Add, rename, or retune the AI guidance behind each Post goal option — e.g. a new &quot;Holiday Promo&quot; goal</td></tr>
            </tbody>
          </table>
        </div>
        <HelpNote type="warn">
          Anyone can view Brand Brain, but changes here affect every post going forward — treat it like editing the salon&apos;s About page, not a personal setting.
        </HelpNote>
      </HelpSection>

      <HelpSection id="insights" num="10" title="History & Insights" lede="Where you check what's actually working.">
        <ul className="space-y-2 text-sm text-slate-700">
          <li><b>History</b> — a calendar of every post ever made. Click a day to see what went out, or scroll the month list.</li>
          <li><b>Insights</b> — totals, the strongest-performing pattern by platform and goal, the Booth Renter Funnel, anything scheduled or stuck on a failed publish, and a Sync Facebook stats button to pull in fresh like/comment/share counts on demand.</li>
        </ul>
      </HelpSection>

      <HelpSection id="status" num="11" title="What's connected" lede="Straight status, so nobody's confused by an error message.">
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2">Feature</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td className="px-4 py-2 text-slate-700">Draft, edit, rate, schedule, track renters</td><td className="px-4 py-2"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">● Live</span></td></tr>
              <tr><td className="px-4 py-2 text-slate-700">Public rental page + Leads pipeline</td><td className="px-4 py-2"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">● Live</span></td></tr>
              <tr><td className="px-4 py-2 text-slate-700">Publish directly to Facebook / Instagram</td><td className="px-4 py-2"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">● Live</span></td></tr>
              <tr><td className="px-4 py-2 text-slate-700">Publish directly to LinkedIn</td><td className="px-4 py-2"><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">● Not yet connected</span></td></tr>
            </tbody>
          </table>
        </div>
        <HelpNote type="warn">
          Until LinkedIn is connected, clicking Publish to LinkedIn will show an error instead of going live. In the meantime: click <b>Copy</b> to copy the finished caption, then paste it into the LinkedIn app yourself, same as you would today. Everything else — drafting, rating, the learning loop, renter tracking — works exactly the same either way.
        </HelpNote>
      </HelpSection>

      <HelpSection id="help" num="12" title="If something breaks">
        <ol className="space-y-2">
          <HelpStep n={1}>Try reloading the page first — fixes most one-off glitches.</HelpStep>
          <HelpStep n={2}>Note what you were doing and the exact error text, if any — a screenshot is ideal.</HelpStep>
          <HelpStep n={3}>Send it to Adam. Most fixes so far have taken minutes once the actual error message is in hand.</HelpStep>
        </ol>
      </HelpSection>
    </div>
  )
}

// ── Insights ──────────────────────────────────────────────────────────────────

function InsightsTab() {
  const [data, setData] = useState(null)
  const [scheduled, setScheduled] = useState([])
  const [failed, setFailed] = useState([])
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [retrying, setRetrying] = useState({})

  const load = useCallback(async () => {
    try {
      const [main, sched, fail] = await Promise.all([
        api('/api/posts?limit=50'),
        api('/api/schedule'),
        api('/api/posts?status=failed&limit=20'),
      ])
      setData(main)
      setScheduled(sched.posts || [])
      setFailed(fail.posts || [])
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const sync = async () => {
    setSyncing(true)
    try { await api('/api/posts/sync-all', { method: 'POST' }); await load() }
    catch (err) { setError(err.message) }
    finally { setSyncing(false) }
  }

  const processScheduled = async () => {
    setProcessing(true)
    try { await api('/api/schedule/process', { method: 'POST' }); await load() }
    catch (err) { setError(err.message) }
    finally { setProcessing(false) }
  }

  const retry = async postId => {
    setRetrying(r => ({ ...r, [postId]: true }))
    try { await api(`/api/posts/${postId}/retry`, { method: 'POST' }); await load() }
    catch (err) { setError(err.message) }
    finally { setRetrying(r => ({ ...r, [postId]: false })) }
  }

  if (!data) return <section className={panelClass}>{error ? <Notice type="error">{error}</Notice> : <p className="text-sm text-slate-400">Loading insights...</p>}</section>

  const summary = data.summary || {}
  const recommendation = data.performance?.[0]
  const funnel = data.boothRenterFunnel || {}
  const funnelPerformance = data.boothRenterPerformance || []
  const cards = [
    ['Drafts created', summary.total_posts || 0],
    ['Published', summary.published_posts || 0],
    ['Avg. engagement', summary.avg_engagement || 0],
    ['Avg. team rating', summary.avg_rating || 0],
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className={panelClass}>
            <p className="text-2xl font-black text-slate-900">{value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {recommendation ? (
        <Notice type="success">
          Strongest pattern: <strong>{recommendation.variant}</strong> {recommendation.platform} posts for <strong>{String(recommendation.goal).replaceAll('_', ' ')}</strong>.
        </Notice>
      ) : (
        <Notice>Rate and publish more drafts to unlock evidence-based recommendations.</Notice>
      )}

      {funnel.total_posts > 0 ? (
        <section className={panelClass}>
          <h2 className="mb-1 font-bold text-slate-900">Booth Renter Funnel</h2>
          <p className="mb-4 text-sm text-slate-500">Real-world outcomes from &quot;Attract Booth Renters&quot; posts — not just likes.</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Posts', funnel.total_posts || 0],
              ['Inquiries', funnel.inquiries || 0],
              ['Tours scheduled', funnel.tours_scheduled || 0],
              ['Renters signed', funnel.signed || 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
                <p className="text-xl font-black text-amber-700">{value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-600">{label}</p>
              </div>
            ))}
          </div>
          {funnelPerformance.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">What&apos;s actually converting</p>
              {funnelPerformance.map((row, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <span className="font-semibold text-slate-700">{row.variant} · {row.platform}</span>
                  <span className="text-slate-500">{row.post_count} posts · {row.inquiries} inquiries · {row.signed} signed</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <Notice>No &quot;Attract Booth Renters&quot; posts yet — generate one to start tracking real-world renter outcomes.</Notice>
      )}

      {scheduled.length > 0 && (
        <section className={panelClass}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Scheduled Posts ({scheduled.length})</h2>
              <p className="text-sm text-slate-500">Posts queued to publish automatically.</p>
            </div>
            <button type="button" onClick={processScheduled} disabled={processing} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {processing ? 'Publishing...' : 'Publish due now'}
            </button>
          </div>
          <div className="space-y-3">
            {scheduled.map(post => (
              <article key={post.id} className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                    <span>{post.platform}</span><span>/</span><span>{post.variant}</span>
                  </div>
                  <p className="text-xs font-semibold text-emerald-700">
                    {new Date(post.scheduled_at).toLocaleString()}
                  </p>
                </div>
                <p className="mt-2 text-sm text-slate-700 leading-5">{post.post_text?.slice(0, 120)}{post.post_text?.length > 120 ? '...' : ''}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {failed.length > 0 && (
        <section className={panelClass}>
          <h2 className="mb-4 font-bold text-slate-900">Failed Posts — Retry</h2>
          {error ? <div className="mb-3"><Notice type="error">{error}</Notice></div> : null}
          <div className="space-y-3">
            {failed.map(post => (
              <article key={post.id} className="rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                    <span>{post.platform}</span><span>/</span><span>{post.variant}</span>
                    <span className="text-red-500">× {post.retry_count} attempt{post.retry_count !== 1 ? 's' : ''}</span>
                  </div>
                  <button type="button" onClick={() => retry(post.id)} disabled={retrying[post.id]} className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    {retrying[post.id] ? 'Retrying...' : 'Retry'}
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-700 leading-5">{post.post_text?.slice(0, 120)}{post.post_text?.length > 120 ? '...' : ''}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className={panelClass}>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">Recent Performance</h2>
            <p className="text-sm text-slate-500">Ratings and Facebook engagement feed future generation.</p>
          </div>
          <button type="button" onClick={sync} disabled={syncing} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {syncing ? 'Syncing...' : 'Sync Facebook stats'}
          </button>
        </div>
        {error ? <Notice type="error">{error}</Notice> : null}
        <div className="space-y-3">
          {(data.posts || []).map(post => (
            <article key={post.id} className="rounded-xl border border-pink-100 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                <span>{post.platform}</span><span>/</span><span>{post.variant}</span><span>/</span>
                <span>{String(post.goal).replaceAll('_', ' ')}</span>
                {post.posted ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 normal-case">Published</span> : null}
                {post.scheduled_at && !post.posted ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 normal-case">Scheduled</span> : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{post.post_text?.slice(0, 180)}{post.post_text?.length > 180 ? '...' : ''}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>{post.likes || 0} likes</span>
                <span>{post.comments || 0} comments</span>
                <span>{post.shares || 0} shares</span>
                <span>{post.avg_rating ? `${Number(post.avg_rating).toFixed(1)}/5 rating` : 'Not rated'}</span>
              </div>
              {post.goal === 'booth_renters' ? <RenterOutcomeControl postId={post.id} initialOutcome={post.renter_outcome} /> : null}
            </article>
          ))}
          {data.posts?.length === 0 ? <p className="text-sm text-slate-400">No drafts have been generated yet.</p> : null}
        </div>
      </section>
    </div>
  )
}

// ── History / Calendar ────────────────────────────────────────────────────────

function HistoryTab() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [viewMonth, setViewMonth] = useState(new Date())

  useEffect(() => {
    api('/api/posts?limit=500')
      .then(d => setPosts(d.posts || []))
      .finally(() => setLoading(false))
  }, [])

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const monthLabel = firstDay.toLocaleString('default', { month: 'long', year: 'numeric' })

  const postsByDate = {}
  for (const post of posts) {
    const date = post.created_at?.slice(0, 10)
    if (!date) continue
    if (!postsByDate[date]) postsByDate[date] = []
    postsByDate[date].push(post)
  }

  const startOffset = firstDay.getDay()
  const days = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ day: d, dateStr, dayPosts: postsByDate[dateStr] || [] })
  }

  const selectedPosts = selectedDate ? (postsByDate[selectedDate] || []) : []

  if (loading) return <section className={panelClass}><p className="text-sm text-slate-400">Loading history...</p></section>

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => setViewMonth(new Date(year, month - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">←</button>
          <h2 className="font-black text-slate-900">{monthLabel}</h2>
          <button type="button" onClick={() => setViewMonth(new Date(year, month + 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">→</button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => (
            <button
              key={i}
              type="button"
              disabled={!day}
              onClick={() => day && setSelectedDate(day.dateStr === selectedDate ? null : day.dateStr)}
              className={`min-h-14 rounded-xl p-1.5 text-left transition ${!day ? 'cursor-default' : 'hover:bg-pink-50'} ${selectedDate === day?.dateStr ? 'bg-pink-100 ring-2 ring-pink-400' : ''}`}
            >
              {day && (
                <>
                  <p className="text-xs font-semibold text-slate-700">{day.day}</p>
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {day.dayPosts.slice(0, 5).map((p, j) => (
                      <div key={j} className={`h-2 w-2 rounded-full ${p.posted ? 'bg-emerald-400' : p.scheduled_at ? 'bg-amber-400' : 'bg-pink-400'}`} />
                    ))}
                    {day.dayPosts.length > 5 && <span className="text-[9px] text-slate-400">+{day.dayPosts.length - 5}</span>}
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Published</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Scheduled</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-pink-400" /> Draft</span>
        </div>
      </section>

      {selectedDate && (
        <section className={panelClass}>
          <h3 className="mb-4 font-bold text-slate-900">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
          {selectedPosts.length === 0 ? <p className="text-sm text-slate-400">No posts on this date.</p> : null}
          <div className="space-y-3">
            {selectedPosts.map(post => (
              <article key={post.id} className="rounded-xl border border-pink-100 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                  <span>{post.platform}</span><span>/</span><span>{post.variant}</span><span>/</span>
                  <span>{String(post.goal).replaceAll('_', ' ')}</span>
                  {post.posted ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 normal-case">Published</span> : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{post.post_text?.slice(0, 200)}{post.post_text?.length > 200 ? '...' : ''}</p>
                {post.avg_rating ? <p className="mt-2 text-xs text-amber-600">{'★'.repeat(Math.round(post.avg_rating))} {Number(post.avg_rating).toFixed(1)}/5</p> : null}
                {post.goal === 'booth_renters' ? <RenterOutcomeControl postId={post.id} initialOutcome={post.renter_outcome} /> : null}
              </article>
            ))}
          </div>
        </section>
      )}

      {selectedDate === null && (
        <section className={panelClass}>
          <h3 className="mb-3 font-bold text-slate-900">All posts this month</h3>
          {days.filter(d => d && d.dayPosts.length > 0).flatMap(d => d.dayPosts).length === 0
            ? <p className="text-sm text-slate-400">No posts in {monthLabel}.</p>
            : null}
          <div className="space-y-3">
            {days.filter(d => d && d.dayPosts.length > 0).flatMap(d => d.dayPosts).slice(0, 20).map(post => (
              <article key={post.id} className="rounded-xl border border-pink-100 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                  <span>{post.created_at?.slice(0, 10)}</span><span>/</span>
                  <span>{post.platform}</span><span>/</span><span>{post.variant}</span>
                  {post.posted ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 normal-case">Published</span> : null}
                  {post.goal === 'booth_renters' && post.renter_outcome ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 normal-case">
                      {RENTER_OUTCOMES.find(o => o.id === post.renter_outcome)?.label}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-700">{post.post_text?.slice(0, 140)}{post.post_text?.length > 140 ? '...' : ''}</p>
                {post.goal === 'booth_renters' ? <RenterOutcomeControl postId={post.id} initialOutcome={post.renter_outcome} /> : null}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Templates ─────────────────────────────────────────────────────────────────

function TemplatesPanel({ onLoad }) {
  const [templates, setTemplates] = useState([])
  const [open, setOpen] = useState(false)

  const load = async () => {
    const data = await api('/api/templates').catch(() => ({ templates: [] }))
    setTemplates(data.templates || [])
  }

  const toggle = async () => {
    if (!open) await load()
    setOpen(o => !o)
  }

  const remove = async id => {
    await api(`/api/templates?id=${id}`, { method: 'DELETE' })
    setTemplates(t => t.filter(x => x.id !== id))
  }

  return (
    <div>
      <button type="button" onClick={toggle} className="rounded-xl border border-pink-200 px-4 py-2 text-xs font-bold text-pink-700 hover:bg-pink-50">
        {open ? 'Hide templates' : 'Load template'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-pink-100 bg-pink-50 p-3">
          {templates.length === 0 ? <p className="text-xs text-slate-400">No saved templates yet. After generating, use "Save as template" to reuse a setup.</p> : null}
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2.5 border border-pink-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                  <p className="text-xs text-slate-400">{String(t.goal).replaceAll('_', ' ')} · {parsePlatforms(t.platforms).join(', ')}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => { onLoad(t); setOpen(false) }} className="rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-bold text-white">Load</button>
                  <button type="button" onClick={() => remove(t.id)} className="rounded-lg border border-red-200 px-2 py-1.5 text-xs font-bold text-red-500">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SaveTemplateButton({ goal, context, platforms }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), goal, context, platforms }) })
      setSaved(true)
      setTimeout(() => { setSaved(false); setOpen(false); setName('') }, 1500)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  if (saved) return <span className="text-xs font-semibold text-emerald-600">Template saved ✓</span>

  return (
    <div className="flex items-center gap-2">
      {open ? (
        <>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            className={`${inputClass} text-xs py-2`}
            placeholder="Template name..."
            autoFocus
          />
          <button type="button" onClick={save} disabled={saving || !name.trim()} className="shrink-0 rounded-xl bg-pink-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
            {saving ? '...' : 'Save'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-400">Cancel</button>
        </>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-slate-500 hover:text-pink-600">
          + Save as template
        </button>
      )}
    </div>
  )
}

// ── Results ───────────────────────────────────────────────────────────────────

function Results({ posts, setPosts, postIds, mediaUrl, employeeName, linkedinConnected, goal, context, selectedPlatforms, salonName }) {
  const [selected, setSelected] = useState(() => Object.fromEntries(Object.keys(posts).map(p => [p, 'balanced'])))
  const [posting, setPosting] = useState({})
  const [results, setResults] = useState({})
  const [saving, setSaving] = useState({})
  const [preview, setPreview] = useState({})
  const [scheduling, setScheduling] = useState({})
  const [scheduleAt, setScheduleAt] = useState({})
  const [scheduleStatus, setScheduleStatus] = useState({})
  // Media now lives on Cloudflare R2, so a proper upload always yields a
  // public https URL. Anything else (e.g. a stale relative path) is a URL
  // Meta's servers cannot fetch.
  const mediaNotPublic = Boolean(mediaUrl) && !/^https:\/\//.test(mediaUrl)

  const updateText = (platform, variant, value) => {
    setPosts(c => ({ ...c, [platform]: { ...c[platform], [variant]: value } }))
  }

  const saveDraft = async (platform, variant) => {
    const id = postIds?.[platform]?.[variant]
    if (!id) return
    setSaving(c => ({ ...c, [platform]: true }))
    try {
      await api(`/api/posts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postText: posts[platform][variant] }) })
    } catch (err) {
      setResults(c => ({ ...c, [platform]: { error: err.message } }))
    } finally {
      setSaving(c => ({ ...c, [platform]: false }))
    }
  }

  const publish = async platform => {
    const variant = selected[platform]
    const text = posts[platform][variant]
    const generatedPostId = postIds?.[platform]?.[variant]
    setPosting(c => ({ ...c, [platform]: true }))
    setResults(c => ({ ...c, [platform]: null }))
    try {
      await saveDraft(platform, variant)
      const imageUrl = mediaUrl ? new URL(mediaUrl, window.location.origin).toString() : ''
      const data = await api(`/api/post/${platform}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, postId: generatedPostId, imageUrl }) })
      setResults(c => ({ ...c, [platform]: data }))
    } catch (err) {
      setResults(c => ({ ...c, [platform]: { error: err.message } }))
    } finally {
      setPosting(c => ({ ...c, [platform]: false }))
    }
  }

  const schedulePost = async platform => {
    const variant = selected[platform]
    const postId = postIds?.[platform]?.[variant]
    const scheduledAt = scheduleAt[platform]
    if (!postId || !scheduledAt) return
    setScheduling(c => ({ ...c, [platform]: true }))
    try {
      await saveDraft(platform, variant)
      await api('/api/schedule', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId, scheduledAt: new Date(scheduledAt).toISOString() }) })
      setScheduleStatus(c => ({ ...c, [platform]: 'scheduled' }))
    } catch (err) {
      setScheduleStatus(c => ({ ...c, [platform]: 'error:' + err.message }))
    } finally {
      setScheduling(c => ({ ...c, [platform]: false }))
    }
  }

  const resolvedImageUrl = mediaUrl
    ? (() => { try { return new URL(mediaUrl, typeof window !== 'undefined' ? window.location.origin : '').toString() } catch { return '' } })()
    : ''

  return (
    <div className="mt-10 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Choose, edit, and publish</h2>
          <p className="mt-1 text-sm text-slate-500">Three directions per platform. Your edits are saved before publishing.</p>
        </div>
        <SaveTemplateButton goal={goal} context={context} platforms={selectedPlatforms} />
      </div>

      {Object.keys(posts).map(platform => {
        const variant = selected[platform]
        const text = posts[platform]?.[variant] || ''
        const result = results[platform]
        const platformInfo = PLATFORMS.find(item => item.id === platform)
        const showPreview = preview[platform]
        const sStatus = scheduleStatus[platform]

        return (
          <section key={platform} className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm">
            <header className="flex flex-col gap-3 border-b border-pink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-black text-slate-900">{platformInfo?.label || platform}</h3>
                <p className="text-xs text-slate-400">{text.length} characters</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {VARIANTS.map(option => (
                  <button key={option.id} type="button" onClick={() => setSelected(c => ({ ...c, [platform]: option.id }))} className={`rounded-lg px-3 py-2 text-xs font-bold ${variant === option.id ? 'bg-pink-600 text-white' : 'bg-pink-50 text-pink-700'}`}>
                    {option.label}
                  </button>
                ))}
                <button type="button" onClick={() => setPreview(c => ({ ...c, [platform]: !c[platform] }))} className={`rounded-lg px-3 py-2 text-xs font-bold ${showPreview ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600'}`}>
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
              </div>
            </header>

            <div className="p-5">
              {showPreview ? (
                <div className="mb-4">
                  <PlatformPreview platform={platform} text={text} imageUrl={resolvedImageUrl} salonName={salonName} />
                </div>
              ) : (
                <textarea rows={10} value={text} onChange={e => updateText(platform, variant, e.target.value)} className={`${inputClass} leading-6`} />
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton text={text} />
                <button type="button" onClick={() => saveDraft(platform, variant)} disabled={saving[platform]} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
                  {saving[platform] ? 'Saving...' : 'Save draft'}
                </button>
                {platform === 'linkedin' && linkedinConnected === false ? (
                  <a href="/api/linkedin/auth" className="rounded-lg bg-sky-700 px-4 py-2 text-xs font-bold text-white">Connect LinkedIn</a>
                ) : (
                  <button type="button" onClick={() => publish(platform)} disabled={posting[platform]} className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${platformInfo?.color || 'bg-pink-600'}`}>
                    {posting[platform] ? 'Publishing...' : `Publish to ${platformInfo?.label || platform}`}
                  </button>
                )}
              </div>

              {/* Schedule row */}
              {!result?.success && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="datetime-local"
                    value={scheduleAt[platform] || ''}
                    onChange={e => setScheduleAt(c => ({ ...c, [platform]: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-pink-400"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <button type="button" onClick={() => schedulePost(platform)} disabled={!scheduleAt[platform] || scheduling[platform]} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 disabled:opacity-40">
                    {scheduling[platform] ? 'Scheduling...' : 'Schedule'}
                  </button>
                  {sStatus === 'scheduled' && <span className="text-xs font-semibold text-emerald-600">Scheduled ✓</span>}
                  {sStatus?.startsWith('error:') && <span className="text-xs text-red-500">{sStatus.slice(6)}</span>}
                </div>
              )}

              {platform === 'instagram' && mediaNotPublic ? (
                <div className="mt-3"><Notice type="warning">Instagram needs a publicly reachable image URL. Re-upload the image so it is stored in the media library, then generate again.</Notice></div>
              ) : null}
              {platform === 'instagram' && !mediaUrl ? <div className="mt-3"><Notice type="warning">Instagram requires an image. Add media and generate again before publishing.</Notice></div> : null}
              {result?.success ? <div className="mt-3"><Notice type="success">Published. {result.url ? <a className="font-bold underline" href={result.url} target="_blank" rel="noreferrer">Open platform</a> : null}</Notice></div> : null}
              {result?.error ? <div className="mt-3"><Notice type="error">{result.error}</Notice></div> : null}

              <RatingCard postId={postIds?.[platform]?.[variant]} employeeName={employeeName} />
              {goal === 'booth_renters' ? <RenterOutcomeControl postId={postIds?.[platform]?.[variant]} /> : null}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ── Leads ─────────────────────────────────────────────────────────────────────

const LEAD_STATUSES = [
  { id: 'new', label: 'New', color: 'bg-pink-100 text-pink-700' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  { id: 'touring', label: 'Touring', color: 'bg-amber-100 text-amber-700' },
  { id: 'signed', label: 'Signed', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'lost', label: 'Lost', color: 'bg-slate-200 text-slate-500' },
]

const STALE_DAYS = 2

function daysSince(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function LeadCard({ lead, onUpdate }) {
  const [status, setStatus] = useState(lead.status)
  const [notes, setNotes] = useState(lead.status_notes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const age = daysSince(lead.created_at)
  const isStale = status === 'new' && age !== null && age >= STALE_DAYS

  const changeStatus = async newStatus => {
    setBusy(true)
    const prev = status
    setStatus(newStatus)
    try {
      const data = await api(`/api/leads/${lead.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      onUpdate(data.lead)
    } catch {
      setStatus(prev)
    } finally {
      setBusy(false)
    }
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      const data = await api(`/api/leads/${lead.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusNotes: notes }),
      })
      onUpdate(data.lead)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } catch { /* ignore */ }
    finally { setSavingNotes(false) }
  }

  const statusInfo = LEAD_STATUSES.find(s => s.id === status) || LEAD_STATUSES[0]

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${isStale ? 'border-pink-300' : 'border-slate-100'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-slate-900">{lead.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {age === 0 ? 'Today' : age === 1 ? 'Yesterday' : `${age} days ago`}
            {lead.source === 'landing_page' ? ' · from rental page' : ''}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
      </div>

      {isStale ? (
        <div className="mt-3 rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-xs font-semibold text-pink-700">
          ⏰ Waiting {age} days with no follow-up. Reach out before this one goes cold.
        </div>
      ) : null}

      <div className="mt-3 grid gap-1.5 text-sm text-slate-700">
        {lead.phone ? <p><span className="font-semibold text-slate-500">Phone:</span> <a href={`tel:${lead.phone}`} className="text-pink-700 hover:underline">{lead.phone}</a></p> : null}
        {lead.email ? <p><span className="font-semibold text-slate-500">Email:</span> <a href={`mailto:${lead.email}`} className="text-pink-700 hover:underline">{lead.email}</a></p> : null}
        {lead.services ? <p><span className="font-semibold text-slate-500">Specialty:</span> {lead.services}</p> : null}
        {lead.license_status ? <p><span className="font-semibold text-slate-500">License:</span> {lead.license_status}</p> : null}
        {lead.current_situation ? <p><span className="font-semibold text-slate-500">Works now:</span> {lead.current_situation}</p> : null}
        {lead.client_base ? <p><span className="font-semibold text-slate-500">Clients:</span> {lead.client_base}</p> : null}
        {lead.timeframe ? <p><span className="font-semibold text-slate-500">Timeframe:</span> {lead.timeframe}</p> : null}
        {lead.availability ? <p><span className="font-semibold text-slate-500">Availability:</span> {lead.availability}</p> : null}
        {lead.message ? <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-slate-600">{lead.message}</p> : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Status:</span>
        {LEAD_STATUSES.map(s => (
          <button
            key={s.id}
            type="button"
            disabled={busy}
            onClick={() => changeStatus(s.id)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition disabled:opacity-50 ${status === s.id ? s.color : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className={`${inputClass} text-sm`}
          placeholder="Notes — who called them, what was said, next step…"
        />
        <div className="mt-1.5 flex items-center gap-3">
          <button type="button" onClick={saveNotes} disabled={savingNotes} className="rounded-lg border border-pink-200 px-3 py-1.5 text-xs font-bold text-pink-700 hover:bg-pink-50 disabled:opacity-50">
            {savingNotes ? 'Saving…' : 'Save notes'}
          </button>
          {notesSaved ? <span className="text-xs font-semibold text-emerald-600">Saved ✓</span> : null}
        </div>
      </div>
    </div>
  )
}

function LeadsTab() {
  const [leads, setLeads] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('open')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api('/api/leads').then(d => setLeads(d.leads || [])).catch(err => setError(err.message))
  }, [])

  const applyUpdate = updated => setLeads(ls => ls.map(l => l.id === updated.id ? updated : l))

  const rentUrl = typeof window !== 'undefined' ? `${window.location.origin}/rent` : '/rent'

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(rentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  if (error) return <section className={panelClass}><Notice type="error">{error}</Notice></section>
  if (!leads) return <section className={panelClass}><p className="text-sm text-slate-400">Loading leads…</p></section>

  const counts = LEAD_STATUSES.reduce((acc, s) => ({ ...acc, [s.id]: leads.filter(l => l.status === s.id).length }), {})
  const openLeads = leads.filter(l => l.status !== 'signed' && l.status !== 'lost')
  const staleCount = openLeads.filter(l => l.status === 'new' && (daysSince(l.created_at) ?? 0) >= STALE_DAYS).length

  const visible = filter === 'open'
    ? openLeads
    : filter === 'all'
      ? leads
      : leads.filter(l => l.status === filter)

  return (
    <div className="space-y-5">
      <section className={panelClass}>
        <h2 className="text-lg font-bold text-slate-900">Booth Rental Leads</h2>
        <p className="mt-1 text-sm text-slate-500">
          Everyone who&apos;s asked about renting a chair — from the public rental page or added by hand.
          Work each one down the pipeline and it stops slipping through the cracks.
        </p>

        <div className="mt-4 rounded-xl border border-pink-100 bg-pink-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-pink-600">Your rental page</p>
          <p className="mt-1 text-sm text-slate-600">Put this link in your Instagram bio, Facebook page, and posts. Anyone who fills it out shows up here automatically.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-pink-700">{rentUrl}</code>
            <button type="button" onClick={copyLink} className="rounded-lg border border-pink-300 px-3 py-2 text-xs font-bold text-pink-700 hover:bg-white">
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            <a href="/rent" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-pink-300 px-3 py-2 text-xs font-bold text-pink-700 hover:bg-white">
              Preview page
            </a>
          </div>
        </div>

        {staleCount > 0 ? (
          <div className="mt-4 rounded-xl border border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-pink-700">
            ⏰ {staleCount} {staleCount === 1 ? 'lead has' : 'leads have'} been waiting {STALE_DAYS}+ days with no follow-up.
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilter('open')} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === 'open' ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            Open ({openLeads.length})
          </button>
          {LEAD_STATUSES.map(s => (
            <button key={s.id} type="button" onClick={() => setFilter(s.id)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === s.id ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {s.label} ({counts[s.id]})
            </button>
          ))}
          <button type="button" onClick={() => setFilter('all')} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === 'all' ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            All ({leads.length})
          </button>
        </div>
      </section>

      {visible.length === 0 ? (
        <section className={panelClass}>
          <p className="text-sm text-slate-400">
            {leads.length === 0
              ? 'No leads yet. Share your rental page link above — new inquiries will appear here the moment someone fills out the form.'
              : 'No leads in this view.'}
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {visible.map(lead => <LeadCard key={lead.id} lead={lead} onUpdate={applyUpdate} />)}
        </div>
      )}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState('create')
  const [employeeName, setEmployeeName] = useState('')
  const [context, setContext] = useState('')
  const [goal, setGoal] = useState('showcase')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['facebook', 'instagram', 'linkedin'])
  const [file, setFile] = useState(null)
  const [previewItem, setPreviewItem] = useState(null)
  const [libraryItem, setLibraryItem] = useState(null)
  const [cropSrc, setCropSrc] = useState(null)
  const [posts, setPosts] = useState(null)
  const [postIds, setPostIds] = useState({})
  const [mediaUrl, setMediaUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [linkedinConnected, setLinkedinConnected] = useState(null)
  const [salonName, setSalonName] = useState('Keeping It Cute')
  const [staffRoster, setStaffRoster] = useState([])
  const [goals, setGoals] = useState(FALLBACK_GOALS)
  const fileRef = useRef(null)

  useEffect(() => {
    api('/api/linkedin/status').then(d => setLinkedinConnected(d.connected && !d.expired)).catch(() => setLinkedinConnected(false))
    api('/api/settings').then(d => {
      if (d.settings?.salonName) setSalonName(d.settings.salonName)
      if (d.settings?.staffRoster) setStaffRoster(d.settings.staffRoster.split('\n').map(s => s.trim()).filter(Boolean))
    }).catch(() => null)
    api('/api/goals').then(d => { if (d.goals?.length) setGoals(d.goals) }).catch(() => null)
  }, [])

  useEffect(() => () => {
    if (previewItem?.temporary) URL.revokeObjectURL(previewItem.url)
  }, [previewItem])

  const selectFile = selectedFile => {
    if (!selectedFile) return
    if (previewItem?.temporary) URL.revokeObjectURL(previewItem.url)
    if (selectedFile.type.startsWith('image/')) {
      setCropSrc({ src: URL.createObjectURL(selectedFile), fileName: selectedFile.name, originalFile: selectedFile })
    } else {
      applyFile(selectedFile)
    }
  }

  const applyFile = selectedFile => {
    setFile(selectedFile)
    setLibraryItem(null)
    setPreviewItem({ url: URL.createObjectURL(selectedFile), type: selectedFile.type, temporary: true })
  }

  const onCropConfirm = croppedFile => {
    const fileToUse = croppedFile || cropSrc.originalFile
    setCropSrc(null)
    applyFile(fileToUse)
  }

  const useLibraryItem = item => {
    if (previewItem?.temporary) URL.revokeObjectURL(previewItem.url)
    setLibraryItem(item)
    setFile(null)
    setPreviewItem({ url: item.url, type: item.mime_type })
    setActiveTab('create')
  }

  const loadTemplate = template => {
    setGoal(template.goal || 'showcase')
    setContext(template.context || '')
    const platforms = parsePlatforms(template.platforms)
    if (platforms.length) setSelectedPlatforms(platforms)
  }

  const togglePlatform = platform => {
    setSelectedPlatforms(c => c.includes(platform) ? c.filter(p => p !== platform) : [...c, platform])
  }

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPosts(null)
    try {
      const body = new FormData()
      body.append('employeeName', employeeName)
      body.append('context', context)
      body.append('goal', goal)
      body.append('platforms', JSON.stringify(selectedPlatforms))
      if (file) body.append('file', file)
      if (libraryItem) body.append('libraryImageUrl', libraryItem.url)
      const data = await api('/api/generate', { method: 'POST', body })
      setPosts(data.posts)
      setPostIds(data.postIds)
      setMediaUrl(data.mediaUrl || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    ['create', 'Create'],
    ['library', 'Media'],
    ['history', 'History'],
    ['insights', 'Insights'],
    ['leads', 'Leads'],
    ['settings', 'Brand Brain'],
    ['help', 'Help'],
  ]

  return (
    <main className="min-h-screen bg-[#fdf4f9] text-slate-800">
      {cropSrc && (
        <ImageCropModal
          src={cropSrc.src}
          fileName={cropSrc.fileName}
          onConfirm={onCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <header className="border-b border-pink-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div className="flex items-center gap-3">
              <img src="/images/logo.png" alt="" width={56} height={56} className="h-14 w-14 shrink-0 object-contain" />
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950">Keeping It Cute</h1>
                <p className="mt-1 text-sm font-semibold text-pink-600">Salon social content assistant</p>
              </div>
            </div>
            <p className="max-w-md text-sm text-slate-500">Create on-brand drafts, preview them, schedule or publish, and learn what actually connects.</p>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4" aria-label="Main navigation">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold ${activeTab === id ? 'border-pink-600 text-pink-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {activeTab === 'library' ? <MediaLibrary onUse={useLibraryItem} /> : null}
        {activeTab === 'settings' ? <SettingsTab /> : null}
        {activeTab === 'leads' ? <LeadsTab /> : null}
        {activeTab === 'help' ? <HelpTab /> : null}
        {activeTab === 'insights' ? <InsightsTab /> : null}
        {activeTab === 'history' ? <HistoryTab /> : null}
        {activeTab === 'create' ? (
          <>
            <form onSubmit={submit} className="space-y-5">
              <section className={panelClass}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700">Your name</span>
                    <StaffNameField value={employeeName} onChange={setEmployeeName} roster={staffRoster} />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700">Post goal</span>
                    <select value={goal} onChange={e => setGoal(e.target.value)} className={inputClass}>
                      {goals.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                  </label>
                </div>
                <p className="mt-3 text-xs text-slate-400">{goals.find(item => item.id === goal)?.description}</p>
                <div className="mt-4">
                  <TemplatesPanel onLoad={loadTemplate} />
                </div>
              </section>

              <section className={panelClass}>
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-700">What should the post say?</span>
                  <textarea value={context} onChange={e => setContext(e.target.value)} rows={5} className={inputClass} placeholder="Describe the service, transformation, client reaction, promotion, event, opening, or idea. Specific details create stronger posts." />
                </label>
              </section>

              <section className={panelClass}>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-sm font-bold text-slate-700">Photo or video</h2>
                    <p className="mt-1 text-xs text-slate-400">JPG, PNG, WebP, MP4, or MOV up to 25 MB. Images can be cropped after selecting.</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-pink-200 px-4 py-2 text-xs font-bold text-pink-700">Upload new</button>
                    <button type="button" onClick={() => setActiveTab('library')} className="rounded-xl bg-pink-50 px-4 py-2 text-xs font-bold text-pink-700">Choose library</button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" className="hidden" onChange={e => selectFile(e.target.files?.[0])} />
                </div>
                {previewItem ? (
                  <div className="mt-4 flex items-start gap-4">
                    <MediaPreview item={previewItem} className="h-36 w-36 rounded-xl object-cover" />
                    <div className="flex flex-col gap-2">
                      {file && previewItem.type?.startsWith('image/') && (
                        <button type="button" onClick={() => setCropSrc({ src: previewItem.url, fileName: file.name, originalFile: file })} className="text-xs font-bold text-pink-600">Crop image</button>
                      )}
                      <button type="button" onClick={() => { setFile(null); setLibraryItem(null); setPreviewItem(null) }} className="text-xs font-bold text-red-600">Remove</button>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className={panelClass}>
                <h2 className="mb-3 text-sm font-bold text-slate-700">Platforms</h2>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(platform => (
                    <button key={platform.id} type="button" onClick={() => togglePlatform(platform.id)} className={`rounded-full border-2 px-5 py-2 text-sm font-bold ${selectedPlatforms.includes(platform.id) ? 'border-pink-600 bg-pink-600 text-white' : 'border-slate-200 text-slate-500'}`}>
                      {platform.label}
                    </button>
                  ))}
                </div>
              </section>

              {error ? <Notice type="error">{error}</Notice> : null}
              <button type="submit" disabled={loading || selectedPlatforms.length === 0} className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-amber-500 px-6 py-4 text-base font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? 'Creating three directions for each platform...' : 'Generate smart drafts'}
              </button>
            </form>

            {posts ? (
              <Results
                posts={posts}
                setPosts={setPosts}
                postIds={postIds}
                mediaUrl={mediaUrl}
                employeeName={employeeName}
                linkedinConnected={linkedinConnected}
                goal={goal}
                context={context}
                selectedPlatforms={selectedPlatforms}
                salonName={salonName}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  )
}
