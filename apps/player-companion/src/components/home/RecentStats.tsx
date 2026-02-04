'use client';

import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import type { PlayerStats } from '@/lib/offline/db';

interface RecentStatsProps {
  stats: PlayerStats | null;
  className?: string;
}

export function RecentStats({ stats, className }: RecentStatsProps) {
  const statItems = stats
    ? [
        { label: 'GP', value: stats.games_played },
        { label: 'G', value: stats.goals },
        { label: 'A', value: stats.assists },
        { label: 'PTS', value: stats.points, highlight: true },
      ]
    : [
        { label: 'GP', value: 0 },
        { label: 'G', value: 0 },
        { label: 'A', value: 0 },
        { label: 'PTS', value: 0, highlight: true },
      ];

  return (
    <div
      className={cn(
        'rounded-xl bg-neutral-850 border border-gold-500/20 p-4',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
          This Season
        </span>
        <Link
          href="/stats"
          className="text-xs text-gold-500 font-medium active:opacity-70 transition-opacity"
        >
          View All
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statItems.map((stat) => (
          <StatCell
            key={stat.label}
            label={stat.label}
            value={stat.value}
            highlight={stat.highlight}
          />
        ))}
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className={cn(
          'text-2xl font-bold',
          highlight ? 'text-gold-500' : 'text-white'
        )}
      >
        {value}
      </p>
      <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mt-1">
        {label}
      </p>
    </div>
  );
}
