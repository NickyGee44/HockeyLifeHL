import Image from 'next/image';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import type { BadgeType, Player, PlayerBadge } from '@/lib/types';
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
  const team = player.team;
  const teamColor = team?.primary_color || 'var(--league-primary)';
  const heroTrophies = buildHeroTrophies(badges, careerAchievements?.championships ?? 0);
  const compactBadges = badges?.filter((badge) => !FEATURED_TROPHY_BADGE_TYPES.has(badge.badge_type));

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
            {compactBadges && compactBadges.length > 0 && (
              <PlayerBadgeGroup badges={compactBadges} maxVisible={5} size="md" />
            )}
          </div>

          {heroTrophies.length > 0 && (
            <div className="mb-4 flex flex-wrap justify-center gap-3 sm:justify-start">
              {heroTrophies.map((trophy) => (
                <HeroTrophy key={trophy.id} trophy={trophy} />
              ))}
            </div>
          )}

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

type HeroTrophyItem = {
  id: string;
  label: string;
  image: string;
  value: string;
  detail?: string;
  tone: 'gold' | 'red' | 'blue';
};

const HERO_TROPHY_BADGE_TYPES = new Set<BadgeType>(['top_scorer', 'points_leader']);
const FEATURED_TROPHY_BADGE_TYPES = new Set<BadgeType>(['championship', ...HERO_TROPHY_BADGE_TYPES]);

const HERO_TROPHY_CONFIG: Record<'top_scorer' | 'points_leader', Omit<HeroTrophyItem, 'id' | 'value' | 'detail'>> = {
  top_scorer: {
    label: 'Top Scorer',
    image: '/badges/top_scorer.png',
    tone: 'red',
  },
  points_leader: {
    label: 'Points Leader',
    image: '/badges/points_leader.png',
    tone: 'blue',
  },
};

function buildHeroTrophies(badges: PlayerBadge[] | undefined, championships: number): HeroTrophyItem[] {
  const trophies: HeroTrophyItem[] = [];
  const trophyBadges = new Map<BadgeType, PlayerBadge[]>();

  badges?.forEach((badge) => {
    if (!HERO_TROPHY_BADGE_TYPES.has(badge.badge_type)) return;
    const existing = trophyBadges.get(badge.badge_type) ?? [];
    existing.push(badge);
    trophyBadges.set(badge.badge_type, existing);
  });

  (['top_scorer', 'points_leader'] as const).forEach((badgeType) => {
    const matchingBadges = trophyBadges.get(badgeType) ?? [];
    if (matchingBadges.length === 0) return;

    const latestBadge = matchingBadges[0];
    const config = HERO_TROPHY_CONFIG[badgeType];
    const statKey = badgeType === 'top_scorer' ? 'goals' : 'points';
    const statValue = latestBadge.metadata?.[statKey];

    trophies.push({
      ...config,
      id: badgeType,
      value: `x${matchingBadges.length}`,
      detail: typeof statValue === 'number'
        ? `${statValue} ${badgeType === 'top_scorer' ? 'goals' : 'points'}${latestBadge.season?.name ? ` - ${latestBadge.season.name}` : ''}`
        : latestBadge.season?.name,
    });
  });

  if (championships > 0) {
    trophies.unshift({
      id: 'championships',
      label: 'Championships',
      image: '/badges/championship.png',
      value: `x${championships}`,
      detail: championships === 1 ? 'League champion' : 'Career hardware',
      tone: 'gold',
    });
  }

  return trophies;
}

function HeroTrophy({ trophy }: { trophy: HeroTrophyItem }) {
  const toneClasses = {
    gold: 'border-amber-300/45 from-amber-300/28 via-yellow-500/12 to-orange-600/10 text-amber-100 shadow-amber-950/30',
    red: 'border-red-300/40 from-red-300/24 via-rose-500/12 to-orange-600/10 text-red-100 shadow-red-950/25',
    blue: 'border-sky-300/40 from-sky-300/24 via-blue-500/12 to-indigo-600/10 text-sky-100 shadow-blue-950/25',
  }[trophy.tone];

  return (
    <div className={`relative min-h-[118px] w-[150px] overflow-hidden rounded-lg border bg-gradient-to-br p-3 shadow-xl ${toneClasses}`}>
      <div className="relative flex flex-col items-center text-center">
        <div className="relative mb-1 flex h-16 w-16 items-center justify-center">
          <Image
            src={trophy.image}
            alt={trophy.label}
            width={72}
            height={72}
            className="relative h-16 w-16 object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.42)]"
          />
        </div>
        <div className="text-[11px] font-black uppercase tracking-normal">
          {trophy.label}
        </div>
        <div className="mt-0.5 text-2xl font-black leading-none text-white">
          {trophy.value}
        </div>
        {trophy.detail && (
          <div className="mt-1 max-w-full truncate text-[11px] font-semibold text-white/72">
            {trophy.detail}
          </div>
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
