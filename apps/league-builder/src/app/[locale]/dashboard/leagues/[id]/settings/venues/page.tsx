/**
 * Venues & Ice Times Settings Page
 *
 * Central hub for managing rinks/arenas, weekly availability windows,
 * and blackout dates. Supports manual CRUD and CSV bulk import.
 */

import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getLeagueVenuesFull } from '@/lib/actions/venues';
import { getVenueAvailability, getVenueBlackoutDates } from '@/lib/schedule/actions';
import { VenuesSettingsClient } from '@/components/venues/VenuesSettingsClient';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, MapPin } from 'lucide-react';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { pickOperationalSeason } from '@/lib/seasons/operational';

export const metadata = {
  title: 'Venues & Ice Times | League Settings',
  description: 'Manage rinks, weekly availability, and blackout dates for your league',
};

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildHolidayImportWindow(
  season: {
    name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  } | null
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const seasonStart = parseDate(season?.start_date);
  const seasonEnd = parseDate(season?.end_date);

  let startDate = today;
  let endDate = addDays(today, 365);
  let label = 'the next 12 months';

  if (season) {
    const baseLabel = season.name?.trim() || 'the current operating season';

    if (seasonStart && seasonEnd && seasonEnd >= today) {
      startDate = seasonStart > today ? seasonStart : today;
      endDate = seasonEnd >= startDate ? seasonEnd : addDays(startDate, 365);
      label = baseLabel;
    } else if (seasonEnd && seasonEnd >= today) {
      endDate = seasonEnd;
      label = baseLabel;
    } else if (seasonStart) {
      startDate = seasonStart > today ? seasonStart : today;
      endDate = addDays(startDate, 365);
      label = baseLabel;
    }
  }

  if (endDate < startDate) {
    endDate = addDays(startDate, 365);
  }

  return {
    startDate: toDateInput(startDate),
    endDate: toDateInput(endDate),
    label: `${label} (${toDateInput(startDate)} to ${toDateInput(endDate)})`,
  };
}

export default async function LeagueVenuesPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  // League details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, primary_color')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  // Fetch data in parallel
  const [venues, availability, blackouts, seasonsResult] = await Promise.all([
    getLeagueVenuesFull(leagueId),
    getVenueAvailability(leagueId),
    getVenueBlackoutDates(leagueId),
    supabase
      .from('seasons')
      .select('id, name, status, start_date, end_date, created_at')
      .eq('league_id', leagueId),
  ]);

  const primaryColor = league.primary_color || '#22D3EE';
  const operationalSeason = pickOperationalSeason(seasonsResult.data ?? []);
  const holidayImportWindow = buildHolidayImportWindow(operationalSeason);

  // Future blackouts only (for stat card)
  const upcomingBlackouts = blackouts.filter(
    (b) => new Date(b.blackoutDate) >= new Date()
  );

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}/settings`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>

          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Venues & Ice Times</h1>
              <p className="text-neutral-400">{league.name}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <StatCard label="Venues" value={venues.length} color="blue" />
          <StatCard label="Weekly Slots" value={availability.length} color="gold" />
          <StatCard label="Upcoming Blackouts" value={upcomingBlackouts.length} color="neutral" />
        </div>

        {/* Main client */}
        <VenuesSettingsClient
          leagueId={leagueId}
          initialVenues={venues}
          initialAvailability={availability}
          initialBlackouts={blackouts}
          holidayImportWindow={holidayImportWindow}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'gold' | 'green' | 'blue' | 'neutral';
}) {
  const colorClasses = {
    gold: 'text-rink-500',
    green: 'text-green-500',
    blue: 'text-blue-500',
    neutral: 'text-neutral-400',
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-4">
      <p className="text-sm text-neutral-400 mb-1">{label}</p>
      <p className={cn('text-3xl font-bold', colorClasses[color])}>{value}</p>
    </div>
  );
}
