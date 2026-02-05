import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLeagueBySlug, getVenues, getWeekGames } from '@/lib/data';
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

  // Get all venues
  const venues = await getVenues(leagueId);

  // Get upcoming games for each venue
  const now = new Date();
  const twoWeeksLater = new Date(now);
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

  const venuesWithGames = await Promise.all(
    venues.map(async (venue) => {
      // Get upcoming games at this venue
      const { data: upcomingGames } = await supabase
        .from('games')
        .select(`
          id,
          scheduled_at,
          home_team:teams!games_home_team_id_fkey(name, slug),
          away_team:teams!games_away_team_id_fkey(name, slug)
        `)
        .eq('league_id', leagueId)
        .eq('venue', venue)
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', twoWeeksLater.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(3);

      // Get total game count at this venue
      const { count } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueId)
        .eq('venue', venue);

      // Transform nested arrays
      const games = (upcomingGames || []).map((g: any) => ({
        ...g,
        home_team: Array.isArray(g.home_team) ? g.home_team[0] : g.home_team,
        away_team: Array.isArray(g.away_team) ? g.away_team[0] : g.away_team,
      }));

      return {
        name: venue,
        upcomingGames: games,
        totalGames: count || 0,
      };
    })
  );

  // Sort by total games (most active first)
  return venuesWithGames.sort((a, b) => b.totalGames - a.totalGames);
}

export default async function VenuesPage({ params }: VenuesPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const venues = await getVenuesWithGames(league.id);

  return (
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
            <MapPin className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
              {venue.name}
            </h3>
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
