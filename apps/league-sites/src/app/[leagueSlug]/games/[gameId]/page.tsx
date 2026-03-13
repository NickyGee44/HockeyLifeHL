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
  hasAdvancedStatsAddon,
} from '@/lib/data';
import { getPublishedGameTeamLineups } from '@/lib/actions/game-lineups';
import { LiveGameExperience } from '@/components/game/LiveGameExperience';
import { GameLineupsSection } from '@/components/game/GameLineupsSection';
import { PlayerStatsComparison } from '@/components/game/PlayerStatsComparison';
import { SeasonSeriesCard } from '@/components/game/SeasonSeriesCard';
import { TeamStatsComparison } from '@/components/game/TeamStatsComparison';
import { GoalieComparison } from '@/components/game/GoalieComparison';
import { GameBoxScore } from '@/components/game/GameBoxScore';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { GameRecapSection } from '@/components/game/GameRecapSection';
import { SubscriptionWall } from '@/components/shared';
import { getPublicLiveGameState } from '@/lib/game/live-state-data';

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

  const hasFullStats = await hasAdvancedStatsAddon(league.id);
  const isCompleted = game.status === 'completed';
  const initialLiveState = game.status === 'in_progress'
    ? await getPublicLiveGameState(gameId)
    : null;

  // Fetch additional data in parallel
  // Advanced stats (player comparisons, goalie matchup, team stats) require addon
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
    publishedLineups,
  ] = await Promise.all([
    getSeasonSeries(game.home_team.id, game.away_team.id, game.season_id),
    getFutureMatchups(game.home_team.id, game.away_team.id, game.season_id),
    hasFullStats ? getTeamSeasonStats(game.home_team.id, game.season_id) : Promise.resolve(null),
    hasFullStats ? getTeamSeasonStats(game.away_team.id, game.season_id) : Promise.resolve(null),
    hasFullStats ? getPlayerLeaders(game.home_team.id, game.season_id, 'points') : Promise.resolve([]),
    hasFullStats ? getPlayerLeaders(game.away_team.id, game.season_id, 'points') : Promise.resolve([]),
    hasFullStats ? getTeamGoalies(game.home_team.id, game.season_id) : Promise.resolve([]),
    hasFullStats ? getTeamGoalies(game.away_team.id, game.season_id) : Promise.resolve([]),
    getGameRecap(gameId),
    isCompleted ? getGameSheet(gameId) : Promise.resolve(null),
    isCompleted ? getGamePlayerStats(gameId) : Promise.resolve([]),
    getPublishedGameTeamLineups(gameId),
  ]);

  // Parse team colors for future matchups
  const awayColors = game.away_team.colors?.split(',') || [];
  const homeColors = game.home_team.colors?.split(',') || [];
  const awayPrimary = awayColors[0] || 'var(--league-primary)';
  const homePrimary = homeColors[0] || 'var(--league-primary)';

  return (
    <SubscriptionWall>
    <div className="min-h-screen">
      {/* Hero Header with diagonal stripes */}
      <LiveGameExperience
        initialGame={game}
        homeTeam={game.home_team}
        awayTeam={game.away_team}
        leagueSlug={leagueSlug}
        timezone={league.timezone || 'America/Toronto'}
        initialLiveState={initialLiveState}
      />

      {publishedLineups.length > 0 && (
        <GameLineupsSection
          lineups={publishedLineups}
          homeTeamId={game.home_team.id}
          awayTeamId={game.away_team.id}
        />
      )}

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
          {gameSheet.scoresheetImageUrls.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)] mb-3">
                Official Scoresheet
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
                {gameSheet.scoresheetImageUrls.map((url, idx) => (
                  <a
                    key={`${url}-${idx}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-border-muted)] transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Official game scoresheet page ${idx + 1}`}
                      className="w-full h-auto"
                    />
                  </a>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">Click any page to view full size</p>
            </div>
          )}
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {hasFullStats ? (
              <>
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
              </>
            ) : null}

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
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 px-4 rounded-lg bg-[var(--color-surface-hover)] hover:bg-[var(--color-border-muted)] transition-colors gap-2"
                      >
                        {/* Date + time row on mobile */}
                        <div className="flex items-center justify-between sm:contents">
                          <span className="text-sm text-[var(--color-text-secondary)] shrink-0">
                            {format(matchupDate, 'EEE, MMM d')}
                          </span>
                          <span className="text-sm font-medium sm:hidden" style={{ color: 'var(--league-primary)' }}>
                            {format(matchupDate, 'h:mm a')}
                          </span>
                        </div>
                        {/* Teams */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <TeamLogo logoUrl={gameAway.logo} teamName={gameAway.name} teamColor={gameAwayColor} size="sm" />
                            <span className="text-sm font-medium truncate">{gameAway.name}</span>
                          </div>
                          <span className="text-xs text-[var(--color-text-muted)] font-medium shrink-0">@</span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-medium truncate">{gameHome.name}</span>
                            <TeamLogo logoUrl={gameHome.logo} teamName={gameHome.name} teamColor={gameHomeColor} size="sm" />
                          </div>
                        </div>
                        {/* Time — hidden on mobile (shown inline above) */}
                        <span className="hidden sm:inline text-sm font-medium shrink-0" style={{ color: 'var(--league-primary)' }}>
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
              leagueSlug={leagueSlug}
            />

            {/* Team Stats Comparison (Advanced Stats addon) */}
            {hasFullStats && homeStats && awayStats && (
              <TeamStatsComparison
                homeTeam={game.home_team}
                awayTeam={game.away_team}
                homeStats={homeStats}
                awayStats={awayStats}
                leagueSlug={leagueSlug}
              />
            )}
          </div>
        </div>
      </div>
    </div>
    </SubscriptionWall>
  );
}
