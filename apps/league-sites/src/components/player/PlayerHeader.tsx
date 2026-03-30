import Image from 'next/image';
import Link from 'next/link';
import { Shield, Trophy } from 'lucide-react';
import type { Player, PlayerBadge } from '@/lib/types';
import type { PlayerCareerAchievements } from '@/lib/career-achievements';
import { PlayerBadgeGroup } from '@/components/shared/PlayerBadgeGroup';

interface PlayerHeaderProps {
  player: Player;
  playerName: string;
  leagueSlug: string;
  badges?: PlayerBadge[];
  careerAchievements?: PlayerCareerAchievements;
}

export function PlayerHeader({ player, playerName, leagueSlug, badges, careerAchievements }: PlayerHeaderProps) {
  const team = (player as any).team;
  const teamColor = team?.primary_color || 'var(--league-primary)';

  return (
    <div className="league-reading-panel relative isolate overflow-hidden rounded-[30px] mb-6">
      {/* Background: team logo tiled watermark */}
      {team?.logo_url && (
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url(${team.logo_url})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '120px',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${teamColor} 18%, var(--color-background-elevated)) 0%, var(--color-background-elevated) 60%, color-mix(in srgb, ${teamColor} 10%, var(--color-background-elevated)) 100%)`,
        }}
      />

      {/* Team color accent bar at top */}
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: teamColor }}
      />

      {/* Content */}
      <div className="relative flex flex-col sm:flex-row items-center gap-6 p-6 md:p-8">
        {/* Player Avatar */}
        <div className="relative shrink-0">
          <Image
            src={player.profile?.avatar_url || '/blank_player.png'}
            alt={playerName}
            width={240}
            height={240}
            className="w-[200px] h-[200px] md:w-[240px] md:h-[240px] rounded-2xl border-2 border-[var(--color-border)] shadow-lg object-cover"
          />

          {/* Jersey number badge */}
          {player.jersey_number && (
            <div
              className="absolute -bottom-2 -right-2 w-12 h-12 rounded-xl flex items-center justify-center text-base font-black shadow-md border-2 border-[var(--color-background-elevated)]"
              style={{
                backgroundColor: teamColor,
                color: 'var(--color-accent-text, #000)',
              }}
            >
              #{player.jersey_number}
            </div>
          )}
        </div>

        {/* Player Info */}
        <div className="flex-1 text-center sm:text-left min-w-0">
          {/* Name + Badges */}
          <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start mb-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--color-text-primary)]">
              {playerName}
            </h1>
            {badges && badges.length > 0 && (
              <PlayerBadgeGroup badges={badges} maxVisible={5} size="md" />
            )}
          </div>

          {/* Team link with logo */}
          {team && (
            <Link
              href={`/${leagueSlug}/teams/${team.slug}`}
              className="inline-flex items-center gap-2 text-base font-medium hover:opacity-80 transition-opacity mb-3"
              style={{ color: teamColor }}
            >
              <Image
                src={team.logo_url || '/blank_team.png'}
                alt={team.name}
                width={48}
                height={48}
                className="w-8 h-8 md:w-12 md:h-12 rounded object-contain"
              />
              {team.name}
            </Link>
          )}

          {/* Meta pills: position, leadership */}
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {player.position && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border"
                style={{
                  borderColor: `color-mix(in srgb, ${teamColor} 30%, var(--color-border))`,
                  backgroundColor: `color-mix(in srgb, ${teamColor} 8%, transparent)`,
                  color: 'var(--color-text-secondary)',
                }}
              >
                <Shield className="w-3 h-3" style={{ color: teamColor }} />
                {getPositionLabel(player.position)}
              </span>
            )}

            {careerAchievements && careerAchievements.championships > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/12 text-xs font-semibold uppercase tracking-wide text-amber-300">
                <Trophy className="w-3 h-3" />
                {careerAchievements.championships} Championship{careerAchievements.championships === 1 ? '' : 's'}
              </span>
            )}

            {player.leadership_role === 'captain' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 text-amber-400 rounded-full text-xs font-bold uppercase tracking-wide border border-amber-500/30">
                <span className="text-sm">C</span>
                Captain
              </span>
            )}
            {player.leadership_role === 'alternate_captain' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] rounded-full text-xs font-semibold uppercase tracking-wide border border-[var(--color-border)]">
                <span className="text-sm">A</span>
                Alternate
              </span>
            )}
          </div>
        </div>

        {/* Large team logo on right (desktop only) */}
        {team?.logo_url && (
          <Link
            href={`/${leagueSlug}/teams/${team.slug}`}
            className="hidden lg:block shrink-0"
          >
            <Image
              src={team.logo_url}
              alt={team.name}
              width={240}
              height={240}
              className="w-[160px] h-[160px] md:w-[240px] md:h-[240px] rounded-xl opacity-60 hover:opacity-90 transition-opacity object-contain"
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
    Forward: 'Forward',
    Defense: 'Defense',
    Goalie: 'Goaltender',
  };
  return positions[position || ''] || position || 'Player';
}
