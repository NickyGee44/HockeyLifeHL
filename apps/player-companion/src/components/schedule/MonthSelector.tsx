'use client';

import { useMemo } from 'react';
import { cn } from '@hockey-life/ui';
import { format, addMonths, startOfMonth } from 'date-fns';

interface MonthSelectorProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const months = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    return Array.from({ length: 6 }, (_, i) => addMonths(start, i));
  }, []);

  const selectedMonth = startOfMonth(value).getTime();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {months.map((month) => {
        const isActive = startOfMonth(month).getTime() === selectedMonth;
        return (
          <button
            key={month.getTime()}
            onClick={() => onChange(month)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              'touch-action-manipulation active:scale-95',
              isActive
                ? 'bg-gold-500 text-black'
                : 'bg-neutral-850 text-neutral-400 border border-gold-500/20'
            )}
          >
            {format(month, 'MMM')}
          </button>
        );
      })}
    </div>
  );
}
