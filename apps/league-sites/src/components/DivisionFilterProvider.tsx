'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Division } from '@/lib/types';

interface DivisionFilterContextValue {
  /** All available divisions for this league */
  divisions: Division[];
  /** Currently selected division ID, or null for "All Divisions" */
  selectedDivisionId: string | null;
  /** The selected division object, or null */
  selectedDivision: Division | null;
  /** Set the active division filter (null = all) */
  setDivision: (divisionId: string | null) => void;
  /** Filter an array of items by the selected division */
  filterByDivision: <T>(items: T[], getDivisionId: (item: T) => string | null | undefined) => T[];
}

const DivisionFilterContext = createContext<DivisionFilterContextValue>({
  divisions: [],
  selectedDivisionId: null,
  selectedDivision: null,
  setDivision: () => {},
  filterByDivision: (items) => items,
});

export function useDivisionFilter() {
  return useContext(DivisionFilterContext);
}

interface DivisionFilterProviderProps {
  children: React.ReactNode;
  divisions: Division[];
  leagueId: string;
}

const STORAGE_KEY_PREFIX = 'hl-division-filter-';

export function DivisionFilterProvider({ children, divisions, leagueId }: DivisionFilterProviderProps) {
  const searchParams = useSearchParams();
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // On mount: URL param takes priority over localStorage.
  // This ensures deep links like /bmhl/scores?division=abc work correctly
  // and are not overwritten by a stale localStorage value.
  useEffect(() => {
    const storageKey = STORAGE_KEY_PREFIX + leagueId;
    const urlDivision = searchParams.get('division');

    if (urlDivision && divisions.some((d) => d.id === urlDivision)) {
      // URL param wins — also persist it to localStorage for future visits
      setSelectedDivisionId(urlDivision);
      localStorage.setItem(storageKey, urlDivision);
    } else {
      // No valid URL param — fall back to localStorage
      const stored = localStorage.getItem(storageKey);
      if (stored && divisions.some((d) => d.id === stored)) {
        setSelectedDivisionId(stored);
      }
    }
    setMounted(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once on mount
  }, [leagueId, divisions]);

  const setDivision = useCallback(
    (divisionId: string | null) => {
      const storageKey = STORAGE_KEY_PREFIX + leagueId;
      setSelectedDivisionId(divisionId);
      if (divisionId) {
        localStorage.setItem(storageKey, divisionId);
      } else {
        localStorage.removeItem(storageKey);
      }
    },
    [leagueId],
  );

  const selectedDivision = selectedDivisionId
    ? divisions.find((d) => d.id === selectedDivisionId) ?? null
    : null;

  const filterByDivision = useCallback(
    <T,>(items: T[], getDivisionId: (item: T) => string | null | undefined): T[] => {
      if (!selectedDivisionId) return items;
      return items.filter((item) => getDivisionId(item) === selectedDivisionId);
    },
    [selectedDivisionId],
  );

  // Don't filter until mounted (avoid hydration mismatch - show all initially)
  const value: DivisionFilterContextValue = {
    divisions,
    selectedDivisionId: mounted ? selectedDivisionId : null,
    selectedDivision: mounted ? selectedDivision : null,
    setDivision,
    filterByDivision: mounted ? filterByDivision : (items) => items,
  };

  return (
    <DivisionFilterContext.Provider value={value}>
      {children}
    </DivisionFilterContext.Provider>
  );
}
