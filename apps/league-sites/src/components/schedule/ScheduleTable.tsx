import Link from 'next/link';
import { format } from 'date-fns';
import { Eye, Clock } from 'lucide-react';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type { Game, ScheduleGame } from '@/lib/types';

// Union type to accept both Game and ScheduleGame
type ScheduleGameData = Game | ScheduleGame;

interface ScheduleTableProps {
  games: ScheduleGameData[];
  leagueSlug: string;
  showDivision?: boolean;
}

/**
 * ScheduleTable - BMHL-style game schedule table
 *
 * Desktop: Full table layout with columns for matchup, time/score, venue, division, and details
 * Mobile: Card layout with stacked information
 *
 * Column layout:
 * | Match Up (flex-1) | Time (100px) | Rink (120px) | Division (80px) | Details (60px) |
 *
 * This is a server component for optimal performance.
 */
export function ScheduleTable({
  games,
  leagueSlug,
  showDivision = true,
}: ScheduleTableProps) {
  if (games.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Clock className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Games Found</h3>
        <p className="text-[var(--color-text-secondary)]">
          No games match the selected filters. Try adjusting your filters or selecting a different week.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--league-primary)]">
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-accent-text)]">
                Match Up
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-accent-text)] w-[100px]">
                Time
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-accent-text)] w-[120px]">
                Rink
              </th>
              {showDivision && (
                <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-accent-text)] w-[80px]">
                  Division
                </th>
              )}
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-accent-text)] w-[60px]">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <ScheduleTableRow
                key={game.id}
                game={game}
                leagueSlug={leagueSlug}
                showDivision={showDivision}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {games.map((game) => (
          <ScheduleCard
            key={game.id}
            game={game}
            leagueSlug={leagueSlug}
            showDivision={showDivision}
          />
        ))}
      </div>
    </>
  );
}

// Helper to determine the winning team
function getWinner(game: ScheduleGameData): 'home' | 'away' | 'tie' | null {
  if (game.status !== 'final' && game.status !== 'completed') return null;
  const homeScore = game.home_score ?? 0;
  const awayScore = game.away_score ?? 0;
  if (homeScore > awayScore) return 'home';
  if (awayScore > homeScore) return 'away';
  return 'tie';
}

// Get division short code from division name (e.g., "C Division" -> "C", "Division 1" -> "D1")
function getDivisionCode(divisionName: string | null | undefined): string {
  if (!divisionName) return '-';
  // If already short (3 chars or less), return as-is
  if (divisionName.length <= 3) return divisionName;
  // Try to extract a short code
  const match = divisionName.match(/^([A-Z]\d?)[\s-]/i) || divisionName.match(/[\s-]([A-Z]\d?)$/i);
  if (match) return match[1].toUpperCase();
  // Fallback: first 2 chars uppercase
  return divisionName.substring(0, 2).toUpperCase();
}

// Desktop table row
function ScheduleTableRow({
  game,
  leagueSlug,
  showDivision,
}: {
  game: ScheduleGameData;
  leagueSlug: string;
  showDivision: boolean;
}) {
  const gameDate = new Date(game.scheduled_at);
  const isCompleted = game.status === 'final' || game.status === 'completed';
  const isLive = game.status === 'in_progress';
  const winner = getWinner(game);

  // Get division name - try game.division first (ScheduleGame), then home_team.division (Game)
  const divisionName =
    ('division' in game && game.division?.name) ||
    ('home_team' in game && game.home_team && 'division' in game.home_team && game.home_team.division?.name) ||
    null;

  // Team name styles based on winner
  const awayNameClass = isCompleted && winner === 'away'
    ? 'font-bold text-[var(--league-primary)]'
    : 'font-medium';

  const homeNameClass = isCompleted && winner === 'home'
    ? 'font-bold text-[var(--league-primary)]'
    : 'font-medium';

  return (
    <tr className="border-b border-[var(--color-border-muted)] hover:bg-[var(--color-surface-hover)] transition-colors">
      {/* Match Up Column - flex-1 (largest) */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {/* Away Team */}
          <TeamLogo
            logoUrl={game.away_team?.logo || null}
            teamName={game.away_team?.name || 'TBD'}
            teamColor={game.away_team?.colors}
            size="sm"
          />
          <Link
            href={`/${leagueSlug}/teams/${game.away_team?.slug}`}
            className={`${awayNameClass} hover:text-[var(--league-primary)] transition-colors text-sm whitespace-nowrap`}
          >
            {game.away_team?.name || 'TBD'}
          </Link>

          {isCompleted && (
            <span className={`text-sm font-bold ${winner === 'away' ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
              ({game.away_score})
            </span>
          )}
          {isLive && (
            <span className="text-sm font-bold text-red-400">
              ({game.away_score ?? 0})
            </span>
          )}

          {/* @ separator */}
          <span className="text-xs text-[var(--color-text-muted)] font-medium mx-1">@</span>

          {/* Home Team */}
          <Link
            href={`/${leagueSlug}/teams/${game.home_team?.slug}`}
            className={`${homeNameClass} hover:text-[var(--league-primary)] transition-colors text-sm whitespace-nowrap`}
          >
            {game.home_team?.name || 'TBD'}
          </Link>
          {isCompleted && (
            <span className={`text-sm font-bold ${winner === 'home' ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
              ({game.home_score})
            </span>
          )}
          {isLive && (
            <span className="text-sm font-bold text-red-400">
              ({game.home_score ?? 0})
            </span>
          )}
          <TeamLogo
            logoUrl={game.home_team?.logo || null}
            teamName={game.home_team?.name || 'TBD'}
            teamColor={game.home_team?.colors}
            size="sm"
          />
        </div>
      </td>

      {/* Time / Score Column - 100px */}
      <td className="py-3 px-4 text-center w-[100px]">
        {isLive ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-sm font-bold text-red-400">
              {game.away_score ?? 0} - {game.home_score ?? 0}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-[10px] font-semibold uppercase animate-pulse">
              LIVE
            </span>
          </div>
        ) : isCompleted ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-sm font-bold text-[var(--color-text-primary)]">
              {game.away_score} - {game.home_score}
            </span>
            <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase">
              Final
            </span>
          </div>
        ) : (
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {format(gameDate, 'h:mm a')}
          </span>
        )}
      </td>

      {/* Rink/Venue Column - 120px */}
      <td className="py-3 px-4 w-[120px]">
        {game.venue ? (
          <span className="text-sm text-[var(--color-text-secondary)] truncate block max-w-[120px]">
            {game.venue}
          </span>
        ) : (
          <span className="text-sm text-[var(--color-text-muted)]">TBD</span>
        )}
      </td>

      {/* Division Column - 80px */}
      {showDivision && (
        <td className="py-3 px-4 text-center w-[80px]">
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">
            {getDivisionCode(divisionName)}
          </span>
        </td>
      )}

      {/* Details Column - 60px */}
      <td className="py-3 px-4 text-center w-[60px]">
        <Link
          href={`/${leagueSlug}/games/${game.id}`}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-surface)] border border-transparent hover:border-[var(--league-primary)] transition-all text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]"
          aria-label={`View game details: ${game.away_team?.name} @ ${game.home_team?.name}`}
        >
          <Eye className="w-4 h-4" />
        </Link>
      </td>
    </tr>
  );
}

