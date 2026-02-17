'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Shield,
} from 'lucide-react';
import type { DivisionHealth } from '@/lib/actions/division-shuffle';

// ==============================================================================
// TYPES
// ==============================================================================

interface DivisionHealthDashboardProps {
  divisions: DivisionHealth[];
}

// ==============================================================================
// HELPERS
// ==============================================================================

const healthColors = {
  good: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-500',
    dot: 'bg-emerald-500',
    label: 'Balanced',
  },
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-500',
    dot: 'bg-yellow-500',
    label: 'Uneven',
  },
  poor: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-500',
    dot: 'bg-red-500',
    label: 'Imbalanced',
  },
};

function formatStat(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

function formatDiff(value: number): string {
  const formatted = formatStat(value);
  return value > 0 ? `+${formatted}` : formatted;
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export function DivisionHealthDashboard({ divisions }: DivisionHealthDashboardProps) {
  const t = useTranslations('divisions.health');

  if (divisions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Division Health Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {divisions.map((div) => {
          const colors = healthColors[div.healthScore];

          return (
            <div
              key={div.divisionId}
              className={cn(
                'bg-white/[0.04] border backdrop-blur-xl rounded-xl p-5',
                colors.border
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white text-lg">{div.divisionName}</h3>
                  {div.skillLevel && (
                    <span className="text-xs text-neutral-400">{div.skillLevel}</span>
                  )}
                </div>
                <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', colors.bg, colors.text)}>
                  <div className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
                  {colors.label}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatItem
                  icon={<Shield className="w-3.5 h-3.5" />}
                  label={t('teams')}
                  value={String(div.teamCount)}
                />
                <StatItem
                  icon={<Target className="w-3.5 h-3.5" />}
                  label={t('avgPoints')}
                  value={formatStat(div.avgPoints)}
                />
                <StatItem
                  icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
                  label={t('avgGF')}
                  value={formatStat(div.avgGoalsFor)}
                />
                <StatItem
                  icon={<TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                  label={t('avgGA')}
                  value={formatStat(div.avgGoalsAgainst)}
                />
                <StatItem
                  icon={<Activity className="w-3.5 h-3.5 text-rink-500" />}
                  label={t('avgDiff')}
                  value={formatDiff(div.avgGoalDiff)}
                  highlight={div.avgGoalDiff > 0 ? 'positive' : div.avgGoalDiff < 0 ? 'negative' : undefined}
                />
                <StatItem
                  icon={<Activity className="w-3.5 h-3.5 text-neutral-400" />}
                  label={t('spread')}
                  value={`±${formatStat(div.stdDevGoalDiff)}`}
                />
              </div>

              {/* Outliers */}
              {div.outliers.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                  {div.outliers.map((outlier) => (
                    <div
                      key={outlier.team.teamId}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                        outlier.suggestion === 'move_up'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      )}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate font-medium">{outlier.team.teamName}</span>
                      <span className="ml-auto text-xs whitespace-nowrap">
                        {outlier.suggestion === 'move_up'
                          ? t('considerMoveUp')
                          : t('considerMoveDown')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==============================================================================
// SUB-COMPONENTS
// ==============================================================================

function StatItem({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: 'positive' | 'negative';
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-neutral-800/50">
      <span className="text-neutral-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-neutral-500 leading-none mb-0.5">{label}</p>
        <p
          className={cn(
            'text-sm font-semibold',
            highlight === 'positive' && 'text-emerald-400',
            highlight === 'negative' && 'text-red-400',
            !highlight && 'text-white'
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
