import Image from 'next/image';
import Link from 'next/link';
import type { Player } from '@/lib/types';

interface PlayerHeaderProps {
  player: Player;
  playerName: string;
  leagueSlug: string;
}

export function PlayerHeader({ player, playerName, leagueSlug }: PlayerHeaderProps) {
  const team = (player as any).team;

  return (
    <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-xl p-6 mb-6">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Player Avatar */}
        {player.profile?.avatar_url ? (
          <Image
            src={player.profile.avatar_url}
            alt={playerName}
            width={96}
            height={96}
            className="rounded-full"
          />
        ) : (
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
            style={{
              backgroundColor: 'var(--league-primary)',
              color: 'var(--color-background)',
            }}
          >
            {playerName.charAt(0)}
          </div>
        )}

        {/* Player Info */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">{playerName}</h1>

          {/* Team Link */}
          {team && (
            <Link
              href={`/${leagueSlug}/teams/${team.slug}`}
              className="text-[var(--league-primary)] hover:underline transition-colors"
            >
              {team.name}
            </Link>
          )}

          {/* Player Details */}
          <div className="flex flex-wrap gap-4 mt-3 justify-center sm:justify-start">
            {/* Jersey Number */}
            {player.jersey_number && (
              <div className="flex items-center gap-2">
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--league-primary)',
                    color: 'var(--color-background)',
                  }}
                >
                  {player.jersey_number}
                </span>
              </div>
            )}

            {/* Position */}
            {player.position && (
              <span className="px-3 py-1 bg-[var(--color-surface-hover)] rounded-full text-sm">
                {getPositionLabel(player.position)}
              </span>
            )}

            {/* Captain/Alternate */}
            {player.leadership_role === 'captain' && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium">
                Captain
              </span>
            )}
            {player.leadership_role === 'alternate_captain' && (
              <span className="px-3 py-1 bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] rounded-full text-sm font-medium">
                Alternate Captain
              </span>
            )}
          </div>
        </div>

        {/* Team Logo */}
        {team?.logo && (
          <Link href={`/${leagueSlug}/teams/${team.slug}`} className="hidden sm:block">
            <Image
              src={team.logo}
              alt={team.name}
              width={80}
              height={80}
              className="rounded-lg opacity-75 hover:opacity-100 transition-opacity"
            />
          </Link>
        )}
      </div>
    </div>
  );
}

function getPositionLabel(position: string | null): string {
  const positions: Record<string, string> = {
    C: 'Center',
    LW: 'Left Wing',
    RW: 'Right Wing',
    D: 'Defense',
    G: 'Goaltender',
  };
  return positions[position || ''] || 'Player';
}
