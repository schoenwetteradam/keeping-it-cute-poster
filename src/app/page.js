'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', color: 'bg-blue-600' },
  { id: 'instagram', label: 'Instagram', color: 'bg-fuchsia-600' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-sky-700' },
]

const GOALS = [
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
  if (status === 'saved') return <p className="mt-4 border-t border-pink-100 pt-3 text-xs font-semibold text-emerald-600">Feedback saved. Future drafts can learn from it.</p>

  return (
    <div className="mt-4 border-t border-pink-100 pt-3">
      <p className="mb-2 text-xs font-semibold text-slate-500">Rate this draft to improve future suggestions</p>
      <div className="flex gap-1" aria-label="Post rating">
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button" onClick={() => setRating(star)} className={`text-xl ${rating >= star ? 'text-amber-400' : 'text-slate-200'}`} aria-label={`${star} stars`}>
            *
          </button>
        ))}
      </div>
      {rating > 0 ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input value={notes} onChange={event => setNotes(event.target.value)} className={inputClass} placeholder="Optional: too formal, great hook, more playful..." />
          <button type="button" onClick={submit} disabled={status === 'saving'} className="shrink-0 rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {status === 'saving' ? 'Saving...' : 'Save rating'}
          </button>
        </div>
      ) : null}
      {status === 'error' ? <p className="mt-2 text-xs text-red-600">The rating could not be saved.</p> : null}
    </div>
  )
}

function MediaPreview({ item, className = '' }) {
  if (!item) return null
  const type = item.mime_type || item.type || ''
  if (type.startsWith('video/')) return <video src={item.url} controls className={className} />
  return <img src={item.url} alt={item.original_name || 'Selected media'} className={className} />
}

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
      await api('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
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
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" className="hidden" onChange={event => upload(event.target.files?.[0])} />
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

function SettingsTab() {
  const [settings, setSettings] = useState(null)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    api('/api/settings')
      .then(data => { setSettings(data.settings); setStatus('idle') })
      .catch(err => { setMessage(err.message); setStatus('error') })
  }, [])

  const save = async event => {
    event.preventDefault()
    setStatus('saving')
    try {
      const data = await api('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
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

  return (
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
              <textarea rows={3} value={settings[key]} onChange={event => setSettings(current => ({ ...current, [key]: event.target.value }))} className={inputClass} />
            ) : (
              <input type={type} value={settings[key]} onChange={event => setSettings(current => ({ ...current, [key]: event.target.value }))} className={inputClass} />
            )}
          </label>
        ))}
      </div>
      {status === 'error' ? <div className="mt-4"><Notice type="error">{message}</Notice></div> : null}
      <button type="submit" disabled={status === 'saving'} className="mt-6 rounded-xl bg-pink-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
        {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : 'Save Brand Brain'}
      </button>
    </form>
  )
}

function InsightsTab() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await api('/api/posts?limit=50'))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const sync = async () => {
    setSyncing(true)
    try {
      await api('/api/posts/sync-all', { method: 'POST' })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  if (!data) return <section className={panelClass}>{error ? <Notice type="error">{error}</Notice> : <p className="text-sm text-slate-400">Loading insights...</p>}</section>

  const summary = data.summary || {}
  const recommendation = data.performance?.[0]
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
          Current strongest pattern: <strong>{recommendation.variant}</strong> {recommendation.platform} posts for <strong>{String(recommendation.goal).replaceAll('_', ' ')}</strong>.
        </Notice>
      ) : (
        <Notice>Rate and publish more drafts to unlock evidence-based recommendations.</Notice>
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
                <span>{post.platform}</span><span>/</span><span>{post.variant}</span><span>/</span><span>{String(post.goal).replaceAll('_', ' ')}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{post.post_text?.slice(0, 180)}{post.post_text?.length > 180 ? '...' : ''}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>{post.likes || 0} likes</span>
                <span>{post.comments || 0} comments</span>
                <span>{post.shares || 0} shares</span>
                <span>{post.avg_rating ? `${Number(post.avg_rating).toFixed(1)}/5 rating` : 'Not rated'}</span>
              </div>
            </article>
          ))}
          {data.posts?.length === 0 ? <p className="text-sm text-slate-400">No drafts have been generated yet.</p> : null}
        </div>
      </section>
    </div>
  )
}

