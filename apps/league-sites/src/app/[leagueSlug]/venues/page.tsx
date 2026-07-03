import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { SubscriptionWall } from '@/components/shared';
import { getLeagueBySlug, getVenueObjects } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { MapPin, Calendar, Clock, ChevronRight, Building2 } from 'lucide-react';
import { formatLeagueShortWeekdayDate, formatLeagueTime } from '@/lib/league-timezone';
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
  addressLines: string[];
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
  const venueObjects = await getVenueObjects(leagueId);
  if (venueObjects.length === 0) return [];

  const venueNames = venueObjects.map((venue) => venue.name).filter(Boolean);
  const venueMetaByName = new Map<string, { addressLines: string[]; mapsUrl?: string }>();

  for (const venue of venueObjects) {
    const addressParts = [venue.address, venue.city, venue.state_province, venue.postal_code, venue.country].filter(Boolean);
    const addressLines = [
      venue.address,
      [venue.city, venue.state_province, venue.postal_code].filter(Boolean).join(', '),
      venue.country,
    ].filter((line): line is string => Boolean(line && line.trim()));

    venueMetaByName.set(venue.name, {
      addressLines,
      mapsUrl: addressParts.length > 0
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressParts.join(', '))}`
        : undefined,
    });
  }

  const now = new Date();
  const twoWeeksLater = new Date(now);
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

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
      .in('location', venueNames)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', twoWeeksLater.toISOString())
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('games')
      .select('location')
      .eq('league_id', leagueId)
      .in('location', venueNames),
  ]);

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

  const countByVenue = new Map<string, number>();
  for (const row of allGameCounts || []) {
    const loc = (row as any).location as string;
    countByVenue.set(loc, (countByVenue.get(loc) || 0) + 1);
  }

  const venuesWithGames: VenueWithGames[] = venueNames.map((venue) => ({
    name: venue,
    addressLines: venueMetaByName.get(venue)?.addressLines || [],
    mapsUrl: venueMetaByName.get(venue)?.mapsUrl,
    upcomingGames: upcomingByVenue.get(venue) || [],
    totalGames: countByVenue.get(venue) || 0,
  }));

  return venuesWithGames.sort((a, b) => b.totalGames - a.totalGames || a.name.localeCompare(b.name));
}

export default async function VenuesPage({ params }: VenuesPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const leagueTimezone = league.timezone || 'America/Toronto';
  const venues = await getVenuesWithGames(league.id);

  return (
    <SubscriptionWall>
      <div className="min-h-screen bg-[var(--color-background)]">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-2 flex items-center gap-3">
              {league.logo_url ? (
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
                  <Image
                    src={league.logo_url}
                    alt={league.name}
                    width={40}
                    height={40}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--league-primary)]/10">
                  <MapPin className="h-5 w-5 text-[var(--league-primary)]" />
                </div>
              )}
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
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
              <Building2 className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-muted)]" />
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
                  timezone={leagueTimezone}
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
  timezone,
}: {
  venue: VenueWithGames;
  leagueSlug: string;
  timezone?: string | null;
}) {
  const formatDate = (dateStr: string) => formatLeagueShortWeekdayDate(dateStr, timezone);
  const formatTime = (dateStr: string) => formatLeagueTime(dateStr, timezone);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-hover)]">
            <MapPin className={`h-5 w-5 ${venue.mapsUrl ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-[var(--color-text-primary)]">{venue.name}</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {venue.totalGames} games scheduled
            </p>
            {venue.addressLines.length > 0 ? (
              <div className="mt-2 space-y-0.5 text-xs text-[var(--color-text-secondary)]">
                {venue.addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {venue.mapsUrl ? (
          <a
            href={venue.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] transition-colors hover:border-[var(--league-primary)]/40 hover:text-[var(--league-primary)]"
          >
            <span>Open in Google Maps</span>
            <ChevronRight className="h-4 w-4" />
          </a>
        ) : null}
      </div>

      {venue.upcomingGames.length > 0 ? (
        <div className="divide-y divide-[var(--color-border)]">
          {venue.upcomingGames.map((game) => (
            <Link
              key={game.id}
              href={`/${leagueSlug}/games/${game.id}`}
              className="block p-3 transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                    {game.home_team?.name || 'TBD'} vs {game.away_team?.name || 'TBD'}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(game.scheduled_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(game.scheduled_at)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]" />
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

      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-hover)]/50 p-3">
        <Link
          href={`/${leagueSlug}/schedule?venue=${encodeURIComponent(venue.name)}`}
          className="flex items-center justify-center gap-2 text-sm text-[var(--league-primary)] hover:underline"
        >
          View all games at this venue
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
