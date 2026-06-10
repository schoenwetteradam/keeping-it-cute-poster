'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', emoji: '📘', color: 'bg-blue-600' },
  { id: 'instagram', label: 'Instagram', emoji: '📸', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { id: 'linkedin', label: 'LinkedIn', emoji: '💼', color: 'bg-blue-700' },
]

const GOALS = [
  {
    id: 'booth_renters',
    label: 'Attract Booth Renters',
    emoji: '💈',
    description: 'Target stylists & beauty pros looking for a booth to rent',
  },
  {
    id: 'new_clients',
    label: 'Attract New Clients',
    emoji: '💇',
    description: 'Reach people looking for a new stylist or salon',
  },
  {
    id: 'showcase',
    label: 'Showcase My Work',
    emoji: '✨',
    description: 'Show off a transformation, style, or service — no specific pitch',
  },
  {
    id: 'community',
    label: 'Build Community',
    emoji: '🤝',
    description: 'Engage followers, share tips, or celebrate the salon culture',
  },
]

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="text-xl transition-transform hover:scale-110"
        >
          <span className={(hovered || value) >= star ? 'text-yellow-400' : 'text-gray-200'}>★</span>
        </button>
      ))}
    </div>
  )
}

function RatingCard({ postId, platform, employeeName }) {
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!rating) return
    setSubmitting(true)
    await fetch(`/api/posts/${postId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, notes, ratedBy: employeeName }),
    })
    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) return (
    <div className="mt-3 pt-3 border-t border-pink-50 text-sm text-green-600 font-medium">
      ✓ Thanks for the feedback! This helps the AI improve.
    </div>
  )

  return (
    <div className="mt-3 pt-3 border-t border-pink-50">
      <p className="text-xs font-semibold text-gray-500 mb-2">How was this post? (helps the AI learn)</p>
      <StarRating value={rating} onChange={setRating} />
      {rating > 0 && (
        <div className="mt-2 space-y-2">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional note (e.g. 'too formal', 'loved the energy')"
            rows={2}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#E91E8C] resize-none"
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="text-xs bg-[#E91E8C] text-white px-4 py-1.5 rounded-lg font-semibold disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Submit Rating'}
          </button>
        </div>
      )}
    </div>
  )
}

function InsightsTab() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const load = async () => {
    const res = await fetch('/api/posts?limit=50')
    const data = await res.json()
    setPosts(data.posts || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const syncAll = async () => {
    setSyncing(true)
    const res = await fetch('/api/posts/sync-all', { method: 'POST' })
    const data = await res.json()
    setSyncMsg(`Synced ${data.synced} posts`)
    await load()
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 4000)
  }

  const platformEmoji = { facebook: '📘', instagram: '📸', linkedin: '💼' }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">Post Performance</h3>
          <button onClick={syncAll} disabled={syncing} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-50">
            {syncing ? 'Syncing...' : '🔄 Sync Facebook Stats'}
          </button>
        </div>
        {syncMsg && <p className="text-green-600 text-sm mb-3">{syncMsg}</p>}
        {loading ? <p className="text-gray-400 text-sm">Loading...</p> : posts.length === 0 ? (
          <p className="text-gray-400 text-sm">No posts yet — generate and rate some posts to see insights here.</p>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.id} className="border border-pink-50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{platformEmoji[post.platform] || '📝'}</span>
                      <span className="text-xs font-semibold text-gray-500 uppercase">{post.platform}</span>
                      <span className="text-xs text-gray-400">· {post.goal?.replace('_', ' ')}</span>
                      {post.employee_name && <span className="text-xs text-pink-400">by {post.employee_name}</span>}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {post.post_text?.slice(0, 120)}{post.post_text?.length > 120 ? '...' : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {post.avg_rating > 0 && (
                      <div className="text-yellow-400 text-sm font-bold">{'★'.repeat(Math.round(post.avg_rating))}{'☆'.repeat(5 - Math.round(post.avg_rating))}</div>
                    )}
                    {post.avg_rating > 0 && <p className="text-xs text-gray-400">{Number(post.avg_rating).toFixed(1)}/5</p>}
                  </div>
                </div>
                {(post.likes > 0 || post.comments > 0 || post.shares > 0 || post.reach > 0) && (
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    {post.likes > 0 && <span>👍 {post.likes}</span>}
                    {post.comments > 0 && <span>💬 {post.comments}</span>}
                    {post.shares > 0 && <span>🔁 {post.shares}</span>}
                    {post.reach > 0 && <span>👁 {post.reach} reach</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="text-sm px-3 py-1.5 rounded-lg border border-pink-200 hover:bg-pink-50 transition-colors text-pink-600 font-medium"
    >
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  )
}

function MediaLibrary({ onSelect }) {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploaderName, setUploaderName] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const loadMedia = async () => {
    const res = await fetch('/api/media')
    const data = await res.json()
    setMedia(data.media || [])
    setLoading(false)
  }

  useEffect(() => { loadMedia() }, [])

  const handleUpload = async (f) => {
    if (!f) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', f)
    formData.append('uploadedBy', uploaderName)
    await fetch('/api/media/upload', { method: 'POST', body: formData })
    await loadMedia()
    setUploading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this file?')) return
    await fetch('/api/media', { method: 'DELETE', body: JSON.stringify({ id }), headers: { 'Content-Type': 'application/json' } })
    await loadMedia()
  }

  return (
    <div className="space-y-6">
      {/* Upload to library */}
      <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Add to Library</h3>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={uploaderName}
            onChange={e => setUploaderName(e.target.value)}
            placeholder="Your name (optional)"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
          />
        </div>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-pink-200 hover:border-[#E91E8C] rounded-xl p-8 text-center cursor-pointer hover:bg-pink-50 transition-all"
        >
          {uploading ? (
            <p className="text-[#E91E8C] font-medium">Uploading...</p>
          ) : (
            <>
              <span className="text-3xl block mb-2">📤</span>
              <p className="font-medium text-gray-600">Click to upload photo or video</p>
              <p className="text-xs text-gray-400 mt-1">Saved to the salon library for everyone to use</p>
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => handleUpload(e.target.files[0])} />
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Salon Media Library ({media.length} files)</h3>
        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : media.length === 0 ? (
          <p className="text-gray-400 text-sm">No files uploaded yet. Add some above!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {media.map(item => (
              <div key={item.id} className="relative group rounded-xl overflow-hidden border border-pink-100 bg-gray-50">
                {item.mime_type.startsWith('image/') ? (
                  <img src={item.url} alt={item.original_name} className="w-full h-32 object-cover" />
                ) : (
                  <video src={item.url} className="w-full h-32 object-cover" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  {onSelect && (
                    <button
                      onClick={() => onSelect(item)}
                      className="bg-[#E91E8C] text-white text-xs px-3 py-1.5 rounded-lg font-semibold"
                    >
                      Use for Post
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold"
                  >
                    Delete
                  </button>
                </div>
                <div className="p-2">
                  <p className="text-xs text-gray-500 truncate">{item.original_name}</p>
                  {item.uploaded_by && <p className="text-xs text-pink-400">{item.uploaded_by}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LibraryPicker({ onSelect, selected }) {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/media')
      .then(r => r.json())
      .then(data => { setMedia(data.media || []); setLoading(false) })
  }, [])

  if (loading) return <p className="text-gray-400 text-sm py-4">Loading library...</p>
  if (media.length === 0) return (
    <div className="border-2 border-dashed border-pink-100 rounded-xl p-6 text-center text-gray-400 text-sm">
      No files in library yet. Upload some in the Media Library tab!
    </div>
  )

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {media.map(item => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          className={`flex-shrink-0 relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
            selected?.id === item.id ? 'border-[#E91E8C] shadow-md' : 'border-pink-100 hover:border-pink-300'
          }`}
          style={{ width: 100 }}
        >
          {item.mime_type.startsWith('image/') ? (
            <img src={item.url} alt={item.original_name} className="w-full h-20 object-cover" />
          ) : (
            <video src={item.url} className="w-full h-20 object-cover" />
          )}
          {selected?.id === item.id && (
            <div className="absolute inset-0 bg-[#E91E8C]/20 flex items-center justify-center">
              <span className="text-[#E91E8C] text-xl font-bold">✓</span>
            </div>
          )}
          <div className="p-1">
            <p className="text-xs text-gray-400 truncate">{item.original_name}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('create')
  const [employeeName, setEmployeeName] = useState('')
  const [context, setContext] = useState('')
  const [goal, setGoal] = useState('booth_renters')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['facebook', 'instagram', 'linkedin'])
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [posts, setPosts] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const [postIds, setPostIds] = useState({})
  const [posting, setPosting] = useState({})
  const [postResults, setPostResults] = useState({})
  const [linkedinConnected, setLinkedinConnected] = useState(null)
  const [linkedinToast, setLinkedinToast] = useState(false)
  const [fileSource, setFileSource] = useState('upload')
  const [selectedLibraryItem, setSelectedLibraryItem] = useState(null)

  useEffect(() => {
    fetch('/api/linkedin/status')
      .then(r => r.json())
      .then(d => setLinkedinConnected(d.connected && !d.expired))
      .catch(() => setLinkedinConnected(false))

    const params = new URLSearchParams(window.location.search)
    if (params.get('linkedin') === 'connected') {
      setLinkedinToast(true)
      setTimeout(() => setLinkedinToast(false), 5000)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const syncFacebookStats = async () => {
    await fetch('/api/posts/sync-all', { method: 'POST' })
    alert('Facebook stats synced!')
  }

  const postToPlatform = async (platformId, text) => {
    setPosting(prev => ({ ...prev, [platformId]: 'loading' }))
    try {
      const res = await fetch(`/api/post/${platformId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, postId: postIds[platformId] }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      setPosting(prev => ({ ...prev, [platformId]: 'success' }))
      setPostResults(prev => ({ ...prev, [platformId]: data }))
    } catch (err) {
      setPosting(prev => ({ ...prev, [platformId]: 'error' }))
      setPostResults(prev => ({ ...prev, [platformId]: { error: err.message } }))
    }
  }

  const handleFile = (f) => {
    if (!f) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview({ url, type: f.type })
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!employeeName.trim()) { setError('Please enter your name'); return }
    if (selectedPlatforms.length === 0) { setError('Select at least one platform'); return }

    setLoading(true)
    setError(null)
    setPosts(null)

    try {
      const formData = new FormData()
      formData.append('employeeName', employeeName)
      formData.append('context', context)
      formData.append('goal', goal)
      formData.append('platforms', JSON.stringify(selectedPlatforms))
      if (file) formData.append('file', file)
      if (selectedLibraryItem) formData.append('libraryImageUrl', selectedLibraryItem.url)

      const res = await fetch('/api/generate', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setPosts(data.posts)
      setPostIds(data.postIds || {})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf4f9]">
      {/* Header */}
      <div className="bg-white border-b border-pink-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-1">
            <span className="text-4xl">✂️</span>
            <h1 className="text-3xl font-bold text-[#1a1a2e]">Keeping It Cute</h1>
            <span className="text-4xl">💅</span>
          </div>
          <p className="text-[#E91E8C] font-semibold tracking-wide text-sm uppercase">Salon & Spa · Social Media Post Generator</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-pink-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 w-full flex gap-1 pt-2">
          {[
            { id: 'create', label: '✨ Create Post' },
            { id: 'library', label: '📁 Media Library' },
            { id: 'insights', label: '📊 Insights' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#fdf4f9] text-[#E91E8C] border-b-2 border-[#E91E8C]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {activeTab === 'library' ? (
          <MediaLibrary onSelect={(item) => { setSelectedLibraryItem(item); setFileSource('library'); setActiveTab('create') }} />
        ) : activeTab === 'insights' ? (
          <InsightsTab />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name ✨</label>
              <input
                type="text"
                value={employeeName}
                onChange={e => setEmployeeName(e.target.value)}
                placeholder="e.g. Jessica"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:border-transparent transition text-gray-800"
              />
            </div>

            {/* Context */}
            <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tell us about this post 💬</label>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                rows={4}
                placeholder="e.g. Just finished this gorgeous balayage on a client — she came in wanting beachy waves and we DELIVERED. She cried happy tears! Used Redken shades..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:border-transparent transition text-gray-800 resize-none"
              />
            </div>

            {/* Goal / Audience */}
            <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-1">What's the goal of this post? 🎯</label>
              <p className="text-xs text-gray-400 mb-4">This tells the AI who you're trying to reach so the message lands right.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GOALS.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoal(g.id)}
                    className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      goal === g.id
                        ? 'border-[#E91E8C] bg-pink-50'
                        : 'border-gray-100 hover:border-pink-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm text-gray-800 mb-0.5">
                      <span>{g.emoji}</span> {g.label}
                      {goal === g.id && <span className="ml-auto text-[#E91E8C] text-xs font-bold">✓ Selected</span>}
                    </div>
                    <p className="text-xs text-gray-400 leading-snug">{g.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* File / Media */}
            <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Photo or Video 📸</label>

              {/* Toggle */}
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'upload', label: 'Upload New' },
                  { id: 'library', label: 'Pick from Library' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { setFileSource(opt.id); setSelectedLibraryItem(null); setFile(null); setPreview(null) }}
                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                      fileSource === opt.id
                        ? 'bg-[#E91E8C] text-white border-[#E91E8C]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {fileSource === 'upload' ? (
                <>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      dragOver ? 'border-[#E91E8C] bg-pink-50' : 'border-pink-200 hover:border-[#E91E8C] hover:bg-pink-50'
                    }`}
                  >
                    {preview ? (
                      <div className="flex flex-col items-center gap-3">
                        {preview.type.startsWith('image/') ? (
                          <img src={preview.url} alt="Preview" className="max-h-48 rounded-lg object-cover shadow-md" />
                        ) : (
                          <video src={preview.url} className="max-h-48 rounded-lg shadow-md" controls />
                        )}
                        <p className="text-sm text-gray-500">Click to change file</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <span className="text-4xl">📁</span>
                        <p className="font-medium text-gray-600">Drag & drop or click to upload</p>
                        <p className="text-sm">Photos or Videos (optional)</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={e => handleFile(e.target.files[0])}
                  />
                </>
              ) : (
                <div>
                  <LibraryPicker
                    onSelect={(item) => {
                      setSelectedLibraryItem(item)
                      setFile(null)
                      setPreview({ url: item.url, type: item.mime_type })
                    }}
                    selected={selectedLibraryItem}
                  />
                  {selectedLibraryItem && preview && (
                    <div className="mt-4 flex flex-col items-center gap-2">
                      {preview.type.startsWith('image/') ? (
                        <img src={preview.url} alt="Selected" className="max-h-48 rounded-lg object-cover shadow-md" />
                      ) : (
                        <video src={preview.url} className="max-h-48 rounded-lg shadow-md" controls />
                      )}
                      <p className="text-xs text-[#E91E8C] font-medium">✓ {selectedLibraryItem.original_name} selected</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Platforms */}
            <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Generate posts for 🌐</label>
              <div className="flex flex-wrap gap-3">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all border-2 ${
                      selectedPlatforms.includes(p.id)
                        ? 'bg-[#E91E8C] text-white border-[#E91E8C] shadow-md'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-[#E91E8C]'
                    }`}
                  >
                    <span>{p.emoji}</span> {p.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: loading ? '#ccc' : 'linear-gradient(135deg, #E91E8C, #C9A84C)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 12h4a8 8 0 01-8 8" />
                  </svg>
                  Crafting your posts...
                </span>
              ) : '✨ Generate Posts'}
            </button>
          </form>
        )}

        {/* Results */}
        {posts && activeTab === 'create' && (
          <div className="mt-10 space-y-5">
            {linkedinToast && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">
                ✓ LinkedIn connected successfully! You can now post directly to LinkedIn.
              </div>
            )}

            <h2 className="text-xl font-bold text-[#1a1a2e] text-center">Your Posts Are Ready! 🎉</h2>

            {linkedinConnected === false && posts['linkedin'] && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
                <span>⚠️ LinkedIn not connected — connect to enable direct posting</span>
                <a
                  href="/api/linkedin/auth"
                  className="ml-4 text-blue-700 font-semibold underline hover:no-underline whitespace-nowrap"
                >
                  Connect LinkedIn →
                </a>
              </div>
            )}

            {PLATFORMS.filter(p => posts[p.id]).map(p => {
              const status = posting[p.id] || 'idle'
              const result = postResults[p.id]
              return (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-pink-50 flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-bold text-gray-800">
                      <span className="text-xl">{p.emoji}</span>
                      <span>{p.label}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-gray-400">{posts[p.id].length} chars</span>
                      <CopyButton text={posts[p.id]} />
                      {p.id === 'linkedin' && linkedinConnected === false ? (
                        <a
                          href="/api/linkedin/auth"
                          className="text-sm px-3 py-1.5 rounded-lg bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors"
                        >
                          Connect LinkedIn
                        </a>
                      ) : (
                        <button
                          onClick={() => postToPlatform(p.id, posts[p.id])}
                          disabled={status === 'loading' || status === 'success'}
                          className="text-sm px-3 py-1.5 rounded-lg bg-[#E91E8C] text-white font-medium hover:bg-pink-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          {status === 'loading' ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 12h4a8 8 0 01-8 8" />
                              </svg>
                              Posting...
                            </>
                          ) : status === 'success' ? (
                            <span className="text-green-100">✓ Posted!</span>
                          ) : (
                            'Post Now 🚀'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {status === 'success' && result?.url && (
                    <div className="px-6 py-2 bg-green-50 border-b border-green-100 text-sm text-green-700 flex items-center gap-2">
                      ✓ Successfully posted!
                      <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:no-underline ml-1">
                        View Post →
                      </a>
                    </div>
                  )}
                  {status === 'error' && result?.error && (
                    <div className="px-6 py-2 bg-red-50 border-b border-red-100 text-sm text-red-600">
                      ⚠️ {result.error}
                    </div>
                  )}
                  <div className="px-6 py-5">
                    <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed text-sm">{posts[p.id]}</pre>
                    {postIds[p.id] && (
                      <RatingCard postId={postIds[p.id]} platform={p.id} employeeName={employeeName} />
                    )}
                  </div>
                </div>
              )
            })}
            {postResults.facebook?.success && (
              <button
                onClick={syncFacebookStats}
                className="w-full py-2.5 rounded-xl border-2 border-blue-200 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-colors"
              >
                📊 Sync Facebook Engagement Stats
              </button>
            )}
            <button
              onClick={() => { setPosts(null); setContext(''); setFile(null); setPreview(null); setGoal('booth_renters'); setPosting({}); setPostResults({}); setSelectedLibraryItem(null); setFileSource('upload'); setPostIds({}) }}
              className="w-full py-3 rounded-2xl border-2 border-pink-200 text-[#E91E8C] font-semibold hover:bg-pink-50 transition-colors"
            >
              Create Another Post
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
