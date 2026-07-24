import db from '@/lib/db'
import RentForm from './RentForm'

export const dynamic = 'force-dynamic'

const DEFAULTS = {
  salonName: 'Keeping It Cute Salon & Spa',
  location: '',
  bookingUrl: '',
  boothBenefits: 'Supportive team culture, flexible schedules, professional environment, and room to grow an independent beauty business.',
}

async function getBrand() {
  try {
    const rows = await db.settings.getAll()
    const brand = { ...DEFAULTS }
    for (const row of rows) if (row.key in brand) brand[row.key] = row.value || brand[row.key]
    return brand
  } catch {
    return { ...DEFAULTS }
  }
}

export async function generateMetadata() {
  const brand = await getBrand()
  const where = brand.location ? ` in ${brand.location}` : ''
  return {
    title: `Booth & Chair Rental${where} — ${brand.salonName}`,
    description: `Rent a booth or chair at ${brand.salonName}${where}. Build your own beauty business in an established, professional salon. Ask about availability today.`,
    openGraph: {
      title: `Booth & Chair Rental — ${brand.salonName}`,
      description: `Independent stylists, nail techs, and estheticians: grow your business at ${brand.salonName}${where}.`,
      type: 'website',
    },
  }
}

const BENEFITS = [
  { title: 'Be your own boss', body: 'Set your own hours, prices, and services. Your clients, your brand, your business — just without the overhead of your own storefront.' },
  { title: 'An established location', body: 'Walk into a professional, fully-equipped salon with foot traffic and a reputation already built. Skip the years it takes to establish a space.' },
  { title: 'A supportive team', body: 'Share a space with other beauty professionals who lift each other up — referrals, community, and a place you actually want to work.' },
  { title: 'Keep what you earn', body: 'A flat, predictable rent instead of a commission split. The more you grow, the more stays in your pocket.' },
]

export default async function RentPage() {
  const brand = await getBrand()
  const location = brand.location

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fdf4f9] to-white text-slate-800">
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-10 text-center sm:pt-24">
        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-pink-600">
          {brand.salonName}
        </p>
        <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
          Rent your chair.<br />Grow your own business.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
          We&apos;re welcoming independent stylists, nail techs, and estheticians to
          {location ? ` our salon in ${location}` : ' our salon'}. Bring your clients, keep your
          independence, and let us handle the space.
        </p>
        <a
          href="#apply"
          className="mt-8 inline-block rounded-full bg-pink-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-pink-600/20 transition hover:bg-pink-700"
        >
          Ask about availability
        </a>
      </section>

      {/* Salon's own pitch */}
      {brand.boothBenefits ? (
        <section className="mx-auto max-w-2xl px-5 py-6">
          <div className="rounded-2xl border border-pink-100 bg-white p-6 text-center shadow-sm">
            <p className="text-lg italic text-slate-700">&ldquo;{brand.boothBenefits}&rdquo;</p>
          </div>
        </section>
      ) : null}

      {/* Benefits */}
      <section className="mx-auto max-w-4xl px-5 py-10">
        <div className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map(b => (
            <div key={b.title} className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">{b.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Application form */}
      <section id="apply" className="mx-auto max-w-xl px-5 py-12 scroll-mt-8">
        <div className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-slate-950">Let&apos;s talk</h2>
          <p className="mt-2 text-sm text-slate-600">
            Tell us a little about yourself and we&apos;ll reach out about openings, pricing, and a
            tour. No commitment — just a conversation.
          </p>
          <div className="mt-6">
            <RentForm salonName={brand.salonName} />
          </div>
        </div>
      </section>

      <footer className="border-t border-pink-100 py-8 text-center text-sm text-slate-400">
        {brand.salonName}{location ? ` · ${location}` : ''}
      </footer>
    </main>
  )
}
