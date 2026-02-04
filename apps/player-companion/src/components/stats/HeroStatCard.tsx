'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@hockey-life/ui';

interface HeroStatCardProps {
  value: number;
  label: string;
  trend?: number;
  trendLabel?: string;
  className?: string;
}

export function HeroStatCard({
  value,
  label,
  trend,
  trendLabel = 'from last season',
  className,
}: HeroStatCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-gradient-to-br from-neutral-850 to-neutral-900',
        'border border-gold-500/30 p-6',
        className
      )}
    >
      <span className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
        {label}
      </span>
      <p className="text-5xl font-black text-gradient-gold mt-2">{value}</p>
      {trend !== undefined && (
        <div className="flex items-center gap-1.5 mt-2">
          {trend >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              trend >= 0 ? 'text-green-500' : 'text-red-500'
            )}
          >
            {trend >= 0 ? '+' : ''}
            {trend}
          </span>
          <span className="text-sm text-neutral-500">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
