import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getLeagueBySlug,
  getGamePreview,
  getSeasonSeries,
  getTeamSeasonStats,
  getPlayerLeaders,
} from '@/lib/data';
import { GamePreviewHeader } from '@/components/game/GamePreviewHeader';
import { PlayerStatsComparison } from '@/components/game/PlayerStatsComparison';
import { SeasonSeriesCard } from '@/components/game/SeasonSeriesCard';
import { TeamStatsComparison } from '@/components/game/TeamStatsComparison';

interface GamePageProps {
  params: Promise<{ leagueSlug: string; gameId: string }>;
}

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { leagueSlug, gameId } = await params;
  const league = await getLeagueBySlug(leagueSlug);
  const game = await getGamePreview(gameId);

  if (!league || !game) {
    return {
      title: 'Game Not Found',
      description: 'The requested game could not be found.',
    };
  }

  const title = `${game.away_team.name} @ ${game.home_team.name}`;
  const description = `Game preview: ${game.away_team.name} vs ${game.home_team.name}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${league.name}`,
      description,
    },
  };
}

export default async function GamePreviewPage({ params }: GamePageProps) {
  const { leagueSlug, gameId } = await params;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) return notFound();

  const game = await getGamePreview(gameId);
  if (!game) return notFound();

  // Fetch additional data in parallel
  const [seasonSeries, homeStats, awayStats, homeLeaders, awayLeaders] =
    await Promise.all([
      getSeasonSeries(game.home_team.id, game.away_team.id, game.season_id),
      getTeamSeasonStats(game.home_team.id, game.season_id),
      getTeamSeasonStats(game.away_team.id, game.season_id),
      getPlayerLeaders(game.home_team.id, game.season_id, 'points'),
      getPlayerLeaders(game.away_team.id, game.season_id, 'points'),
    ]);

  return (
    <div className="min-h-screen">
      {/* Hero Header with diagonal stripes */}
      <GamePreviewHeader
        game={game}
        homeTeam={game.home_team}
        awayTeam={game.away_team}
        leagueSlug={leagueSlug}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Player Stats Comparison */}
            <PlayerStatsComparison
              homeTeam={game.home_team}
              awayTeam={game.away_team}
              homeLeaders={homeLeaders}
              awayLeaders={awayLeaders}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Season Series */}
            <SeasonSeriesCard
              games={seasonSeries}
              homeTeam={game.home_team}
              awayTeam={game.away_team}
            />

            {/* Team Stats Comparison */}
            <TeamStatsComparison
              homeTeam={game.home_team}
              awayTeam={game.away_team}
              homeStats={homeStats}
              awayStats={awayStats}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
