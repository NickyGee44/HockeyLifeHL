import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SubscriptionWall } from '@/components/shared';
import { getLeagueBySlug, getTeams, getDivisions, getCurrentSeason, getSeasons } from '@/lib/data';
import { TeamsGrid } from './TeamsGrid';
import { buildTeamsJsonLd } from '@/lib/jsonld';
import { filterPublicTeams } from '@/lib/publicSiteVisibility';

interface TeamsPageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{ season?: string }>;
}

export const metadata: Metadata = {
  title: 'Teams',
  description: 'View all teams in the league',
};

export default async function TeamsPage({ params, searchParams }: TeamsPageProps) {
  const { leagueSlug } = await params;
  const { season: seasonParam } = await searchParams;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const [seasons, defaultSeason] = await Promise.all([
    getSeasons(league.id),
    getCurrentSeason(league.id),
  ]);

  // Use URL param season if provided, otherwise fall back to current season
  const selectedSeasonId = seasonParam || defaultSeason?.id || null;

  const [rawTeams, divisions] = await Promise.all([
    getTeams(league.id, selectedSeasonId || undefined),
    getDivisions(league.id),
  ]);
  const teams = filterPublicTeams(rawTeams);

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId) || defaultSeason;

  const teamsJsonLd = buildTeamsJsonLd(teams, league, leagueSlug);

  return (
    <SubscriptionWall>
      {/* JSON-LD Structured Data for SEO */}
      {teamsJsonLd.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(teamsJsonLd) }}
        />
      )}

      <TeamsGrid
        teams={teams}
        divisions={divisions}
        leagueSlug={leagueSlug}
        seasons={seasons}
        currentSeasonId={selectedSeasonId}
        seasonName={selectedSeason?.name}
      />
    </SubscriptionWall>
  );
}
