'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, MapPin, Users, Calendar, ChevronRight, Filter, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { DiscoverableLeague } from '@/lib/actions/discover';

interface DiscoverClientProps {
  initialLeagues: DiscoverableLeague[];
  totalCount: number;
  cities: string[];
  initialFilters: {
    search: string;
    city: string;
    registrationOpen: boolean;
  };
}

export function DiscoverClient({
  initialLeagues,
  totalCount,
  cities,
  initialFilters,
}: DiscoverClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialFilters.search);
  const [city, setCity] = useState(initialFilters.city);
  const [registrationOpen, setRegistrationOpen] = useState(initialFilters.registrationOpen);
  const [showFilters, setShowFilters] = useState(false);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (city) params.set('city', city);
    if (registrationOpen) params.set('registration', 'open');

    startTransition(() => {
      router.push(`/discover?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setSearch('');
    setCity('');
    setRegistrationOpen(false);
    startTransition(() => {
      router.push('/discover');
    });
  };

  const hasActiveFilters = search || city || registrationOpen;

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search & Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              placeholder="Search leagues by name or city..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-700 bg-neutral-900 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button
            onClick={applyFilters}
            disabled={isPending}
            className="px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 rounded-xl border border-neutral-700 bg-neutral-900/50">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">
                City
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">All Cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer py-2">
                <input
                  type="checkbox"
                  checked={registrationOpen}
                  onChange={(e) => setRegistrationOpen(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-600 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-neutral-300">Registration open</span>
              </label>
            </div>
            {hasActiveFilters && (
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition-colors py-2"
                >
                  <X className="w-3 h-3" />
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-sm text-neutral-400">
          {totalCount} league{totalCount !== 1 ? 's' : ''} found
          {hasActiveFilters && ' (filtered)'}
        </p>
      </div>

      {/* League Grid */}
      {initialLeagues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {initialLeagues.map((league) => (
            <LeagueCard key={league.id} league={league} formatCurrency={formatCurrency} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-xl text-neutral-400 mb-2">No leagues found</p>
          <p className="text-neutral-500">
            Try adjusting your search or filters.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 text-amber-400 hover:text-amber-300 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LeagueCard({
  league,
  formatCurrency,
}: {
  league: DiscoverableLeague;
  formatCurrency: (cents: number) => string;
}) {
  const location = [league.city, league.state].filter(Boolean).join(', ');

  return (
    <div className="group rounded-2xl border border-neutral-800 bg-neutral-900/50 overflow-hidden hover:border-neutral-700 transition-all duration-300 hover:-translate-y-0.5">
      {/* Banner / Logo Area */}
      <div
        className="relative h-32 flex items-center justify-center"
        style={{
          background: league.banner_url
            ? `url(${league.banner_url}) center/cover`
            : `linear-gradient(135deg, ${league.primary_color || '#D4AF37'}33, ${league.primary_color || '#D4AF37'}11)`,
        }}
      >
        {league.banner_url && (
          <div className="absolute inset-0 bg-black/40" />
        )}
        <div className="relative z-10">
          {league.logo_url ? (
            <Image
              src={league.logo_url}
              alt={league.name}
              width={64}
              height={64}
              className="h-16 w-16 rounded-xl object-contain bg-black/50 p-1"
            />
          ) : (
            <div
              className="h-16 w-16 rounded-xl flex items-center justify-center text-xl font-black text-black"
              style={{ backgroundColor: league.primary_color || '#D4AF37' }}
            >
              {league.name
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase()}
            </div>
          )}
        </div>

        {/* Registration Badge */}
        {league.has_open_registration && (
          <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold bg-green-500/90 text-white">
            Open Registration
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-lg text-white group-hover:text-amber-400 transition-colors">
          {league.name}
        </h3>

        {location && (
          <p className="flex items-center gap-1 text-sm text-neutral-400 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            {location}
          </p>
        )}

        {league.description && (
          <p className="text-sm text-neutral-500 mt-2 line-clamp-2">
            {league.description}
          </p>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-4 mt-4 text-sm text-neutral-400">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {league.teams_count} team{league.teams_count !== 1 ? 's' : ''}
          </span>
          {league.next_season_name && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {league.next_season_name}
            </span>
          )}
        </div>

        {/* Fee */}
        {league.registration_fee_cents != null && league.registration_fee_cents > 0 && (
          <p className="mt-2 text-sm">
            <span className="text-neutral-500">Registration fee: </span>
            <span className="font-semibold text-white">
              {formatCurrency(league.registration_fee_cents)}
            </span>
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 mt-5">
          <Link
            href={`/${league.slug}`}
            className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg border border-neutral-700 text-sm font-medium text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors"
          >
            View League
          </Link>
          {league.has_open_registration && (
            <Link
              href={`/${league.slug}/register`}
              className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors text-black hover:opacity-90"
              style={{ backgroundColor: league.primary_color || '#D4AF37' }}
            >
              Register
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
