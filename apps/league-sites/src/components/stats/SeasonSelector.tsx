'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hockey-life/ui/components/select';

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
      // Set view=all-time and remove season param
      params.set('view', 'all-time');
      params.delete('season');
    } else {
      // Set season param and remove view param
      params.set('season', value);
      params.delete('view');
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="season-select" className="text-sm font-medium text-muted-foreground">
        Season:
      </label>
      <Select value={selectedValue} onValueChange={handleSeasonChange}>
        <SelectTrigger id="season-select" className="w-[240px]">
          <SelectValue placeholder="Select season" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all-time">🏆 All-Time Career Stats</SelectItem>
          {seasons.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} {s.status === 'active' && '(Current)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
