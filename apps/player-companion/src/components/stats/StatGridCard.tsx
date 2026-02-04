'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@hockey-life/ui';

interface StatGridCardProps {
  value: number;
  label: string;
  trend?: number;
  className?: string;
}

export function StatGridCard({ value, label, trend, className }: StatGridCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-neutral-850 border border-gold-500/20 p-4 text-center',
        className
      )}
    >
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mt-1">
        {label}
      </p>
      {trend !== undefined && trend !== 0 && (
        <div className="flex items-center justify-center gap-1 mt-2">
          {trend > 0 ? (
            <ArrowUp className="w-3 h-3 text-green-500" />
          ) : (
            <ArrowDown className="w-3 h-3 text-red-500" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              trend > 0 ? 'text-green-500' : 'text-red-500'
            )}
          >
            {Math.abs(trend)}
          </span>
        </div>
      )}
    </div>
  );
}
