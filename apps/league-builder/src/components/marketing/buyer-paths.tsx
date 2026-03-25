'use client';

import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export function BuyerPaths() {
  return (
    <section id="migration" className="relative w-full border-t border-white/[0.07] bg-background-elevated py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl space-y-4">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
            New league or existing league
          </p>
          <h2 className="font-heading text-4xl font-bold uppercase tracking-tight text-white md:text-5xl">
            Launch clean or switch without guessing the rollout.
          </h2>
          <p className="text-lg font-medium leading-8 text-neutral-400">
            BLH works for new launches and established leagues. The point is to scope the season,
            public site, payment model, and migration plan before you are in the middle of league
            night.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          <div className="rounded-[2.5rem] border border-white/10 bg-black/20 p-10 backdrop-blur-sm">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-ice">Launching a new league</p>
            <h3 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Start with registrations, payments, and the public site already connected.
            </h3>
            <ul className="mt-8 space-y-4 text-neutral-300">
              <li>Open registration with player checkout from the same system that runs the season.</li>
              <li>Publish schedules, standings, stats, and sponsors without a second website stack.</li>
              <li>Set the league up once instead of stitching tools together after launch.</li>
            </ul>
            <Link
              href="/signup"
              className="group mt-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-[1px] hover:bg-white/10"
            >
              Create Your League
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="rounded-[2.5rem] border border-accent/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(7,10,15,0.88))] p-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Running an existing league</p>
            <h3 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Plan the switch before you move teams, schedules, stats, and public league history.
            </h3>
            <ul className="mt-8 space-y-4 text-neutral-200">
              <li>Map the move from your current website, spreadsheets, payment flow, or old stack.</li>
              <li>Decide what comes over now, what gets refreshed, and what can be phased later.</li>
              <li>Scope year-one partner pricing and payment mix around the real migration plan.</li>
            </ul>
            <Link
              href="/book-demo"
              className="group mt-10 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0B1420] transition-all duration-300 hover:scale-[1.03]"
            >
              Plan Your Migration
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
