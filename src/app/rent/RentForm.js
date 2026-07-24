'use client'

import { useState } from 'react'

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100'

const SPECIALTIES = ['Hair stylist', 'Barber', 'Nail tech', 'Esthetician', 'Lash & brow artist', 'Makeup artist', 'Massage therapist', 'Other']
const LICENSE_OPTIONS = ['Licensed & practicing', 'Recently licensed', 'In school / testing soon', "I'd rather discuss"]
const SITUATION_OPTIONS = ['Renting a booth elsewhere', 'At a commission salon', 'In a private suite / studio', 'Working from home', 'Just getting started', 'Between spaces right now']
const CLIENT_OPTIONS = ['Yes — a full book', 'Yes — some regulars', 'Still building my book', 'Just starting out']
const TIMEFRAME_OPTIONS = ['As soon as possible', 'Within a month', '1–3 months', 'Just exploring for now']
const AVAILABILITY_OPTIONS = ['Full-time', 'Part-time', 'Weekends', 'Flexible']

function Select({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      <select value={value} onChange={onChange} className={inputClass}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export default function RentForm({ salonName }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', services: '', licenseStatus: '',
    currentSituation: '', clientBase: '', timeframe: '', availability: '',
    message: '', company: '',
  })
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
          openings, pricing, and setting up a time to see the space.
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
      <p className="-mt-1 text-xs text-slate-400">Leave a phone number or email — whichever you prefer we use.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Your specialty" value={form.services} onChange={set('services')} options={SPECIALTIES} placeholder="Select your main service" />
        <Select label="Are you licensed?" value={form.licenseStatus} onChange={set('licenseStatus')} options={LICENSE_OPTIONS} placeholder="Select one" />
      </div>

      <Select label="Where are you working now?" value={form.currentSituation} onChange={set('currentSituation')} options={SITUATION_OPTIONS} placeholder="Select one" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Would you bring clients with you?" value={form.clientBase} onChange={set('clientBase')} options={CLIENT_OPTIONS} placeholder="Select one" />
        <Select label="When would you like to start?" value={form.timeframe} onChange={set('timeframe')} options={TIMEFRAME_OPTIONS} placeholder="Select one" />
      </div>

      <Select label="How much do you want to work?" value={form.availability} onChange={set('availability')} options={AVAILABILITY_OPTIONS} placeholder="Select one" />

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Anything else you&apos;d like us to know?</label>
        <textarea value={form.message} onChange={set('message')} rows={3} className={inputClass} placeholder="What matters most to you in a salon home? Any questions about the space, pricing, or the team?" />
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
      <p className="text-center text-xs text-slate-400">No commitment — this just helps us have a better first conversation.</p>
    </form>
  )
}
