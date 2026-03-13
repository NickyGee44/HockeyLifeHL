import type { Metadata } from 'next';
import { Barlow_Condensed, IBM_Plex_Mono } from 'next/font/google';
import { ArrowRight, Mail } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export const metadata: Metadata = {
  title: 'Book a Demo | BeerLeagueHockey.ca',
  description:
    'Tell BLH whether you are launching a new league or moving an existing one, and we will walk you through registrations, payments, schedules, stats, public league websites, rollout options, and first-season partner pricing for qualified leagues.',
};

const demoEmail = 'mailto:support@beerleaguehockey.ca?subject=BLH%20Demo%20Request';
const migrationEmail = 'mailto:support@beerleaguehockey.ca?subject=BLH%20League%20Migration';

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

export default function BookDemoPage() {
  return (
    <main className={`${barlowCondensed.variable} ${mono.variable} min-h-screen bg-background text-foreground`}>
      <section className="border-b border-white/5 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_35%),linear-gradient(180deg,rgba(11,20,32,0.92),rgba(5,8,13,1))]">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-300 transition-all duration-300 hover:-translate-y-[1px] hover:text-white"
          >
            Back to homepage
          </Link>

          <div className="mt-8 max-w-4xl space-y-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">Book a Demo</p>
            <h1 className="font-heading text-5xl font-bold uppercase tracking-tight text-white md:text-7xl">
              See how BLH fits your league.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-neutral-300 md:text-xl">
              Tell us whether you are launching a new league or moving an existing one. We&apos;ll walk through registrations, payments, schedules, standings, stats, public league websites, and the rollout path that fits your operation.
            </p>
            <p className="max-w-3xl text-sm leading-7 text-neutral-400 md:text-base">
              Qualified leagues can also talk through first-season partner pricing, including flexible year-one structures for leagues switching from spreadsheets or mixed payment workflows.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="grid gap-8 md:grid-cols-2">
          <article
            id="new-league"
            className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 shadow-surface"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-ice">Launching a new league</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Start with the system you actually want to keep.
            </h2>
            <ul className="mt-8 space-y-4 text-neutral-300">
              <li>Review registration, payment, schedule, standings, and stats workflows.</li>
              <li>Understand what the public league website includes on day one.</li>
              <li>Get a rollout recommendation based on your season structure and timing.</li>
            </ul>
            <a
              href={demoEmail}
              className="group mt-10 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0B1420] transition-all duration-300 hover:scale-[1.03]"
            >
              <Mail className="h-4 w-4" />
              Request a Demo by Email
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
          </article>

          <article
            id="existing-league"
            className="rounded-[2.5rem] border border-accent/20 bg-gradient-to-br from-accent/10 to-transparent p-8 shadow-surface"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Running an existing league</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Scope the migration before you move the season.
            </h2>
            <ul className="mt-8 space-y-4 text-neutral-300">
              <li>Talk through your current website, registration stack, and admin workflow.</li>
              <li>Decide what needs to migrate now versus what can be phased in later.</li>
              <li>Review whether first-season partner pricing fits your league size, payment mix, and onboarding scope.</li>
            </ul>
            <a
              href={migrationEmail}
              className="group mt-10 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all duration-300 hover:scale-[1.03]"
            >
              <Mail className="h-4 w-4" />
              Plan Your Migration
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
          </article>
        </div>

        <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-6 text-sm leading-7 text-neutral-400">
          <p className="mb-3 text-xs font-mono uppercase tracking-[0.2em] text-accent">First Season Partner Offer</p>
          <p className="mb-4">
            Qualified leagues may access first-season pricing as low as <span className="font-semibold text-white">1.5%</span>. Final year-one pricing depends on league size, payment mix, and onboarding needs.
          </p>
          Prefer to explore first?{' '}
          <Link href="/signup" className="text-ice underline decoration-white/30 underline-offset-4 transition-colors hover:text-white">
            Create an account
          </Link>
          {' '}and review the product flow, or email support@beerleaguehockey.ca with your league size, registration model, and target launch window.
        </div>
      </section>
    </main>
  );
}
