// Lead-notification email. Best-effort by design: this is a side effect of a
// successful lead insert, never a gate on it. Nothing here throws — failures
// are logged and swallowed so a form submission always succeeds even if email
// is misconfigured or the provider is down.
//
// Supports two providers, picked by whichever env vars are present:
//   1. Resend  — set RESEND_API_KEY (recommended; verify a sending domain)
//   2. SMTP    — set SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS (nodemailer)
// If neither is configured, the email is skipped (and logged) — the lead is
// still saved and visible in the Leads tab.

const DEFAULT_RECIPIENTS = 'nay3li@live.com, adamschoenwetter@outlook.com'
const RESEND_URL = process.env.RESEND_API_URL || 'https://api.resend.com/emails'

function recipients() {
  return (process.env.LEAD_NOTIFY_TO || DEFAULT_RECIPIENTS)
    .split(',').map(s => s.trim()).filter(Boolean)
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

const FIELDS = [
  ['Name', 'name'],
  ['Phone', 'phone'],
  ['Email', 'email'],
  ['Specialty', 'services'],
  ['License', 'license_status'],
  ['Works now', 'current_situation'],
  ['Clients', 'client_base'],
  ['Timeframe', 'timeframe'],
  ['Availability', 'availability'],
  ['Message', 'message'],
]

function renderLead(lead) {
  const rows = FIELDS.map(([label, key]) => [label, lead[key]]).filter(([, v]) => v)
  const text = [
    'New booth-rental inquiry',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'This lead is also saved in the app under the Leads tab.',
  ].join('\n')

  const html = `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
    <h2 style="color:#be185d;margin:0 0 4px">New booth-rental inquiry</h2>
    <p style="margin:0 0 16px;color:#64748b;font-size:14px">Someone just filled out the rental page.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows.map(([k, v]) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1e3e8;font-weight:600;color:#64748b;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1e3e8">${escapeHtml(v)}</td>
      </tr>`).join('')}
    </table>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px">This lead is also saved in the app under the <b>Leads</b> tab.</p>
  </div>`

  return { text, html }
}

async function sendViaResend({ to, subject, text, html, replyTo }) {
  const from = process.env.LEAD_NOTIFY_FROM || 'Keeping It Cute <onboarding@resend.dev>'
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, text, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  })
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`)
  return { sent: 'resend' }
}

async function sendViaSmtp({ to, subject, text, html, replyTo }) {
  const nodemailer = (await import('nodemailer')).default
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  await transport.sendMail({
    from: process.env.LEAD_NOTIFY_FROM || process.env.SMTP_USER,
    to, subject, text, html,
    ...(replyTo ? { replyTo } : {}),
  })
  return { sent: 'smtp' }
}

export async function sendLeadNotification(lead) {
  try {
    const to = recipients()
    if (!to.length) return { skipped: 'no recipients configured' }

    const { text, html } = renderLead(lead)
    const subject = `New booth-rental inquiry — ${lead.name}`
    // If the renter left an email, make it the reply-to so a reply reaches them.
    const replyTo = lead.email || undefined

    if (process.env.RESEND_API_KEY) return await sendViaResend({ to, subject, text, html, replyTo })
    if (process.env.SMTP_HOST) return await sendViaSmtp({ to, subject, text, html, replyTo })

    console.warn('Lead notification email skipped: no provider configured (set RESEND_API_KEY or SMTP_HOST).')
    return { skipped: 'no provider configured' }
  } catch (err) {
    console.error('Lead notification email failed (lead was still saved):', err)
    return { error: err.message }
  }
}