function Results({ posts, setPosts, postIds, mediaUrl, employeeName, linkedinConnected }) {
  const [selected, setSelected] = useState(() => Object.fromEntries(Object.keys(posts).map(platform => [platform, 'balanced'])))
  const [posting, setPosting] = useState({})
  const [results, setResults] = useState({})
  const [saving, setSaving] = useState({})
  const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)

  const updateText = (platform, variant, value) => {
    setPosts(current => ({ ...current, [platform]: { ...current[platform], [variant]: value } }))
  }

  const saveDraft = async (platform, variant) => {
    const id = postIds?.[platform]?.[variant]
    if (!id) return
    setSaving(current => ({ ...current, [platform]: true }))
    try {
      await api(`/api/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postText: posts[platform][variant] }),
      })
      setSaving(current => ({ ...current, [platform]: false }))
    } catch (err) {
      setResults(current => ({ ...current, [platform]: { error: err.message } }))
      setSaving(current => ({ ...current, [platform]: false }))
    }
  }

  const publish = async platform => {
    const variant = selected[platform]
    const text = posts[platform][variant]
    const generatedPostId = postIds?.[platform]?.[variant]
    setPosting(current => ({ ...current, [platform]: true }))
    setResults(current => ({ ...current, [platform]: null }))
    try {
      await saveDraft(platform, variant)
      const imageUrl = mediaUrl ? new URL(mediaUrl, window.location.origin).toString() : ''
      const data = await api(`/api/post/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, postId: generatedPostId, imageUrl }),
      })
      setResults(current => ({ ...current, [platform]: data }))
    } catch (err) {
      setResults(current => ({ ...current, [platform]: { error: err.message } }))
    } finally {
      setPosting(current => ({ ...current, [platform]: false }))
    }
  }

  return (
    <div className="mt-10 space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900">Choose, edit, and publish</h2>
        <p className="mt-1 text-sm text-slate-500">Each platform has three distinct directions. Your edits are saved before publishing.</p>
      </div>
      {Object.keys(posts).map(platform => {
        const variant = selected[platform]
        const text = posts[platform]?.[variant] || ''
        const result = results[platform]
        const platformInfo = PLATFORMS.find(item => item.id === platform)
        return (
          <section key={platform} className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm">
            <header className="flex flex-col gap-3 border-b border-pink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-black text-slate-900">{platformInfo?.label || platform}</h3>
                <p className="text-xs text-slate-400">{text.length} characters</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {VARIANTS.map(option => (
                  <button key={option.id} type="button" onClick={() => setSelected(current => ({ ...current, [platform]: option.id }))} className={`rounded-lg px-3 py-2 text-xs font-bold ${variant === option.id ? 'bg-pink-600 text-white' : 'bg-pink-50 text-pink-700'}`}>
                    {option.label}
                  </button>
                ))}
              </div>
            </header>
            <div className="p-5">
              <textarea rows={10} value={text} onChange={event => updateText(platform, variant, event.target.value)} className={`${inputClass} leading-6`} />
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
              {platform === 'instagram' && mediaUrl && isLocalhost ? (
                <div className="mt-3"><Notice type="warning">Instagram cannot fetch a localhost image. Publish from the deployed app or use Copy for local testing.</Notice></div>
              ) : null}
              {platform === 'instagram' && !mediaUrl ? <div className="mt-3"><Notice type="warning">Instagram requires an image. Add media and generate again before publishing.</Notice></div> : null}
              {result?.success ? <div className="mt-3"><Notice type="success">Published successfully. {result.url ? <a className="font-bold underline" href={result.url} target="_blank" rel="noreferrer">Open platform</a> : null}</Notice></div> : null}
              {result?.error ? <div className="mt-3"><Notice type="error">{result.error}</Notice></div> : null}
              <RatingCard postId={postIds?.[platform]?.[variant]} employeeName={employeeName} />
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('create')
  const [employeeName, setEmployeeName] = useState('')
  const [context, setContext] = useState('')
  const [goal, setGoal] = useState('showcase')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['facebook', 'instagram', 'linkedin'])
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [libraryItem, setLibraryItem] = useState(null)
  const [posts, setPosts] = useState(null)
  const [postIds, setPostIds] = useState({})
  const [mediaUrl, setMediaUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [linkedinConnected, setLinkedinConnected] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    api('/api/linkedin/status')
      .then(data => setLinkedinConnected(data.connected && !data.expired))
      .catch(() => setLinkedinConnected(false))
  }, [])

  useEffect(() => () => {
    if (preview?.temporary) URL.revokeObjectURL(preview.url)
  }, [preview])

  const selectFile = selectedFile => {
    if (!selectedFile) return
    if (preview?.temporary) URL.revokeObjectURL(preview.url)
    setFile(selectedFile)
    setLibraryItem(null)
    setPreview({ url: URL.createObjectURL(selectedFile), type: selectedFile.type, temporary: true })
  }

  const useLibraryItem = item => {
    if (preview?.temporary) URL.revokeObjectURL(preview.url)
    setLibraryItem(item)
    setFile(null)
    setPreview({ url: item.url, type: item.mime_type })
    setActiveTab('create')
  }

  const togglePlatform = platform => {
    setSelectedPlatforms(current => current.includes(platform) ? current.filter(item => item !== platform) : [...current, platform])
  }

  const submit = async event => {
    event.preventDefault()
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
    ['insights', 'Insights'],
    ['settings', 'Brand Brain'],
  ]

  return (
    <main className="min-h-screen bg-[#fdf4f9] text-slate-800">
      <header className="border-b border-pink-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Keeping It Cute</h1>
              <p className="mt-1 text-sm font-semibold text-pink-600">Salon social content assistant</p>
            </div>
            <p className="max-w-md text-sm text-slate-500">Create on-brand drafts, publish them, and learn which messages actually connect.</p>
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
        {activeTab === 'insights' ? <InsightsTab /> : null}
        {activeTab === 'create' ? (
          <>
            <form onSubmit={submit} className="space-y-5">
              <section className={panelClass}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700">Your name</span>
                    <input value={employeeName} onChange={event => setEmployeeName(event.target.value)} className={inputClass} placeholder="Jessica" required />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700">Post goal</span>
                    <select value={goal} onChange={event => setGoal(event.target.value)} className={inputClass}>
                      {GOALS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                  </label>
                </div>
                <p className="mt-3 text-xs text-slate-400">{GOALS.find(item => item.id === goal)?.description}</p>
              </section>

              <section className={panelClass}>
                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-700">What should the post say?</span>
                  <textarea value={context} onChange={event => setContext(event.target.value)} rows={5} className={inputClass} placeholder="Describe the service, transformation, client reaction, promotion, event, opening, or idea. Specific details create stronger posts." />
                </label>
              </section>

              <section className={panelClass}>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-sm font-bold text-slate-700">Photo or video</h2>
                    <p className="mt-1 text-xs text-slate-400">JPG, PNG, WebP, MP4, or MOV up to 25 MB.</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-pink-200 px-4 py-2 text-xs font-bold text-pink-700">Upload new</button>
                    <button type="button" onClick={() => setActiveTab('library')} className="rounded-xl bg-pink-50 px-4 py-2 text-xs font-bold text-pink-700">Choose library</button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" className="hidden" onChange={event => selectFile(event.target.files?.[0])} />
                </div>
                {preview ? (
                  <div className="mt-4 flex items-start gap-4">
                    <MediaPreview item={preview} className="h-36 w-36 rounded-xl object-cover" />
                    <button type="button" onClick={() => { setFile(null); setLibraryItem(null); setPreview(null) }} className="text-xs font-bold text-red-600">Remove</button>
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
            {posts ? <Results posts={posts} setPosts={setPosts} postIds={postIds} mediaUrl={mediaUrl} employeeName={employeeName} linkedinConnected={linkedinConnected} /> : null}
          </>
        ) : null}
      </div>
    </main>
  )
}
