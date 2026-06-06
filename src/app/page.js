'use client'

import { useState, useRef, useCallback } from 'react'

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

export default function Home() {
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

      const res = await fetch('/api/generate', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setPosts(data.posts)
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

      <div className="max-w-4xl mx-auto px-4 py-10">
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

          {/* File Upload */}
          <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Upload Photo or Video 📸</label>
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

        {/* Results */}
        {posts && (
          <div className="mt-10 space-y-5">
            <h2 className="text-xl font-bold text-[#1a1a2e] text-center">Your Posts Are Ready! 🎉</h2>
            {PLATFORMS.filter(p => posts[p.id]).map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-pink-50">
                  <div className="flex items-center gap-2 font-bold text-gray-800">
                    <span className="text-xl">{p.emoji}</span>
                    <span>{p.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{posts[p.id].length} chars</span>
                    <CopyButton text={posts[p.id]} />
                  </div>
                </div>
                <div className="px-6 py-5">
                  <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed text-sm">{posts[p.id]}</pre>
                </div>
              </div>
            ))}
            <button
              onClick={() => { setPosts(null); setContext(''); setFile(null); setPreview(null); setGoal('booth_renters') }}
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
