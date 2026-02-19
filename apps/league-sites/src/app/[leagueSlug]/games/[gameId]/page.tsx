import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import {
  getLeagueBySlug,
  getGamePreview,
  getSeasonSeries,
  getFutureMatchups,
  getTeamSeasonStats,
  getPlayerLeaders,
  getTeamGoalies,
  getGameRecap,
  getGameSheet,
  getGamePlayerStats,
} from '@/lib/data';
import { GamePreviewHeader } from '@/components/game/GamePreviewHeader';
import { PlayerStatsComparison } from '@/components/game/PlayerStatsComparison';
import { SeasonSeriesCard } from '@/components/game/SeasonSeriesCard';
import { TeamStatsComparison } from '@/components/game/TeamStatsComparison';
import { GoalieComparison } from '@/components/game/GoalieComparison';
import { GameBoxScore } from '@/components/game/GameBoxScore';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { GameRecapSection } from '@/components/game/GameRecapSection';

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

  const isCompleted = game.status === 'completed';

  // Fetch additional data in parallel
  const [
    seasonSeries,
    futureMatchups,
    homeStats,
    awayStats,
    homeLeaders,
    awayLeaders,
    homeGoalies,
    awayGoalies,
    gameRecap,
    gameSheet,
    gamePlayerStats,
  ] = await Promise.all([
    getSeasonSeries(game.home_team.id, game.away_team.id, game.season_id),
    getFutureMatchups(game.home_team.id, game.away_team.id, game.season_id),
    getTeamSeasonStats(game.home_team.id, game.season_id),
    getTeamSeasonStats(game.away_team.id, game.season_id),
    getPlayerLeaders(game.home_team.id, game.season_id, 'points'),
    getPlayerLeaders(game.away_team.id, game.season_id, 'points'),
    getTeamGoalies(game.home_team.id, game.season_id),
    getTeamGoalies(game.away_team.id, game.season_id),
    getGameRecap(gameId),
    isCompleted ? getGameSheet(gameId) : Promise.resolve(null),
    isCompleted ? getGamePlayerStats(gameId) : Promise.resolve([]),
  ]);

  // Parse team colors for future matchups
  const awayColors = game.away_team.colors?.split(',') || [];
  const homeColors = game.home_team.colors?.split(',') || [];
  const awayPrimary = awayColors[0] || 'var(--league-primary)';
  const homePrimary = homeColors[0] || 'var(--league-primary)';

  return (
    <div className="min-h-screen">
      {/* Hero Header with diagonal stripes */}
      <GamePreviewHeader
        game={game}
        homeTeam={game.home_team}
        awayTeam={game.away_team}
        leagueSlug={leagueSlug}
      />

      {/* AI Game Recap */}
      {gameRecap && isCompleted && (
        <GameRecapSection recap={gameRecap} leagueSlug={leagueSlug} />
      )}

      {/* Box Score for completed games */}
      {isCompleted && gameSheet && (
        <div className="container mx-auto px-4 py-8">
          <GameBoxScore
            goals={gameSheet.goals}
            penalties={gameSheet.penalties}
            goalies={gameSheet.goalies}
            playerStats={gamePlayerStats}
            homeTeam={game.home_team}
            awayTeam={game.away_team}
            leagueSlug={leagueSlug}
          />
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Player Stats Comparison - Points Leaders */}
            <PlayerStatsComparison
              homeTeam={game.home_team}
              awayTeam={game.away_team}
              homeLeaders={homeLeaders}
              awayLeaders={awayLeaders}
              leagueSlug={leagueSlug}
            />

            {/* Goalie Matchup */}
            <GoalieComparison
              homeTeam={game.home_team}
              awayTeam={game.away_team}
              homeGoalies={homeGoalies}
              awayGoalies={awayGoalies}
              leagueSlug={leagueSlug}
            />

            {/* Future Matchups between these teams */}
            {futureMatchups.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[var(--league-primary)]" />
                    Upcoming Matchups
                  </h3>
                </div>
                <div className="p-4 space-y-2">
                  {futureMatchups.map((matchup) => {
                    const matchupDate = new Date(matchup.scheduled_at);
                    const isHomeTeamHome = matchup.home_team_id === game.home_team.id;
                    const gameHome = isHomeTeamHome ? game.home_team : game.away_team;
                    const gameAway = isHomeTeamHome ? game.away_team : game.home_team;
                    const gameHomeColor = isHomeTeamHome ? homePrimary : awayPrimary;
                    const gameAwayColor = isHomeTeamHome ? awayPrimary : homePrimary;

                    return (
                      <Link
                        key={matchup.id}
                        href={`/${leagueSlug}/games/${matchup.id}`}
                        className="flex items-center justify-between py-3 px-4 rounded-lg bg-[var(--color-surface-hover)] hover:bg-[var(--color-border-muted)] transition-colors"
                      >
                        <span className="text-sm text-[var(--color-text-secondary)]">
                          {format(matchupDate, 'EEE, MMM d')}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <TeamLogo logoUrl={gameAway.logo} teamName={gameAway.name} teamColor={gameAwayColor} size="sm" />
                            <span className="text-sm font-medium">{gameAway.name}</span>
                          </div>
                          <span className="text-xs text-[var(--color-text-muted)] font-medium">@</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{gameHome.name}</span>
                            <TeamLogo logoUrl={gameHome.logo} teamName={gameHome.name} teamColor={gameHomeColor} size="sm" />
                          </div>
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--league-primary)' }}>
                          {format(matchupDate, 'h:mm a')}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
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
