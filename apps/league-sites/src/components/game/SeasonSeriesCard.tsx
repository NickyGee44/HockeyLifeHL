import Link from 'next/link';
import { format } from 'date-fns';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type { TeamWithStats, SeasonSeriesGame } from '@/lib/types';
import { History } from 'lucide-react';

interface SeasonSeriesCardProps {
  games: SeasonSeriesGame[];
  homeTeam: TeamWithStats;
  awayTeam: TeamWithStats;
  leagueSlug: string;
}

/**
 * SeasonSeriesCard - Head-to-head history between two teams
 *
 * Shows the series record and list of previous matchup results with dates and scores.
 */
export function SeasonSeriesCard({
  games,
  homeTeam,
  awayTeam,
  leagueSlug,
}: SeasonSeriesCardProps) {
  // Calculate series record
  const { teamAWins, teamBWins, ties } = calculateSeriesRecord(
    games,
    homeTeam.id
  );

  // Parse team colors
  const awayColors = awayTeam.colors?.split(',') || [];
  const homeColors = homeTeam.colors?.split(',') || [];
  const awayPrimary = awayColors[0] || 'var(--league-primary)';
  const homePrimary = homeColors[0] || 'var(--league-primary)';

  // Determine series leader text
  const getSeriesText = () => {
    if (teamAWins > teamBWins) {
      return `${homeTeam.name} leads ${teamAWins}-${teamBWins}${ties > 0 ? `-${ties}` : ''}`;
    } else if (teamBWins > teamAWins) {
      return `${awayTeam.name} leads ${teamBWins}-${teamAWins}${ties > 0 ? `-${ties}` : ''}`;
    } else if (teamAWins === teamBWins && teamAWins > 0) {
      return `Series tied ${teamAWins}-${teamBWins}${ties > 0 ? `-${ties}` : ''}`;
    }
    return 'First meeting this season';
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-[var(--league-primary)]" />
          Season Series
        </h3>
      </div>
      <div className="p-4">
        {/* Team logos and series record */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col items-center gap-2">
            <TeamLogo
              logoUrl={awayTeam.logo}
              teamName={awayTeam.name}
              teamColor={awayPrimary}
              size="xl"
            />
            <span className="text-3xl font-bold text-[var(--color-text-primary)]">{teamBWins}</span>
          </div>
          <div className="text-center">
            <span className="text-[var(--color-text-secondary)] text-sm uppercase tracking-wide font-medium">
              {ties > 0 ? `${ties} tie${ties > 1 ? 's' : ''}` : 'vs'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <TeamLogo
              logoUrl={homeTeam.logo}
              teamName={homeTeam.name}
              teamColor={homePrimary}
              size="xl"
            />
            <span className="text-3xl font-bold text-[var(--color-text-primary)]">{teamAWins}</span>
          </div>
        </div>

        <p className="text-sm text-center text-[var(--color-text-secondary)] mb-4">
          {getSeriesText()}
        </p>

        {/* Previous Games List */}
        {games.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
              Previous Matchups
            </h4>
            {games.slice(0, 5).map((game) => (
              <GameResultRow
                key={game.id}
                game={game}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                homePrimary={homePrimary}
                awayPrimary={awayPrimary}
                leagueSlug={leagueSlug}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-center text-[var(--color-text-muted)] py-4">
            No previous games this season
          </p>
        )}
      </div>
    </div>
  );
}

interface GameResultRowProps {
  game: SeasonSeriesGame;
  homeTeam: TeamWithStats;
  awayTeam: TeamWithStats;
  homePrimary: string;
  awayPrimary: string;
  leagueSlug: string;
}

function GameResultRow({
  game,
  homeTeam,
  awayTeam,
  homePrimary,
  awayPrimary,
  leagueSlug,
}: GameResultRowProps) {
  const gameDate = new Date(game.scheduled_at);

  // Determine which team was home/away in this specific game
  const wasHomeTeamHome = game.home_team_id === homeTeam.id;
  const gameHomeTeam = wasHomeTeamHome ? homeTeam : awayTeam;
  const gameAwayTeam = wasHomeTeamHome ? awayTeam : homeTeam;
  const gameHomeColor = wasHomeTeamHome ? homePrimary : awayPrimary;
  const gameAwayColor = wasHomeTeamHome ? awayPrimary : homePrimary;

  // Determine winner
  const homeScore = game.home_score ?? 0;
  const awayScore = game.away_score ?? 0;
  const homeWon = homeScore > awayScore;
  const awayWon = awayScore > homeScore;
  const isTie = homeScore === awayScore;

  return (
    <Link
      href={`/${leagueSlug}/games/${game.id}`}
      className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-surface-hover)] hover:bg-[var(--color-border-muted)] transition-colors"
    >
      <div className="text-xs text-[var(--color-text-muted)]">
        {format(gameDate, 'MMM d')}
      </div>
      <div className="flex items-center gap-3">
        {/* Away team in this game */}
        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${awayWon ? 'font-bold' : 'text-[var(--color-text-secondary)]'}`}
          >
            {gameAwayTeam.name.substring(0, 3).toUpperCase()}
          </span>
          <span
            className={`font-bold ${awayWon ? '' : 'text-[var(--color-text-secondary)]'}`}
            style={awayWon ? { color: gameAwayColor } : undefined}
          >
            {awayScore}
          </span>
        </div>

        <span className="text-[var(--color-text-muted)]">-</span>

        {/* Home team in this game */}
        <div className="flex items-center gap-2">
          <span
            className={`font-bold ${homeWon ? '' : 'text-[var(--color-text-secondary)]'}`}
            style={homeWon ? { color: gameHomeColor } : undefined}
          >
            {homeScore}
          </span>
          <span
            className={`text-sm ${homeWon ? 'font-bold' : 'text-[var(--color-text-secondary)]'}`}
          >
            {gameHomeTeam.name.substring(0, 3).toUpperCase()}
          </span>
        </div>
      </div>
      <div className="text-xs">
        {isTie ? (
          <span className="text-[var(--color-text-muted)]">TIE</span>
        ) : homeWon ? (
          <span style={{ color: gameHomeColor }}>W</span>
        ) : (
          <span style={{ color: gameAwayColor }}>W</span>
        )}
      </div>
    </Link>
  );
}

function calculateSeriesRecord(
  games: SeasonSeriesGame[],
  teamAId: string
): { teamAWins: number; teamBWins: number; ties: number } {
  let teamAWins = 0;
  let teamBWins = 0;
  let ties = 0;

  games.forEach((game) => {
    const homeScore = game.home_score ?? 0;
    const awayScore = game.away_score ?? 0;

    if (homeScore === awayScore) {
      ties++;
    } else if (game.home_team_id === teamAId) {
      if (homeScore > awayScore) {
        teamAWins++;
      } else {
        teamBWins++;
      }
    } else {
      if (awayScore > homeScore) {
        teamAWins++;
      } else {
        teamBWins++;
      }
    }
  });

  return { teamAWins, teamBWins, ties };
}

export default SeasonSeriesCard;
