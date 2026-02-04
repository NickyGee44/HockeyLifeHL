import Link from 'next/link';
import { format } from 'date-fns';
import { MapPin, Calendar, Clock } from 'lucide-react';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type { GamePreview, TeamWithStats } from '@/lib/types';

interface GamePreviewHeaderProps {
  game: GamePreview;
  homeTeam: TeamWithStats;
  awayTeam: TeamWithStats;
  leagueSlug: string;
}

/**
 * GamePreviewHeader - Hero header with diagonal team color split design
 *
 * Features BMHL-style diagonal stripe design with:
 * - Away team on left side with diagonal clip-path
 * - Home team on right side with diagonal clip-path
 * - Center section with game info (date, time, venue, status)
 * - Team logos, names, and division info on each side
 */
export function GamePreviewHeader({
  game,
  homeTeam,
  awayTeam,
  leagueSlug,
}: GamePreviewHeaderProps) {
  const gameDate = new Date(game.scheduled_at);
  const isCompleted = game.status === 'final';
  const isLive = game.status === 'in_progress';
  const isPostponed = game.status === 'postponed';
  const isCancelled = game.status === 'cancelled';

  // Parse team colors (format: "primary,secondary" or just "primary")
  const awayColors = awayTeam.colors?.split(',') || [];
  const homeColors = homeTeam.colors?.split(',') || [];
  const awayPrimary = awayColors[0] || 'var(--color-surface)';
  const homePrimary = homeColors[0] || 'var(--league-primary)';

  // Determine status badge
  const getStatusBadge = () => {
    if (isLive) {
      return (
        <span className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-bold animate-pulse">
          LIVE
          {game.period && ` - P${game.period}`}
          {game.period_time && ` ${game.period_time}`}
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text)] rounded-full text-sm font-bold">
          FINAL
        </span>
      );
    }
    if (isPostponed) {
      return (
        <span className="px-4 py-2 bg-yellow-500 text-black rounded-full text-sm font-bold">
          POSTPONED
        </span>
      );
    }
    if (isCancelled) {
      return (
        <span className="px-4 py-2 bg-red-900 text-white rounded-full text-sm font-bold">
          CANCELLED
        </span>
      );
    }
    return null;
  };

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '280px' }}>
      {/* Background with diagonal split */}
      <div className="absolute inset-0 flex">
        {/* Away team side (left) */}
        <div
          className="absolute inset-y-0 left-0 w-[60%]"
          style={{
            backgroundColor: awayPrimary,
            clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0 100%)',
          }}
        />
        {/* Home team side (right) */}
        <div
          className="absolute inset-y-0 right-0 w-[60%]"
          style={{
            backgroundColor: homePrimary,
            clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0 100%)',
          }}
        />
        {/* Subtle overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Away Team (Left) */}
          <div className="flex-1 flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <Link
              href={`/${leagueSlug}/teams/${awayTeam.slug}`}
              className="block transition-transform hover:scale-105"
            >
              <TeamLogo
                logoUrl={awayTeam.logo}
                teamName={awayTeam.name}
                teamColor={awayPrimary}
                size="xl"
              />
            </Link>
            <div>
              <Link
                href={`/${leagueSlug}/teams/${awayTeam.slug}`}
                className="block text-white hover:underline"
              >
                <h2 className="text-2xl md:text-3xl font-bold drop-shadow-lg">
                  {awayTeam.name}
                </h2>
              </Link>
              {awayTeam.division && (
                <p className="text-white/80 text-sm mt-1">
                  {awayTeam.division.name}
                </p>
              )}
              {/* Score for completed/live games */}
              {(isCompleted || isLive) && game.away_score !== null && (
                <p className="text-4xl md:text-5xl font-bold text-white mt-2 drop-shadow-lg">
                  {game.away_score}
                </p>
              )}
            </div>
          </div>

          {/* Center Info */}
          <div className="flex flex-col items-center text-center text-white z-20">
            {getStatusBadge()}

            {!isCompleted && !isLive && (
              <>
                <div className="flex items-center gap-2 mt-4">
                  <Calendar className="w-5 h-5" />
                  <span className="text-lg font-medium">
                    {format(gameDate, 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-5 h-5" />
                  <span className="text-2xl font-bold">
                    {format(gameDate, 'h:mm a')}
                  </span>
                </div>
              </>
            )}

            {isCompleted && (
              <div className="mt-2 text-white/80 text-sm">
                {format(gameDate, 'MMMM d, yyyy')}
              </div>
            )}

            <div className="text-3xl font-bold my-4 text-white/60">@</div>

            {game.venue && (
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{game.venue}</span>
              </div>
            )}
          </div>

          {/* Home Team (Right) */}
          <div className="flex-1 flex flex-col md:flex-row-reverse items-center gap-4 text-center md:text-right">
            <Link
              href={`/${leagueSlug}/teams/${homeTeam.slug}`}
              className="block transition-transform hover:scale-105"
            >
              <TeamLogo
                logoUrl={homeTeam.logo}
                teamName={homeTeam.name}
                teamColor={homePrimary}
                size="xl"
              />
            </Link>
            <div>
              <Link
                href={`/${leagueSlug}/teams/${homeTeam.slug}`}
                className="block text-white hover:underline"
              >
                <h2 className="text-2xl md:text-3xl font-bold drop-shadow-lg">
                  {homeTeam.name}
                </h2>
              </Link>
              {homeTeam.division && (
                <p className="text-white/80 text-sm mt-1">
                  {homeTeam.division.name}
                </p>
              )}
              {/* Score for completed/live games */}
              {(isCompleted || isLive) && game.home_score !== null && (
                <p className="text-4xl md:text-5xl font-bold text-white mt-2 drop-shadow-lg">
                  {game.home_score}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GamePreviewHeader;
