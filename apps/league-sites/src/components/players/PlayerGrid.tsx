'use client';

import Link from 'next/link';
import Image from 'next/image';

interface PlayerWithTeam {
  id: string;
  jersey_number: number | null;
  position: string | null;
  leadership_role: 'captain' | 'alternate_captain' | null;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  } | null;
}

interface PlayerGridProps {
  players: PlayerWithTeam[];
  leagueSlug: string;
}

export function PlayerGrid({ players, leagueSlug }: PlayerGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          leagueSlug={leagueSlug}
        />
      ))}
    </div>
  );
}

function PlayerCard({
  player,
  leagueSlug,
}: {
  player: PlayerWithTeam;
  leagueSlug: string;
}) {
  const name = player.profile?.full_name || 'Unknown Player';

  const initials = name
    .split(' ')
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <Link
      href={`/${leagueSlug}/players/${player.id}`}
      className="group glass-card rounded-xl overflow-hidden"
    >
      {/* Avatar */}
      <div className="aspect-square relative bg-[var(--color-surface-hover)]">
        <Image
          src={player.profile?.avatar_url || '/blank_player.png'}
          alt={name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Jersey Number Badge */}
        {player.jersey_number && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-[var(--color-background)]/80 backdrop-blur-sm rounded-lg text-sm font-bold text-[var(--color-text-primary)]">
            #{player.jersey_number}
          </div>
        )}

        {/* Captain Badge */}
        {player.leadership_role && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500/90 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-black">
              {player.leadership_role === 'captain' ? 'C' : 'A'}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-base font-medium text-[var(--color-text-primary)] truncate group-hover:text-[var(--league-primary)] transition-colors">
          {name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          {player.team && (
            <>
              <Link
                href={`/${leagueSlug}/teams/${player.team.slug}`}
                className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
              >
                {player.team.logo && (
                  <Image
                    src={player.team.logo}
                    alt={player.team.name}
                    width={32}
                    height={32}
                    className="rounded"
                  />
                )}
                <span className="text-xs text-[var(--color-text-secondary)] truncate">
                  {player.team.name}
                </span>
              </Link>
            </>
          )}
        </div>
        {player.position && (
          <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-[var(--color-surface-hover)] rounded text-[var(--color-text-muted)]">
            {player.position}
          </span>
        )}
      </div>
    </Link>
  );
}
