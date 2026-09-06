'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Season {
  id: string;
  name: string;
  status: string;
}

interface SeasonSelectorProps {
  seasons: Season[];
  currentSeasonId?: string;
}

export function SeasonSelector({ seasons, currentSeasonId }: SeasonSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Determine current selection from URL params
  const view = searchParams.get('view');
  const season = searchParams.get('season');
  const selectedValue = view === 'all-time' ? 'all-time' : season || currentSeasonId || '';

  const handleSeasonChange = (value: string) => {
    const params = new URLSearchParams(searchParams);

    if (value === 'all-time') {
      params.set('view', 'all-time');
      params.delete('season');
    } else {
      params.set('season', value);
      params.delete('view');
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="glass-control flex items-center gap-2 rounded-xl p-1">
      <label htmlFor="season-select" className="text-sm font-medium text-[var(--color-text-secondary)]">
        Season:
      </label>
      <select
        id="season-select"
        value={selectedValue}
        onChange={(e) => handleSeasonChange(e.target.value)}
        className="min-h-11 w-[240px] appearance-none rounded-xl border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 cursor-pointer"
      >
        <option value="all-time">All-Time Career Stats</option>
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} {s.status === 'active' ? '(Current)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
