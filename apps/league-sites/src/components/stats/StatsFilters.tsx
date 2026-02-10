'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDivisionFilter } from '@/components/DivisionFilterProvider';

interface StatsFiltersProps {
  leagueSlug: string;
}

export function StatsFilters({ leagueSlug }: StatsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { divisions, selectedDivisionId, setDivision } = useDivisionFilter();
  const prevDivisionRef = useRef<string | null | undefined>(undefined);

  // Sync global division filter → URL param so server-side query picks it up
  useEffect(() => {
    if (prevDivisionRef.current === undefined) {
      prevDivisionRef.current = searchParams.get('division') || null;
      return;
    }
    if (prevDivisionRef.current === selectedDivisionId) return;
    prevDivisionRef.current = selectedDivisionId;

    const params = new URLSearchParams(searchParams.toString());
    if (selectedDivisionId) {
      params.set('division', selectedDivisionId);
    } else {
      params.delete('division');
    }
    const qs = params.toString();
    router.push(qs ? `/${leagueSlug}/stats?${qs}` : `/${leagueSlug}/stats`);
  }, [selectedDivisionId, searchParams, router, leagueSlug]);

  if (divisions.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <select
        value={selectedDivisionId || ''}
        onChange={(e) => setDivision(e.target.value || null)}
        className="
          px-4 py-2 rounded-lg
          bg-[var(--color-surface-hover)] border border-[var(--color-border)]
          text-[var(--color-text-primary)] text-sm
          focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50
          cursor-pointer transition-all duration-200
          hover:border-[var(--league-primary)]/50
        "
        style={selectedDivisionId ? {
          borderColor: 'var(--league-primary)',
          backgroundColor: 'color-mix(in srgb, var(--league-primary) 8%, var(--color-surface-hover))',
        } : undefined}
      >
        <option value="">All Divisions</option>
        {divisions.map((div) => (
          <option key={div.id} value={div.id}>{div.name}</option>
        ))}
      </select>
    </div>
  );
}