// Mobile card view
function ScheduleCard({
  game,
  leagueSlug,
  showDivision,
}: {
  game: ScheduleGameData;
  leagueSlug: string;
  showDivision: boolean;
}) {
  const gameDate = new Date(game.scheduled_at);
  const isCompleted = game.status === 'final' || game.status === 'completed';
  const isLive = game.status === 'in_progress';
  const winner = getWinner(game);

  // Get division name
  const divisionName =
    ('division' in game && game.division?.name) ||
    ('home_team' in game && game.home_team && 'division' in game.home_team && game.home_team.division?.name) ||
    null;

  const awayNameClass = isCompleted && winner === 'away'
    ? 'font-bold text-[var(--league-primary)]'
    : 'font-medium';

  const homeNameClass = isCompleted && winner === 'home'
    ? 'font-bold text-[var(--league-primary)]'
    : 'font-medium';

  return (
    <div className="card p-4 border-b border-[var(--color-border-muted)]">
      {/* Header: Status + Time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm">
          {isLive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold animate-pulse">
              LIVE
            </span>
          ) : isCompleted ? (
            <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase">
              Final
            </span>
          ) : (
            <span className="font-medium text-[var(--league-primary)]">
              {format(gameDate, 'h:mm a')}
            </span>
          )}
          <span className="text-[var(--color-text-muted)]">
            {format(gameDate, 'EEE, MMM d')}
          </span>
        </div>
        {showDivision && divisionName && (
          <span className="text-xs font-medium text-[var(--color-text-secondary)] px-2 py-0.5 rounded-full bg-[var(--color-surface-active)]">
            {getDivisionCode(divisionName)}
          </span>
        )}
      </div>

      {/* Match Up Row: Away @ Home */}
      <div className="flex items-center gap-2 mb-3">
        <TeamLogo
          logoUrl={game.away_team?.logo || null}
          teamName={game.away_team?.name || 'TBD'}
          teamColor={game.away_team?.colors}
          size="sm"
        />
        <Link
          href={`/${leagueSlug}/teams/${game.away_team?.slug}`}
          className={`${awayNameClass} hover:text-[var(--league-primary)] transition-colors text-sm`}
        >
          {game.away_team?.name || 'TBD'}
        </Link>

        {(isCompleted || isLive) && (
          <span className={`text-sm font-bold ${isLive ? 'text-red-400' : winner === 'away' ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
            ({isLive ? (game.away_score ?? 0) : game.away_score})
          </span>
        )}

        <span className="text-xs text-[var(--color-text-muted)] font-medium mx-1">@</span>

        <Link
          href={`/${leagueSlug}/teams/${game.home_team?.slug}`}
          className={`${homeNameClass} hover:text-[var(--league-primary)] transition-colors text-sm`}
        >
          {game.home_team?.name || 'TBD'}
        </Link>

        {(isCompleted || isLive) && (
          <span className={`text-sm font-bold ${isLive ? 'text-red-400' : winner === 'home' ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
            ({isLive ? (game.home_score ?? 0) : game.home_score})
          </span>
        )}

        <TeamLogo
          logoUrl={game.home_team?.logo || null}
          teamName={game.home_team?.name || 'TBD'}
          teamColor={game.home_team?.colors}
          size="sm"
        />
      </div>

      {/* Footer: Venue + Details Link */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-muted)]">
        <span className="text-xs text-[var(--color-text-secondary)]">
          {game.venue || 'TBD'}
        </span>
        <Link
          href={`/${leagueSlug}/games/${game.id}`}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-surface)] border border-transparent hover:border-[var(--league-primary)] transition-all text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]"
          aria-label={`View game details: ${game.away_team?.name} @ ${game.home_team?.name}`}
        >
          <Eye className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default ScheduleTable;
