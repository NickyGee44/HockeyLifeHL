import type { Metadata } from 'next';
import { discoverLeagues, getDiscoverCities } from '@/lib/actions/discover';
import { DiscoverClient } from './DiscoverClient';

export const metadata: Metadata = {
  title: 'Discover Leagues | Beer League Hockey',
  description: 'Find and join hockey leagues near you. Browse leagues, check registration status, and sign up today.',
};

export const dynamic = 'force-dynamic';

interface DiscoverPageProps {
  searchParams: Promise<{
    search?: string;
    city?: string;
    registration?: string;
  }>;
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const params = await searchParams;

  const [{ leagues, total }, cities] = await Promise.all([
    discoverLeagues({
      search: params.search,
      city: params.city,
      registrationOpen: params.registration === 'open' ? true : undefined,
      limit: 50,
    }),
    getDiscoverCities(),
  ]);

  return (
    <main
      className="league-site-shell relative isolate min-h-screen overflow-hidden text-[var(--color-text-primary)]"
      data-blh-design-foundation="glass-v1"
    >
      <div className="league-atmosphere" aria-hidden="true">
        <span className="league-atmosphere__rink" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-[var(--blh-glass-border)]">
          <div className="mx-auto max-w-7xl px-5 py-12 text-center sm:px-8 md:py-16 lg:px-12">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--blh-cyan)]">
              Explore Hockey Life
            </p>
            <h1 className="text-4xl font-black tracking-[-0.04em] md:text-5xl">
              Find Your League
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">
              Browse hockey leagues across the platform. Find one near you and register today.
            </p>
          </div>
        </header>

        <DiscoverClient
          initialLeagues={leagues}
          totalCount={total}
          cities={cities}
          initialFilters={{
            search: params.search || '',
            city: params.city || '',
            registrationOpen: params.registration === 'open',
          }}
        />
      </div>
    </main>
  );
}
