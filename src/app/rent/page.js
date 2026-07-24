import db from '@/lib/db'
import RentForm from './RentForm'
import Reveal from './Reveal'

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

// ── Vector icons (Lucide-style line icons) ────────────────────────────────
const svg = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

function CrownIcon() {
  return (
    <svg {...svg}>
      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
      <path d="M5 21h14" />
    </svg>
  )
}
function PinIcon() {
  return (
    <svg {...svg}>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg {...svg}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function EarningsIcon() {
  return (
    <svg {...svg}>
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

const BENEFITS = [
  { Icon: CrownIcon, title: 'Be your own boss', body: 'Set your own hours, prices, and services. Your clients, your brand, your business — just without the overhead of your own storefront.' },
  { Icon: PinIcon, title: 'An established location', body: 'Walk into a professional, fully-equipped salon with a reputation already built. Skip the years it takes to establish a space.' },
  { Icon: UsersIcon, title: 'A supportive team', body: 'Share a space with other beauty professionals who lift each other up — referrals, community, and a place you actually want to work.' },
  { Icon: EarningsIcon, title: 'Keep what you earn', body: 'A flat, predictable rent instead of a commission split. The more you grow, the more stays in your pocket.' },
]

export default async function RentPage() {
  const brand = await getBrand()
  const location = brand.location

  return (
    <main className="relative min-h-screen overflow-x-clip bg-gradient-to-b from-[#fdf4f9] to-white text-slate-800">
      {/* Soft, floating brand-color blobs (pink · violet · gold) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-float absolute -left-24 -top-24 h-72 w-72 rounded-full bg-pink-300/40 blur-3xl" />
        <div className="animate-float absolute right-[-6rem] top-40 h-80 w-80 rounded-full bg-violet-300/40 blur-3xl" style={{ animationDelay: '1.5s' }} />
        <div className="animate-float absolute left-1/2 top-[-2rem] h-56 w-56 -translate-x-1/2 rounded-full bg-amber-200/50 blur-3xl" style={{ animationDelay: '3s' }} />
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-12 pb-10 text-center sm:pt-16">
        <img
          src="/images/logo.png"
          alt={brand.salonName}
          width={160}
          height={160}
          className="animate-pop-in mx-auto mb-5 h-32 w-32 object-contain sm:h-36 sm:w-36"
        />
        <h1 className="animate-pop-in text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl" style={{ animationDelay: '.1s' }}>
          Rent your chair.<br />Grow your own business.
        </h1>
        <p className="animate-pop-in mx-auto mt-5 max-w-xl text-lg text-slate-600" style={{ animationDelay: '.2s' }}>
          We&apos;re welcoming independent stylists, nail techs, and estheticians to
          {location ? ` our salon in ${location}` : ' our salon'}. Bring your clients, keep your
          independence, and let us handle the space.
        </p>
        <a
          href="#apply"
          className="btn-sheen animate-pop-in mt-8 inline-block rounded-full bg-pink-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-pink-600/20 transition duration-300 hover:-translate-y-0.5 hover:bg-pink-700 hover:shadow-xl hover:shadow-pink-600/30"
          style={{ animationDelay: '.3s' }}
        >
          Ask about availability
        </a>
      </section>

      {/* See the space */}
      <Reveal as="section" className="mx-auto max-w-5xl px-5 py-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <figure className="group overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm transition duration-300 hover:shadow-md">
            <div className="overflow-hidden">
              <img
                src="/images/salon-styling-room.jpg"
                alt="A bright styling suite with white-and-gold chairs, arched mirrors, and marble flooring"
                width={1600}
                height={1200}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <figcaption className="px-4 py-3 text-sm font-semibold text-slate-600">Styling suite — your chair, ready to go</figcaption>
          </figure>
          <figure className="group overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm transition duration-300 hover:shadow-md">
            <div className="overflow-hidden">
              <img
                src="/images/salon-spa-room.jpg"
                alt="A soft, welcoming esthetics and spa treatment room with gold shelving and greenery"
                width={1600}
                height={1200}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <figcaption className="px-4 py-3 text-sm font-semibold text-slate-600">Esthetics &amp; spa room — for skin, lashes &amp; more</figcaption>
          </figure>
        </div>
        <p className="mt-3 text-center text-sm text-slate-500">Real rooms at {brand.salonName} — move-in ready and waiting for you.</p>
      </Reveal>

      {/* Salon's own pitch */}
      {brand.boothBenefits ? (
        <Reveal as="section" className="mx-auto max-w-2xl px-5 py-6">
          <div className="relative rounded-2xl border border-pink-100 bg-white p-6 text-center shadow-sm">
            <span aria-hidden="true" className="absolute left-4 top-1 font-serif text-5xl leading-none text-pink-200">&ldquo;</span>
            <p className="relative text-lg italic text-slate-700">{brand.boothBenefits}</p>
          </div>
        </Reveal>
      ) : null}

      {/* Benefits */}
      <section className="mx-auto max-w-4xl px-5 py-10">
        <div className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map(({ Icon, title, body }, i) => (
            <Reveal
              key={title}
              delay={i * 90}
              className="group rounded-2xl border border-pink-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 text-white shadow-sm transition duration-300 group-hover:scale-110">
                <Icon />
              </div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Established storefront */}
      <Reveal as="section" className="mx-auto max-w-4xl px-5 py-8">
        <div className="grid items-center gap-6 sm:grid-cols-2">
          <figure className="group mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm transition duration-300 hover:shadow-md">
            <div className="overflow-hidden">
              <img
                src="/images/salon-storefront.jpg"
                alt={`The ${brand.salonName} storefront${location ? ` in ${location}` : ''}`}
                width={1000}
                height={1333}
                loading="lazy"
                className="w-full object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
          </figure>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-black text-slate-950">A real home for your business</h2>
            <p className="mt-3 text-slate-600">
              {brand.salonName} is an established, welcoming salon{location ? ` right in ${location}` : ''} —
              with walk-by visibility, a loyal local following, and a space that already feels like home.
              Step into a business that&apos;s ready for you on day one.
            </p>
          </div>
        </div>
      </Reveal>

      {/* Application form */}
      <Reveal as="section" id="apply" className="mx-auto max-w-xl px-5 py-12 scroll-mt-8">
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
      </Reveal>

      <footer className="border-t border-pink-100 py-8 text-center text-sm text-slate-400">
        {brand.salonName}{location ? ` · ${location}` : ''}
      </footer>
    </main>
  )
}
