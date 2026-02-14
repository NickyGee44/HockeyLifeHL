'use client';

import { Trophy, Target, TrendingUp, Shield, Flame, Users, PlusCircle, HandMetal, Crosshair, Crown, ShieldCheck, Star, Sprout, Award, Lock } from 'lucide-react';
import Image from 'next/image';
import type { PlayerBadge, BadgeType } from '@/lib/types';

interface BadgeConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  bgColor: string;
  textColor: string;
  image: string;
}

export const BADGE_CONFIG: Record<BadgeType, BadgeConfig> = {
  championship: {
    icon: Trophy,
    label: 'Championship',
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-500',
    image: '/badges/championship.png',
  },
  top_scorer: {
    icon: Target,
    label: 'Top Scorer',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-500',
    image: '/badges/top_scorer.png',
  },
  points_leader: {
    icon: TrendingUp,
    label: 'Points Leader',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-500',
    image: '/badges/points_leader.png',
  },
  top_goalie: {
    icon: Shield,
    label: 'Top Goalie',
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-500',
    image: '/badges/top_goalie.png',
  },
  iron_man: {
    icon: Flame,
    label: 'Iron Man',
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-500',
    image: '/badges/iron_man.png',
  },
  most_assists: {
    icon: Users,
    label: 'Most Assists',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-500',
    image: '/badges/most_assists.png',
  },
  best_plus_minus: {
    icon: PlusCircle,
    label: 'Best +/-',
    bgColor: 'bg-teal-500/20',
    textColor: 'text-teal-500',
    image: '/badges/best_plus_minus.png',
  },
  penalty_free: {
    icon: HandMetal,
    label: 'Penalty Free',
    bgColor: 'bg-sky-500/20',
    textColor: 'text-sky-500',
    image: '/badges/penalty_free.png',
  },
  division_top_scorer: {
    icon: Crosshair,
    label: 'Division Top Scorer',
    bgColor: 'bg-rose-500/20',
    textColor: 'text-rose-500',
    image: '/badges/division_top_scorer.png',
  },
  division_points_leader: {
    icon: Crown,
    label: 'Division Points Leader',
    bgColor: 'bg-indigo-500/20',
    textColor: 'text-indigo-500',
    image: '/badges/division_points_leader.png',
  },
  division_top_goalie: {
    icon: ShieldCheck,
    label: 'Division Top Goalie',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-500',
    image: '/badges/division_top_goalie.png',
  },
  team_mvp: {
    icon: Star,
    label: 'Team MVP',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-500',
    image: '/badges/team_mvp.png',
  },
  rookie_of_the_year: {
    icon: Sprout,
    label: 'Rookie of the Year',
    bgColor: 'bg-lime-500/20',
    textColor: 'text-lime-500',
    image: '/badges/rookie_of_the_year.png',
  },
  hall_of_fame: {
    icon: Award,
    label: 'Hall of Fame',
    bgColor: 'bg-amber-600/20',
    textColor: 'text-amber-600',
    image: '/badges/hall_of_fame.png',
  },
  shutout_king: {
    icon: Lock,
    label: 'Shutout King',
    bgColor: 'bg-violet-500/20',
    textColor: 'text-violet-500',
    image: '/badges/shutout_king.png',
  },
};

interface BadgeIconProps {
  badge: PlayerBadge;
  size?: 'sm' | 'md';
}

export function BadgeIcon({ badge, size = 'sm' }: BadgeIconProps) {
  const config = BADGE_CONFIG[badge.badge_type];
  if (!config) return null;
  const sizeClass = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  const imgSize = size === 'sm' ? 24 : 32;

  const seasonName = badge.season?.name ?? '';
  const teamName = badge.team?.name ?? '';
  const titleParts = [config.label];
  if (seasonName) titleParts.push(seasonName);
  if (teamName) titleParts[titleParts.length - 1] += ` (${teamName})`;
  const title = titleParts.join(' - ');

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${sizeClass} shrink-0 overflow-hidden`}
      title={title}
    >
      <Image
        src={config.image}
        alt={config.label}
        width={imgSize}
        height={imgSize}
        className="object-contain"
        onError={(e) => {
          // Fallback to icon if image fails to load
          const target = e.currentTarget;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.classList.add(config.bgColor, config.textColor);
          }
        }}
      />
    </span>
  );
}

interface BadgeCardProps {
  badge: PlayerBadge;
}

export function BadgeCard({ badge }: BadgeCardProps) {
  const config = BADGE_CONFIG[badge.badge_type];
  if (!config) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-hover)]">
      <span className="inline-flex items-center justify-center rounded-full w-10 h-10 shrink-0 overflow-hidden">
        <Image
          src={config.image}
          alt={config.label}
          width={40}
          height={40}
          className="object-contain"
        />
      </span>
      <div className="min-w-0">
        <div className={`text-sm font-semibold ${config.textColor}`}>
          {config.label}
        </div>
        {badge.season?.name && (
          <div className="text-xs text-[var(--color-text-muted)]">
            {badge.season.name}
            {badge.team?.name ? ` \u2022 ${badge.team.name}` : ''}
          </div>
        )}
        {badge.metadata && Object.keys(badge.metadata).length > 0 && (
          <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            {formatMetadata(badge.metadata)}
          </div>
        )}
      </div>
    </div>
  );
}

function formatMetadata(metadata: Record<string, any>): string {
  const parts: string[] = [];
  if (metadata.goals !== undefined) parts.push(`${metadata.goals}G`);
  if (metadata.assists !== undefined) parts.push(`${metadata.assists}A`);
  if (metadata.points !== undefined) parts.push(`${metadata.points}PTS`);
  if (metadata.plus_minus !== undefined) parts.push(`${metadata.plus_minus > 0 ? '+' : ''}${metadata.plus_minus}`);
  if (metadata.save_percentage !== undefined) parts.push(`${metadata.save_percentage} SV%`);
  if (metadata.gaa !== undefined) parts.push(`${metadata.gaa} GAA`);
  if (metadata.shutouts !== undefined) parts.push(`${metadata.shutouts} SO`);
  if (metadata.games_played !== undefined) parts.push(`${metadata.games_played}GP`);
  if (metadata.penalty_minutes !== undefined && metadata.penalty_minutes === 0) parts.push('0 PIM');
  return parts.join(' | ');
}
