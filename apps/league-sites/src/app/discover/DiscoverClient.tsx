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
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      {/* Search & Filters */}
      <div className="mb-8 space-y-4">
        <div className="glass-card-strong flex flex-col gap-3 p-3 sm:flex-row sm:p-4">
          <div className="relative flex-1">
            <label htmlFor="league-search" className="sr-only">
              Search leagues by name or city
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" aria-hidden="true" />
            <input
              id="league-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              placeholder="Search leagues by name or city..."
              className="glass-control min-h-11 w-full rounded-xl border border-[var(--blh-glass-border)] py-3 pl-11 pr-4 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--league-primary)] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-controls="discover-filters"
            className={`glass-control inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-[var(--league-primary)] text-[var(--blh-cyan)]'
                : 'border-[var(--blh-glass-border)] text-[var(--color-text-secondary)] hover:border-[var(--glass-card-border-hover)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button
            type="button"
            onClick={applyFilters}
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--league-primary-border)] bg-[var(--league-primary-strong)] px-6 py-3 font-bold text-[var(--league-on-primary)] transition-colors hover:bg-[var(--league-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div id="discover-filters" className="glass-card-strong flex flex-wrap gap-4 p-4 sm:p-5">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="discover-city" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                City
              </label>
              <select
                id="discover-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="glass-control min-h-11 w-full rounded-xl border border-[var(--blh-glass-border)] px-3 py-2 text-[var(--color-text-primary)] focus:border-[var(--league-primary)] focus:outline-none"
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
              <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-sm text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={registrationOpen}
                  onChange={(e) => setRegistrationOpen(e.target.checked)}
                  className="h-5 w-5 rounded border-[var(--blh-glass-border)] text-[var(--league-primary)] focus:ring-[var(--league-primary)]"
                />
                <span>Registration open</span>
              </label>
            </div>
            {hasActiveFilters && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]" aria-live="polite">
          {totalCount} league{totalCount !== 1 ? 's' : ''} found
          {hasActiveFilters && ' (filtered)'}
        </p>
      </div>

      {/* League Grid */}
      {initialLeagues.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {initialLeagues.map((league) => (
            <LeagueCard key={league.id} league={league} formatCurrency={formatCurrency} />
          ))}
        </div>
      ) : (
        <div className="glass-card-strong py-16 text-center">
          <p className="mb-2 text-xl font-semibold text-[var(--color-text-primary)]">No leagues found</p>
          <p className="text-[var(--color-text-secondary)]">
            Try adjusting your search or filters.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex min-h-11 items-center rounded-xl px-4 py-2 font-semibold text-[var(--blh-cyan)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
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
    <article className="glass-card group overflow-hidden transition-transform duration-300 hover:-translate-y-1">
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
          <div className="absolute inset-0 bg-[var(--blh-night)]/55" />
        )}
        <div className="relative z-10">
          {league.logo_url ? (
            <Image
              src={league.logo_url}
              alt={league.name}
              width={64}
              height={64}
              className="h-16 w-16 rounded-xl border border-white/20 bg-[var(--blh-night)]/65 object-contain p-1 shadow-lg"
            />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/20 text-xl font-black text-[var(--blh-night)] shadow-lg"
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
          <span className="glass-control absolute right-3 top-3 rounded-full border border-emerald-300/35 px-2.5 py-1 text-xs font-bold text-emerald-300">
            Open Registration
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--blh-cyan)]">
          {league.name}
        </h3>

        {location && (
          <p className="mt-1 flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {location}
          </p>
        )}

        {league.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-text-muted)]">
            {league.description}
          </p>
        )}

        {/* Stats Row */}
        <div className="mt-4 flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {league.teams_count} team{league.teams_count !== 1 ? 's' : ''}
          </span>
          {league.next_season_name && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {league.next_season_name}
            </span>
          )}
        </div>

        {/* Fee */}
        {league.registration_fee_cents != null && league.registration_fee_cents > 0 && (
          <p className="mt-2 text-sm">
            <span className="text-[var(--color-text-muted)]">Registration fee: </span>
            <span className="font-semibold text-[var(--color-text-primary)]">
              {formatCurrency(league.registration_fee_cents)}
            </span>
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 mt-5">
          <Link
            href={`/${league.slug}`}
            className="glass-control flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-[var(--blh-glass-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--glass-card-border-hover)] hover:text-[var(--color-text-primary)]"
          >
            View League
          </Link>
          {league.has_open_registration && (
            <Link
              href={`/${league.slug}/register`}
              className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-[var(--blh-night)] transition-[filter,transform] hover:-translate-y-0.5 hover:brightness-110"
              style={{ backgroundColor: league.primary_color || '#D4AF37' }}
            >
              Register
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
