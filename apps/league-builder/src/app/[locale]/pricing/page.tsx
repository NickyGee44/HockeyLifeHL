import type { Metadata } from 'next';
import { Barlow_Condensed, IBM_Plex_Mono } from 'next/font/google';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'Pricing | BeerLeagueHockey.ca',
  description:
    "BeerLeagueHockey.ca pricing for leagues that want operations and a public website in one system. League pays Stripe processing, players pay BLH's platform fee.",
};

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

const pricingColumns = [
  {
    label: 'League pays',
    title: 'Stripe processing fees',
    body: "Stripe processing fees are paid by the league through its connected Stripe account. That is the processor cost, not BLH's software fee.",
  },
  {
    label: 'Players pay',
    title: 'BLH platform fee at checkout',
    body: 'BLH is built so the platform fee can be passed through player checkout by default for leagues running online registration.',
  },
  {
    label: 'Qualified switches',
    title: 'First-season partner pricing',
    body: 'Qualified leagues can access first-season partner pricing as low as 1.5% while we scope migration, payment mix, and rollout timing.',
  },
];

const competitorPatterns = [
  {
    title: 'Website sold separately',
    body: 'Many competitors advertise the public website, but price it as a separate website product, bundle, or template tier.',
  },
  {
    title: 'Pricing hidden behind demos',
    body: 'Competitor public pricing pages often push leagues into a quote flow before they explain who pays software fees versus processor fees.',
  },
  {
    title: 'Operations and public site split apart',
    body: 'It is common to see payments, communications, website, and player-facing updates scattered across multiple tools.',
  },
];

const includedItems = [
  'Registrations and player checkout',
  'Schedules, standings, skater stats, and goalie stats',
  'Public league website, sponsors, and news',
  'Commissioner controls for reminders, balances, and season setup',
];

const faqItems = [
  {
    question: 'What does the league pay?',
    answer:
      'The league pays Stripe processing fees on its connected Stripe account. That is the payment processor cost.',
  },
  {
    question: 'What do players pay?',
    answer:
      'Players pay the BLH platform fee at checkout when the league uses the default pass-through model for online registration.',
  },
  {
    question: 'Is the public website included?',
    answer:
      'Yes. The public website is included as part of BLH and is connected to the same schedules, standings, stats, sponsors, and news that the commissioner is already managing.',
  },
  {
    question: 'What if we are switching from spreadsheets or another platform?',
    answer:
      'That is what the migration scoping and partner pricing conversation is for. We plan the move around your current website, payment mix, data history, and launch timing.',
  },
];

export default function PricingPage() {
  return (
    <main
      className={`${barlowCondensed.variable} ${mono.variable} relative min-h-screen overflow-x-hidden bg-background pt-24 text-foreground md:pt-0`}
    >
      <div className="noise-overlay" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" opacity="0.4" />
        </svg>
      </div>

      <Navbar />

      <section className="relative overflow-hidden border-b border-white/[0.07] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_34%),linear-gradient(180deg,rgba(11,20,32,0.92),rgba(5,8,13,1))]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-30">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-300 transition-all duration-300 hover:-translate-y-[1px] hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to homepage
          </Link>

          <div className="mt-10 max-w-4xl space-y-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">Public pricing</p>
            <h1 className="font-heading text-5xl font-bold uppercase tracking-tight text-white md:text-7xl">
              League pays Stripe.
              <span className="mt-2 block bg-gradient-to-r from-white via-rink-200 to-rink-400 bg-clip-text text-transparent">
                Players pay BLH.
              </span>
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-neutral-300 md:text-xl">
              This is the public pricing story we want leagues to understand quickly. BLH includes
              the public website and league operations in one system, while the software fee can
              stay with player checkout instead of turning into another admin subscription.
            </p>
            <p className="max-w-3xl text-sm leading-7 text-neutral-400 md:text-base">
              Qualified leagues switching to BLH can access first-season partner pricing as low as
              1.5%, with migration, onboarding, and mixed payment workflows scoped around how the
              league actually operates.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="overflow-hidden rounded-[2.6rem] border border-white/10 bg-white/[0.03]">
          <div className="grid gap-0 lg:grid-cols-3">
            {pricingColumns.map((column, index) => (
              <article
                key={column.title}
                className={`px-6 py-8 md:px-8 md:py-10 ${
                  index > 0 ? 'border-t border-white/[0.08] lg:border-l lg:border-t-0' : ''
                }`}
              >
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-rink-300">
                  {column.label}
                </p>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">{column.title}</h2>
                <p className="mt-4 text-sm leading-7 text-neutral-300">{column.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.07] bg-[#060b12] py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
                Why this matters
              </p>
              <h2 className="mt-4 font-heading text-4xl font-bold uppercase tracking-tight text-white md:text-5xl">
                Most competitor pricing pages stay fuzzy where the league actually pays.
              </h2>
              <p className="mt-5 text-lg leading-8 text-neutral-300">
                Public competitor sites usually lead with the same feature stack we do: website,
                registration, schedules, payments, app, communication. The real decision point is
                whether the league is paying separate software and website costs on top of payment
                processing.
              </p>
            </div>

            <div className="space-y-5">
              {competitorPatterns.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
                    Competitor pattern
                  </p>
                  <h3 className="mt-3 text-2xl font-bold tracking-tight text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-neutral-400">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
              Included with BLH
            </p>
            <ul className="mt-5 space-y-4">
              {includedItems.map((item) => (
                <li key={item} className="flex gap-4 text-sm leading-7 text-neutral-300 md:text-base">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2.4rem] border border-accent/[0.18] bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(255,255,255,0.03),rgba(59,130,246,0.1))] p-7 md:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
              Stripe note
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white">
              The league pays Stripe fees. Players pay our fees.
            </h2>
            <p className="mt-4 text-sm leading-7 text-neutral-200">
              Stripe processing fees are paid by the league through its connected Stripe account.
              BLH platform fees are separate and can be added to player checkout for leagues running
              the default pass-through model. That is the public pricing distinction we want to keep
              obvious.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/book-demo"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-base font-semibold text-[#0B1420] transition-all duration-300 hover:scale-[1.03]"
              >
                Book a Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-6 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-[1px] hover:bg-white/10"
              >
                Create an Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 md:pb-24">
        <div className="grid gap-5 md:grid-cols-2">
          {faqItems.map((item) => (
            <article
              key={item.question}
              className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6"
            >
              <h2 className="text-lg font-semibold text-white">{item.question}</h2>
              <p className="mt-3 text-sm leading-7 text-neutral-400">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
