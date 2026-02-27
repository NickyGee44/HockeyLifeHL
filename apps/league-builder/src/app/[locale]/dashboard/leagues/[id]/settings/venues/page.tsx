/**
 * Venues & Ice Times Settings Page
 *
 * Central hub for managing rinks/arenas, weekly availability windows,
 * and blackout dates. Supports manual CRUD and CSV bulk import.
 */

import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getLeagueVenuesFull } from '@/lib/actions/venues';
import { getVenueAvailability, getVenueBlackoutDates } from '@/lib/schedule/actions';
import { VenuesSettingsClient } from '@/components/venues/VenuesSettingsClient';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, MapPin } from 'lucide-react';

export const metadata = {
  title: 'Venues & Ice Times | League Settings',
  description: 'Manage rinks, weekly availability, and blackout dates for your league',
};

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LeagueVenuesPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    nextRedirect(`/${locale}/login?redirect=/${locale}/dashboard/leagues/${leagueId}/settings/venues`);
  }

  // League details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, primary_color, created_by')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  // Authorization: owner or admin only
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', user!.id)
    .single();

  const isCreator = league.created_by === user!.id;
  const isAuthorized =
    isCreator ||
    (membership && ['owner', 'admin'].includes(membership.role) && membership.status === 'active');

  if (!isAuthorized) {
    nextRedirect(`/${locale}/dashboard?error=unauthorized`);
  }

  // Fetch data in parallel
  const [venues, availability, blackouts] = await Promise.all([
    getLeagueVenuesFull(leagueId),
    getVenueAvailability(leagueId),
    getVenueBlackoutDates(leagueId),
  ]);

  const primaryColor = league.primary_color || '#22D3EE';

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
