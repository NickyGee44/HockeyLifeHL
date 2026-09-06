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
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="border-b border-neutral-800">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Find Your League
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Browse hockey leagues across the platform. Find one near you and register today.
          </p>
        </div>
      </div>

      {/* Content */}
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
  );
}
