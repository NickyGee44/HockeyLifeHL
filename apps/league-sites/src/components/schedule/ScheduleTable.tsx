import Link from 'next/link';
import { Eye, FileText, Clock } from 'lucide-react';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type { Game, ScheduleGame } from '@/lib/types';

// Helper to format time in the league's timezone
function formatTimeInTimezone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return formatter.format(date);
}

// Union type to accept both Game and ScheduleGame
type ScheduleGameData = Game | ScheduleGame;

interface ScheduleTableProps {
  games: ScheduleGameData[];
  leagueSlug: string;
  showDivision?: boolean;
  timezone?: string;
}

/**
 * ScheduleTable - BMHL-style game schedule rows
 *
 * Desktop: Table with columns: Match Up | Time | Rink | Division | Details
 * Mobile: Compact card layout
 *
 * The date group header (secondary color) is rendered by the parent page.
 * This component renders the game rows within each date group.
 */
export function ScheduleTable({
  games,
  leagueSlug,
  showDivision = true,
  timezone = 'America/Toronto',
}: ScheduleTableProps) {
  if (games.length === 0) {
    return (
      <div className="py-12 text-center">
        <Clock className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-40" />
        <h3 className="text-lg font-semibold mb-2">No Games Found</h3>
        <p className="text-[var(--color-text-secondary)]">
          No games match the selected filters.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr
              className="text-[var(--color-text-muted)]"
              style={{
                background: 'color-mix(in srgb, var(--color-background-elevated) 92%, var(--color-surface) 8%)',
              }}
            >
              <th className="text-left py-2 px-4 text-xs font-semibold uppercase tracking-wider">
                Match Up
              </th>
              <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider w-[90px]">
                Time
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider w-[130px]">
                Rink
              </th>
              {showDivision && (
                <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider w-[80px]">
                  Div
                </th>
              )}
              <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider w-[80px]">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {games.map((game, i) => (
              <ScheduleTableRow
                key={game.id}
                game={game}
                leagueSlug={leagueSlug}
                showDivision={showDivision}
                isLast={i === games.length - 1}
                timezone={timezone}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-[var(--color-border-muted)] overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/78">
        {games.map((game) => (
          <ScheduleCard
            key={game.id}
            game={game}
            leagueSlug={leagueSlug}
            showDivision={showDivision}
            timezone={timezone}
          />
        ))}
      </div>
    </>
  );
}

// Helper to determine the winning team
function getWinner(game: ScheduleGameData): 'home' | 'away' | 'tie' | null {
  if (game.status !== 'completed') return null;
  const homeScore = game.home_score ?? 0;
  const awayScore = game.away_score ?? 0;
  if (homeScore > awayScore) return 'home';
  if (awayScore > homeScore) return 'away';
  return 'tie';
}

// Get division short code
function getDivisionCode(divisionName: string | null | undefined): string {
  if (!divisionName) return '-';
  if (divisionName.length <= 3) return divisionName;
  const match = divisionName.match(/^([A-Z]\d?)[\s-]/i) || divisionName.match(/[\s-]([A-Z]\d?)$/i);
  if (match) return match[1].toUpperCase();
  return divisionName.substring(0, 2).toUpperCase();
}

// Desktop table row
function ScheduleTableRow({
  game,
  leagueSlug,
  showDivision,
  isLast,
  timezone,
}: {
  game: ScheduleGameData;
  leagueSlug: string;
  showDivision: boolean;
  isLast: boolean;
  timezone: string;
}) {
  const gameDate = new Date(game.scheduled_at);
  const isCompleted = game.status === 'completed';
  const isLive = game.status === 'in_progress';
  const winner = getWinner(game);

  const divisionName =
    ('division' in game && game.division?.name) ||
    ('home_team' in game && game.home_team && 'division' in game.home_team && game.home_team.division?.name) ||
    null;

  return (
    <tr
      className={`hover:bg-[var(--color-surface-hover)] transition-colors ${
        !isLast ? 'border-b border-[var(--color-border-muted)]' : ''
      }`}
    >
      {/* Match Up Column */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {/* Away Team */}
          <TeamLogo
            logoUrl={game.away_team?.logo || null}
            teamName={game.away_team?.name || 'TBD'}
            teamColor={game.away_team?.colors}
            size="md"
            className="shrink-0"
          />
          <Link
            href={`/${leagueSlug}/teams/${game.away_team?.slug}`}
            className={`text-sm hover:text-[var(--league-primary)] transition-colors whitespace-nowrap ${
              isCompleted && winner === 'away' ? 'font-bold text-[var(--league-primary)]' : 'font-medium text-[var(--color-text-primary)]'
            }`}
          >
            {game.away_team?.name || 'TBD'}
          </Link>

          {(isCompleted || isLive) && (
            <span className={`text-sm font-bold tabular-nums ${
              isLive ? 'text-red-400' : winner === 'away' ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'
            }`}>
              {isLive ? (game.away_score ?? 0) : game.away_score}
            </span>
          )}

          <span className="text-xs text-[var(--color-text-muted)] font-bold mx-0.5">vs</span>

          {(isCompleted || isLive) && (
            <span className={`text-sm font-bold tabular-nums ${
              isLive ? 'text-red-400' : winner === 'home' ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'
            }`}>
              {isLive ? (game.home_score ?? 0) : game.home_score}
            </span>
          )}

          <Link
            href={`/${leagueSlug}/teams/${game.home_team?.slug}`}
            className={`text-sm hover:text-[var(--league-primary)] transition-colors whitespace-nowrap ${
              isCompleted && winner === 'home' ? 'font-bold text-[var(--league-primary)]' : 'font-medium text-[var(--color-text-primary)]'
            }`}
          >
            {game.home_team?.name || 'TBD'}
          </Link>
          <TeamLogo
            logoUrl={game.home_team?.logo || null}
            teamName={game.home_team?.name || 'TBD'}
            teamColor={game.home_team?.colors}
            size="md"
            className="shrink-0"
          />
        </div>
        {game.game_type === 'playoff' && (
          <span className="mt-1 inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
            Playoff
          </span>
        )}
      </td>

      {/* Time / Score Column */}
      <td className="py-3 px-3 text-center w-[90px]">
        {isLive ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/15 text-red-400 rounded-full text-xs font-bold uppercase animate-pulse">
            LIVE
          </span>
        ) : isCompleted ? (
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
            Final
          </span>
        ) : (
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {formatTimeInTimezone(gameDate, timezone)}
          </span>
        )}
      </td>

      {/* Rink/Venue Column */}
      <td className="py-3 px-3 w-[130px]">
        <span className="text-sm text-[var(--color-text-secondary)] truncate block max-w-[130px]">
          {game.venue || 'TBD'}
        </span>
      </td>

      {/* Division Column */}
      {showDivision && (
        <td className="py-3 px-3 text-center w-[80px]">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{
              background: 'color-mix(in srgb, var(--league-primary) 12%, transparent)',
              color: 'var(--league-primary)',
            }}
          >
            {getDivisionCode(divisionName)}
          </span>
        </td>
      )}

      {/* Details Column - Circular buttons */}
      <td className="py-3 px-3 text-center w-[80px]">
        <div className="flex items-center justify-center gap-1.5">
          <Link
            href={`/${leagueSlug}/games/${game.id}`}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-all"
            style={{ background: 'var(--league-primary)', color: 'var(--color-accent-text)' }}
            aria-label={`View game: ${game.away_team?.name} vs ${game.home_team?.name}`}
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
          {isCompleted && (
            <Link
              href={`/${leagueSlug}/games/${game.id}`}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-all"
              style={{ background: 'var(--league-secondary)', color: 'var(--league-secondary-contrast)' }}
              aria-label="View scoresheet"
            >
              <FileText className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

// Mobile card view
function ScheduleCard({
  game,
  leagueSlug,
  showDivision,
  timezone,
}: {
  game: ScheduleGameData;
  leagueSlug: string;
  showDivision: boolean;
  timezone: string;
}) {
  const gameDate = new Date(game.scheduled_at);
  const isCompleted = game.status === 'completed';
  const isLive = game.status === 'in_progress';
  const winner = getWinner(game);

  const divisionName =
    ('division' in game && game.division?.name) ||
    ('home_team' in game && game.home_team && 'division' in game.home_team && game.home_team.division?.name) ||
    null;

  return (
    <Link
      href={`/${leagueSlug}/games/${game.id}`}
      className="block px-4 py-3 hover:bg-[var(--color-surface-hover)] transition-colors"
    >
      {/* Status + Time Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/15 text-red-400 rounded-full text-xs font-bold uppercase animate-pulse">
              LIVE
            </span>
          ) : isCompleted ? (
            <span className="text-xs text-[var(--color-text-muted)] font-semibold uppercase">
              Final
            </span>
          ) : (
            <span className="text-sm font-semibold text-[var(--league-primary)]">
              {formatTimeInTimezone(gameDate, timezone)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {game.game_type === 'playoff' && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Playoff
            </span>
          )}
          {showDivision && divisionName && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded"
              style={{
                background: 'color-mix(in srgb, var(--league-primary) 12%, transparent)',
                color: 'var(--league-primary)',
              }}
            >
              {getDivisionCode(divisionName)}
            </span>
          )}
        </div>
      </div>

      {/* Match Up - Two rows for mobile */}
      <div className="space-y-1.5">
        {/* Away Team */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <TeamLogo
              logoUrl={game.away_team?.logo || null}
              teamName={game.away_team?.name || 'TBD'}
              teamColor={game.away_team?.colors}
              size="md"
              className="shrink-0"
            />
            <span className={`truncate text-base ${
              isCompleted && winner === 'away' ? 'font-bold text-[var(--league-primary)]' : 'font-medium text-[var(--color-text-primary)]'
            }`}>
              {game.away_team?.name || 'TBD'}
            </span>
          </div>
          {(isCompleted || isLive) && (
            <span className={`text-lg font-bold tabular-nums ${
              isLive ? 'text-red-400' : winner === 'away' ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'
            }`}>
              {isLive ? (game.away_score ?? 0) : game.away_score}
            </span>
          )}
        </div>

        {/* Home Team */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <TeamLogo
              logoUrl={game.home_team?.logo || null}
              teamName={game.home_team?.name || 'TBD'}
              teamColor={game.home_team?.colors}
              size="md"
              className="shrink-0"
            />
            <span className={`truncate text-base ${
              isCompleted && winner === 'home' ? 'font-bold text-[var(--league-primary)]' : 'font-medium text-[var(--color-text-primary)]'
            }`}>
              {game.home_team?.name || 'TBD'}
            </span>
          </div>
          {(isCompleted || isLive) && (
            <span className={`text-lg font-bold tabular-nums ${
              isLive ? 'text-red-400' : winner === 'home' ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'
            }`}>
              {isLive ? (game.home_score ?? 0) : game.home_score}
            </span>
          )}
        </div>
      </div>

      {/* Venue */}
      {game.venue && (
        <div className="mt-2 text-xs text-[var(--color-text-muted)]">
          {game.venue}
        </div>
      )}
    </Link>
  );
}

export default ScheduleTable;
