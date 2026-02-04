'use client';

import { createContext, useContext } from 'react';
import type { LeagueBranding } from '@/lib/types';

const LeagueContext = createContext<LeagueBranding | null>(null);

export function LeagueProvider({
  league,
  children,
}: {
  league: LeagueBranding;
  children: React.ReactNode;
}) {
  return (
    <LeagueContext.Provider value={league}>{children}</LeagueContext.Provider>
  );
}

export function useLeague() {
  const context = useContext(LeagueContext);
  if (!context) {
    throw new Error('useLeague must be used within a LeagueProvider');
  }
  return context;
}
