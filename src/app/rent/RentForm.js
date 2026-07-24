'use client'

import { useState } from 'react'

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100'

export default function RentForm({ salonName }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', services: '', timeframe: '', message: '', company: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
      setStatus('sent')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-lg font-bold text-emerald-800">Thank you! 🎉</p>
        <p className="mt-2 text-sm text-emerald-700">
          Your info is on its way to the {salonName} team. We&apos;ll reach out soon to talk about
          openings and set up a tour.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Honeypot: hidden from real users; bots fill it and get silently dropped. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', height: 0, width: 0, overflow: 'hidden' }}>
        <label>Company
          <input type="text" tabIndex={-1} autoComplete="off" value={form.company} onChange={set('company')} />
        </label>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Your name <span className="text-pink-500">*</span></label>
        <input value={form.name} onChange={set('name')} className={inputClass} placeholder="Jordan Rivera" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Phone</label>
          <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} placeholder="(555) 123-4567" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
          <input type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="you@email.com" />
        </div>
      </div>
      <p className="text-xs text-slate-400">Leave a phone number or email — whichever you prefer we use.</p>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">What do you do?</label>
        <input value={form.services} onChange={set('services')} className={inputClass} placeholder="Hair color & cuts, nails, lashes, esthetics…" />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">When are you looking to move?</label>
        <input value={form.timeframe} onChange={set('timeframe')} className={inputClass} placeholder="Right away, next month, just exploring…" />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Anything else?</label>
        <textarea value={form.message} onChange={set('message')} rows={3} className={inputClass} placeholder="Tell us about your business, your clients, or any questions you have." />
      </div>

      {status === 'error' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-full bg-pink-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-pink-600/20 transition hover:bg-pink-700 disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending…' : 'Send my info'}
      </button>
    </form>
  )
}
