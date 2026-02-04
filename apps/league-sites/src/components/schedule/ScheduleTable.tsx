import Link from 'next/link';
import { format } from 'date-fns';
import { Eye, MapPin, Clock } from 'lucide-react';
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
 * Desktop: Full table layout with columns for matchup, time, venue, division, and actions
 * Mobile: Card layout with stacked information
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
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                Match Up
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                Time
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                Rink
              </th>
              {showDivision && (
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Division
                </th>
              )}
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
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
      <div className="md:hidden space-y-4">
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
  const isCompleted = game.status === 'final';
  const isLive = game.status === 'in_progress';

  // Get division name - try game.division first (ScheduleGame), then home_team.division (Game)
  const divisionName =
    ('division' in game && game.division?.name) ||
    ('home_team' in game && game.home_team && 'division' in game.home_team && game.home_team.division?.name) ||
    null;

  return (
    <tr className="border-b border-[var(--color-border-muted)] hover:bg-[var(--color-surface-hover)] transition-colors">
      {/* Match Up Column */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-4">
          {/* Away Team */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <TeamLogo
              logoUrl={game.away_team?.logo || null}
              teamName={game.away_team?.name || 'TBD'}
              teamColor={game.away_team?.colors}
              size="sm"
            />
            <div className="flex flex-col">
              <Link
                href={`/${leagueSlug}/teams/${game.away_team?.slug}`}
                className="font-medium hover:text-[var(--league-primary)] transition-colors text-sm"
              >
                {game.away_team?.name || 'TBD'}
              </Link>
              {isCompleted && (
                <span
                  className={`text-lg font-bold ${
                    (game.away_score || 0) > (game.home_score || 0)
                      ? 'text-[var(--league-primary)]'
                      : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  {game.away_score}
                </span>
              )}
            </div>
          </div>

          {/* VS / @ / Score indicator */}
          <span className="text-xs text-[var(--color-text-muted)] font-medium">
            {isLive ? (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                LIVE
              </span>
            ) : isCompleted ? (
              'Final'
            ) : (
              '@'
            )}
          </span>

          {/* Home Team */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <TeamLogo
              logoUrl={game.home_team?.logo || null}
              teamName={game.home_team?.name || 'TBD'}
              teamColor={game.home_team?.colors}
              size="sm"
            />
            <div className="flex flex-col">
              <Link
                href={`/${leagueSlug}/teams/${game.home_team?.slug}`}
                className="font-medium hover:text-[var(--league-primary)] transition-colors text-sm"
              >
                {game.home_team?.name || 'TBD'}
              </Link>
              {isCompleted && (
                <span
                  className={`text-lg font-bold ${
                    (game.home_score || 0) > (game.away_score || 0)
                      ? 'text-[var(--league-primary)]'
                      : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  {game.home_score}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Time Column */}
      <td className="py-4 px-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {format(gameDate, 'h:mm a')}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {format(gameDate, 'EEE, MMM d')}
          </span>
        </div>
      </td>

      {/* Rink/Venue Column */}
      <td className="py-4 px-4">
        {game.venue ? (
          <span className="text-sm text-[var(--color-text-secondary)]">
            {game.venue}
          </span>
        ) : (
          <span className="text-sm text-[var(--color-text-muted)]">TBD</span>
        )}
      </td>

      {/* Division Column */}
      {showDivision && (
        <td className="py-4 px-4">
          {divisionName ? (
            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-[var(--color-surface-active)] text-[var(--color-text-secondary)]">
              {divisionName}
            </span>
          ) : (
            <span className="text-sm text-[var(--color-text-muted)]">-</span>
          )}
        </td>
      )}

      {/* Details/Actions Column */}
      <td className="py-4 px-4 text-center">
        <Link
          href={`/${leagueSlug}/games/${game.id}`}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--color-surface-active)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]"
          aria-label={`View game details: ${game.away_team?.name} vs ${game.home_team?.name}`}
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
  const isCompleted = game.status === 'final';
  const isLive = game.status === 'in_progress';

  // Get division name - try game.division first (ScheduleGame), then home_team.division (Game)
  const divisionName =
    ('division' in game && game.division?.name) ||
    ('home_team' in game && game.home_team && 'division' in game.home_team && game.home_team.division?.name) ||
    null;

  return (
    <div className="card p-4">
      {/* Header: Date/Time + Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-[var(--color-text-primary)]">
            {format(gameDate, 'EEE, MMM d')}
          </span>
          <span className="text-[var(--league-primary)] font-semibold">
            {format(gameDate, 'h:mm a')}
          </span>
        </div>
        {isLive ? (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
            LIVE
          </span>
        ) : isCompleted ? (
          <span className="text-xs text-[var(--color-text-muted)] font-medium">
            Final
          </span>
        ) : null}
      </div>

      {/* Teams */}
      <div className="space-y-3 mb-4">
        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TeamLogo
              logoUrl={game.away_team?.logo || null}
              teamName={game.away_team?.name || 'TBD'}
              teamColor={game.away_team?.colors}
              size="md"
            />
            <Link
              href={`/${leagueSlug}/teams/${game.away_team?.slug}`}
              className="font-medium hover:text-[var(--league-primary)] transition-colors"
            >
              {game.away_team?.name || 'TBD'}
            </Link>
          </div>
          {isCompleted && (
            <span
              className={`text-2xl font-bold ${
                (game.away_score || 0) > (game.home_score || 0)
                  ? 'text-[var(--league-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {game.away_score}
            </span>
          )}
        </div>

        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TeamLogo
              logoUrl={game.home_team?.logo || null}
              teamName={game.home_team?.name || 'TBD'}
              teamColor={game.home_team?.colors}
              size="md"
            />
            <Link
              href={`/${leagueSlug}/teams/${game.home_team?.slug}`}
              className="font-medium hover:text-[var(--league-primary)] transition-colors"
            >
              {game.home_team?.name || 'TBD'}
            </Link>
          </div>
          {isCompleted && (
            <span
              className={`text-2xl font-bold ${
                (game.home_score || 0) > (game.away_score || 0)
                  ? 'text-[var(--league-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {game.home_score}
            </span>
          )}
        </div>
      </div>

      {/* Footer: Venue, Division, Action */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-muted)]">
        <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
          {game.venue && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{game.venue}</span>
            </div>
          )}
          {showDivision && divisionName && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-active)]">
              {divisionName}
            </span>
          )}
        </div>
        <Link
          href={`/${leagueSlug}/games/${game.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--league-primary)] hover:underline"
        >
          <Eye className="w-4 h-4" />
          <span>Details</span>
        </Link>
      </div>
    </div>
  );
}

export default ScheduleTable;
