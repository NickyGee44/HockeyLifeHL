import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SubscriptionWall } from '@/components/shared';
import { getLeagueBySlug, getVenues, getVenueObjects } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { MapPin, Calendar, Clock, ChevronRight, Building2 } from 'lucide-react';
import type { Metadata } from 'next';

interface VenuesPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    return { title: 'Venues | League Not Found' };
  }

  return {
    title: `Venues | ${league.name}`,
    description: `View all venues and arenas for ${league.name}`,
  };
}

interface VenueWithGames {
  name: string;
  mapsUrl?: string;
  upcomingGames: {
    id: string;
    scheduled_at: string;
    home_team: { name: string; slug: string } | null;
    away_team: { name: string; slug: string } | null;
  }[];
  totalGames: number;
}

async function getVenuesWithGames(leagueId: string): Promise<VenueWithGames[]> {
  const supabase = await createClient();

  // Get all venues (names from games) + venue objects (addresses from venues table)
  const [venues, venueObjects] = await Promise.all([
    getVenues(leagueId),
    getVenueObjects(leagueId),
  ]);
  if (venues.length === 0) return [];

  // Build a name → Google Maps URL map from the venues table
  const mapsUrlByName = new Map<string, string>();
  for (const v of venueObjects) {
    const parts = [v.address, v.city, v.state_province, v.postal_code, v.country].filter(Boolean);
    if (parts.length > 0) {
      mapsUrlByName.set(v.name, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`);
    }
  }

  const now = new Date();
  const twoWeeksLater = new Date(now);
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

  // Fetch ALL upcoming games across all venues in a single query
  const [{ data: allUpcomingGames }, { data: allGameCounts }] = await Promise.all([
    supabase
      .from('games')
      .select(`
        id,
        scheduled_at,
        location,
        home_team:teams!games_home_team_id_fkey(name, slug),
        away_team:teams!games_away_team_id_fkey(name, slug)
      `)
      .eq('league_id', leagueId)
      .in('location', venues)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', twoWeeksLater.toISOString())
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('games')
      .select('location')
      .eq('league_id', leagueId)
      .in('location', venues),
  ]);

  // Group upcoming games by venue, taking top 3 per venue
  const upcomingByVenue = new Map<string, VenueWithGames['upcomingGames']>();
  for (const g of allUpcomingGames || []) {
    const loc = (g as any).location as string;
    if (!upcomingByVenue.has(loc)) upcomingByVenue.set(loc, []);
    const venueGames = upcomingByVenue.get(loc)!;
    if (venueGames.length < 3) {
      venueGames.push({
        id: g.id,
        scheduled_at: g.scheduled_at,
        home_team: Array.isArray(g.home_team) ? g.home_team[0] : g.home_team,
        away_team: Array.isArray(g.away_team) ? g.away_team[0] : g.away_team,
      });
    }
  }

  // Count total games per venue
  const countByVenue = new Map<string, number>();
  for (const row of allGameCounts || []) {
    const loc = (row as any).location as string;
    countByVenue.set(loc, (countByVenue.get(loc) || 0) + 1);
  }

  // Build result array
  const venuesWithGames: VenueWithGames[] = venues.map((venue) => ({
    name: venue,
    mapsUrl: mapsUrlByName.get(venue),
    upcomingGames: upcomingByVenue.get(venue) || [],
    totalGames: countByVenue.get(venue) || 0,
  }));

  // Sort by total games (most active first)
  return venuesWithGames.sort((a, b) => b.totalGames - a.totalGames);
}

export default async function VenuesPage({ params }: VenuesPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const venues = await getVenuesWithGames(league.id);

  return (
    <SubscriptionWall>
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[var(--league-primary)]/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[var(--league-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Venues & Arenas
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            {venues.length} locations hosting games
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {venues.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
            <p className="text-[var(--color-text-secondary)]">
              No venues have been configured for this league yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <VenueCard
                key={venue.name}
                venue={venue}
                leagueSlug={leagueSlug}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </SubscriptionWall>
  );
}

function VenueCard({
  venue,
  leagueSlug,
}: {
  venue: VenueWithGames;
  leagueSlug: string;
}) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center flex-shrink-0">
            <MapPin className={`w-5 h-5 ${venue.mapsUrl ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'}`} />
          </div>
          <div className="flex-1 min-w-0">
            {venue.mapsUrl ? (
              <a
                href={venue.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--league-primary)] hover:underline truncate block transition-colors"
              >
                {venue.name}
              </a>
            ) : (
              <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
                {venue.name}
              </h3>
            )}
            <p className="text-sm text-[var(--color-text-secondary)]">
              {venue.totalGames} games scheduled
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming Games */}
      {venue.upcomingGames.length > 0 ? (
        <div className="divide-y divide-[var(--color-border)]">
          {venue.upcomingGames.map((game) => (
            <Link
              key={game.id}
              href={`/${leagueSlug}/games/${game.id}`}
              className="block p-3 hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {game.home_team?.name || 'TBD'} vs {game.away_team?.name || 'TBD'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(game.scheduled_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(game.scheduled_at)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-4 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            No upcoming games
          </p>
        </div>
      )}

      {/* View All Link */}
      <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface-hover)]/50">
        <Link
          href={`/${leagueSlug}/schedule?venue=${encodeURIComponent(venue.name)}`}
          className="flex items-center justify-center gap-2 text-sm text-[var(--league-primary)] hover:underline"
        >
          View all games at this venue
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
