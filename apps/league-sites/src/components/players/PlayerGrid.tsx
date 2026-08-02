'use client';

import Link from 'next/link';
import Image from 'next/image';
import { resolvePlayerPhotoUrl } from '@/lib/player-photo';

interface PlayerWithTeam {
  id: string;
  jersey_number: number | null;
  position: string | null;
  leadership_role: 'captain' | 'alternate_captain' | null;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    photo_url?: string | null;
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
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:hidden">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            leagueSlug={leagueSlug}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)]/68 shadow-[0_34px_90px_-64px_rgba(0,0,0,0.95)] lg:block">
        <div className="grid grid-cols-[1fr_120px_220px_140px] border-b border-[var(--color-border)] bg-[var(--color-background-elevated)]/75 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          <span>Player</span>
          <span>Jersey</span>
          <span>Team</span>
          <span>Position</span>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {players.map((player) => (
            <PlayerListRow
              key={player.id}
              player={player}
              leagueSlug={leagueSlug}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function PlayerListRow({
  player,
  leagueSlug,
}: {
  player: PlayerWithTeam;
  leagueSlug: string;
}) {
  const name = player.profile?.full_name || 'Unknown Player';
  const photoUrl = resolvePlayerPhotoUrl(player.profile) || '/blank_player.png';

  return (
    <Link
      href={`/${leagueSlug}/players/${player.id}`}
      className="group grid grid-cols-[1fr_120px_220px_140px] items-center px-5 py-3 transition-colors hover:bg-[var(--color-surface-hover)]/72"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src={photoUrl}
          alt={name}
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-2xl border border-[var(--color-border)] object-cover"
        />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--league-primary)]">
              {name}
            </p>
            {player.leadership_role ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/90 px-1.5 text-[10px] font-black text-black">
                {player.leadership_role === 'captain' ? 'C' : 'A'}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <span className="text-sm font-black tabular-nums text-[var(--color-text-primary)]">
        {player.jersey_number ? `#${player.jersey_number}` : '-'}
      </span>

      <span className="flex min-w-0 items-center gap-2">
        {player.team?.logo ? (
          <Image
            src={player.team.logo}
            alt={player.team.name}
            width={30}
            height={30}
            className="h-7 w-7 shrink-0 rounded-lg object-contain"
          />
        ) : null}
        <span className="truncate text-sm text-[var(--color-text-secondary)]">
          {player.team?.name || 'Free Agent'}
        </span>
      </span>

      <span className="inline-flex w-fit rounded-full border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
        {player.position || 'Roster'}
      </span>
    </Link>
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
  const photoUrl = resolvePlayerPhotoUrl(player.profile) || '/blank_player.png';

  return (
    <Link
      href={`/${leagueSlug}/players/${player.id}`}
      className="group glass-card rounded-xl overflow-hidden"
    >
      {/* Avatar */}
      <div className="aspect-square relative bg-[var(--color-surface-hover)]">
        <Image
          src={photoUrl}
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
