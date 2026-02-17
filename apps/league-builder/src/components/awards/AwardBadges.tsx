'use client';

import { useState, useEffect } from 'react';
import { getPlayerAwards, type LeagueAwardWithDetails } from '@/lib/actions/awards';
import { cn } from '@hockey-life/ui';
import {
  Star,
  Target,
  Shield,
  Zap,
  Heart,
  Award,
  Trophy,
  Loader2,
} from 'lucide-react';

interface AwardBadgesProps {
  playerId: string;
  /** Pre-loaded awards (skip fetch if provided) */
  awards?: LeagueAwardWithDetails[];
  /** Compact mode for inline use in player lists */
  compact?: boolean;
  /** Maximum number of badges to show (0 = all) */
  maxBadges?: number;
  /** Additional CSS class names */
  className?: string;
}

/** Category-specific badge styles */
const CATEGORY_BADGE_CONFIG: Record<string, {
  icon: typeof Star;
  color: string;
  bg: string;
  border: string;
  label: string;
}> = {
  mvp: {
    icon: Star,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    label: 'MVP',
  },
  top_scorer: {
    icon: Target,
    color: 'text-rink-400',
    bg: 'bg-rink-500/15',
    border: 'border-rink-500/30',
    label: 'Top Scorer',
  },
  best_goalie: {
    icon: Shield,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    label: 'Best Goalie',
  },
  rookie: {
    icon: Zap,
    color: 'text-green-400',
    bg: 'bg-green-500/15',
    border: 'border-green-500/30',
    label: 'Rookie',
  },
  sportsmanship: {
    icon: Heart,
    color: 'text-pink-400',
    bg: 'bg-pink-500/15',
    border: 'border-pink-500/30',
    label: 'Sportsmanship',
  },
  custom: {
    icon: Award,
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/30',
    label: 'Award',
  },
};

function getBadgeConfig(category: string) {
  return CATEGORY_BADGE_CONFIG[category] || CATEGORY_BADGE_CONFIG.custom;
}

/** Extract year from season name (e.g., "Winter 2025" -> "2025") */
function extractYear(seasonName: string | null | undefined): string {
  if (!seasonName) return '';
  const match = seasonName.match(/\d{4}/);
  return match ? match[0] : seasonName;
}

export function AwardBadges({
  playerId,
  awards: preloadedAwards,
  compact = false,
  maxBadges = 0,
  className,
}: AwardBadgesProps) {
  const [awards, setAwards] = useState<LeagueAwardWithDetails[]>(preloadedAwards || []);
  const [loading, setLoading] = useState(!preloadedAwards);

  useEffect(() => {
    if (preloadedAwards) return;

    let cancelled = false;

    async function fetchAwards() {
      const result = await getPlayerAwards(playerId);
      if (!cancelled && result.success) {
        setAwards(result.data);
      }
      if (!cancelled) {
        setLoading(false);
      }
    }

    fetchAwards();
    return () => { cancelled = true; };
  }, [playerId, preloadedAwards]);

  if (loading) {
    return (
      <div className={cn('inline-flex items-center', className)}>
        <Loader2 className="w-3 h-3 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (awards.length === 0) return null;

  const displayAwards = maxBadges > 0 ? awards.slice(0, maxBadges) : awards;
  const remaining = maxBadges > 0 ? awards.length - maxBadges : 0;

  // Compact mode: small inline badges
  if (compact) {
    return (
      <div className={cn('inline-flex items-center gap-1 flex-wrap', className)}>
        {displayAwards.map((award) => {
          const config = getBadgeConfig(award.category);
          const Icon = config.icon;
          const year = extractYear(award.season_name);

          return (
            <span
              key={award.id}
              title={`${award.award_name}${award.season_name ? ` - ${award.season_name}` : ''}`}
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold',
                config.bg,
                config.border,
                config.color
              )}
            >
              <Icon className="w-2.5 h-2.5" />
              {config.label}
              {year && <span className="opacity-70">{year}</span>}
            </span>
          );
        })}
        {remaining > 0 && (
          <span className="text-[10px] text-neutral-500 font-medium">
            +{remaining}
          </span>
        )}
      </div>
    );
  }

  // Full mode: larger badges with more detail
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {displayAwards.map((award) => {
        const config = getBadgeConfig(award.category);
        const Icon = config.icon;
        const year = extractYear(award.season_name);

        return (
          <div
            key={award.id}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border',
              config.bg,
              config.border
            )}
          >
            <Icon className={cn('w-4 h-4', config.color)} />
            <div className="flex flex-col">
              <span className={cn('text-xs font-bold leading-tight', config.color)}>
                {award.award_name}
              </span>
              {award.season_name && (
                <span className="text-[10px] text-neutral-500 leading-tight">
                  {award.season_name}
                  {award.team_name && ` - ${award.team_name}`}
                </span>
              )}
            </div>
          </div>
        );
      })}
      {remaining > 0 && (
        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10">
          <Trophy className="w-4 h-4 text-neutral-400" />
          <span className="text-xs text-neutral-400 font-medium">
            +{remaining} more
          </span>
        </div>
      )}
    </div>
  );
}
