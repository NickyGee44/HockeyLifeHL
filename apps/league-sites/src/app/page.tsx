import Link from 'next/link';
import { ArrowRight, Compass, ShieldCheck } from 'lucide-react';

/**
 * Root page for Platform 2 (League Sites)
 *
 * This page is only shown when accessing the base domain without a subdomain.
 * In production, users should always access via [league-slug].beerleaguehockey.ca
 *
 * For development, this page provides navigation to test different leagues.
 */
export default function RootPage() {
  return (
    <main
      className="league-site-shell relative isolate flex min-h-screen overflow-hidden text-[var(--color-text-primary)]"
      data-blh-design-foundation="glass-v1"
    >
      <div className="league-atmosphere" aria-hidden="true">
        <span className="league-atmosphere__rink" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-5 py-16 sm:px-8 lg:px-12">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] lg:gap-16">
          <section className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--league-primary-border)] bg-[var(--league-primary-muted)] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--blh-cyan)]">
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              Hockey Life by BLH
            </div>
            <h1 className="text-balance text-4xl font-black tracking-[-0.045em] sm:text-5xl lg:text-7xl">
              Beer League Hockey
              <span className="mt-2 block bg-gradient-to-r from-[var(--league-primary)] to-[var(--blh-cyan)] bg-clip-text text-transparent">
                League Sites
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)] sm:text-xl">
              This is Platform 2 - the public-facing league website generator.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/discover"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--league-primary-border)] bg-[var(--league-primary-strong)] px-6 py-3 text-sm font-bold text-[var(--league-on-primary)] shadow-[0_0_28px_var(--league-ambient-soft)] transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-[var(--league-primary-hover)]"
              >
                Discover Leagues
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              Looking to manage your league?{' '}
              <Link
                href="https://app.beerleaguehockey.ca"
                className="inline-flex min-h-11 items-center font-semibold text-[var(--blh-cyan)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                Go to League Builder
              </Link>
            </p>
          </section>

          <aside className="glass-card overflow-hidden p-6 sm:p-8" aria-labelledby="how-it-works">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--league-primary-border)] bg-[var(--league-primary-muted)] text-[var(--blh-cyan)]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                  Platform access
                </p>
                <h2 id="how-it-works" className="mt-1 text-xl font-bold">
                  How it works
                </h2>
              </div>
            </div>

            <ul className="space-y-4 text-[var(--color-text-secondary)]">
              <li className="glass-control rounded-2xl border border-[var(--blh-glass-border)] p-4">
                <strong className="block text-sm text-[var(--color-text-primary)]">Production</strong>
                <span className="mt-1 block text-sm leading-6">Access leagues via</span>
                <code className="mt-2 block overflow-x-auto rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-background-sunken)] px-3 py-2 text-xs text-[var(--blh-cyan)]">
                  [league-slug].beerleaguehockey.ca
                </code>
              </li>
              <li className="glass-control rounded-2xl border border-[var(--blh-glass-border)] p-4">
                <strong className="block text-sm text-[var(--color-text-primary)]">Development</strong>
                <span className="mt-1 block text-sm leading-6">Access leagues via</span>
                <code className="mt-2 block overflow-x-auto rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-background-sunken)] px-3 py-2 text-xs text-[var(--blh-cyan)]">
                  [league-slug].localhost:3001
                </code>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </main>
  );
}
