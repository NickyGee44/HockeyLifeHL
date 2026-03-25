'use client';

import { Link } from '@/i18n/navigation';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-20 w-full rounded-t-[4rem] border-t border-white/5 bg-deep-black pb-10 pt-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="space-y-6 md:col-span-2">
            <Link
              href="/"
              className="block font-heading text-3xl font-bold tracking-tight text-white transition-colors hover:text-accent"
            >
              BLH
            </Link>
            <p className="max-w-sm font-medium leading-relaxed text-neutral-400">
              Commissioner-first software for registrations, payments, schedules, stats, and public
              league websites in beer league hockey.
            </p>
            <div className="flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
                System Operational
              </span>
            </div>
          </div>

          <div>
            <h4 className="mb-6 font-mono text-xs uppercase tracking-widest text-neutral-500">
              Explore
            </h4>
            <ul className="space-y-4 text-sm font-medium text-neutral-400">
              <li>
                <Link href="/#platform" className="transition-colors hover:text-white">
                  Platform
                </Link>
              </li>
              <li>
                <Link href="/#comparison" className="transition-colors hover:text-white">
                  Why BLH
                </Link>
              </li>
              <li>
                <Link href="/#migration" className="transition-colors hover:text-white">
                  Migration
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="transition-colors hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/book-demo" className="transition-colors hover:text-accent">
                  Book a Demo
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 font-mono text-xs uppercase tracking-widest text-neutral-500">
              Legal
            </h4>
            <ul className="space-y-4 text-sm font-medium text-neutral-400">
              <li>
                <Link href="/privacy" className="transition-colors hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <a href="mailto:support@beerleaguehockey.ca" className="transition-colors hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between border-t border-white/10 pt-8 font-mono text-xs text-neutral-500 md:flex-row">
          <p>&copy; {currentYear} BeerLeagueHockey.ca. All rights reserved.</p>
          <div className="mt-4 flex gap-4 md:mt-0">
            <span>Built for beer league hockey.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
