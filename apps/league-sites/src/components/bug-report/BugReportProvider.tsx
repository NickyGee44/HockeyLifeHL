'use client';

import React from 'react';
import { getBugReportCollector } from '@/lib/bug-report-collector';

interface BugReportContextValue {
  collector: ReturnType<typeof getBugReportCollector>;
  leagueId: string;
  seasonId?: string | null;
  teamId?: string | null;
}

const BugReportContext = React.createContext<BugReportContextValue | null>(null);

interface BugReportProviderProps {
  children: React.ReactNode;
  leagueId: string;
  seasonId?: string | null;
  teamId?: string | null;
}

export function BugReportProvider({
  children,
  leagueId,
  seasonId,
  teamId,
}: BugReportProviderProps) {
  const collector = React.useMemo(() => getBugReportCollector(), []);

  React.useEffect(() => {
    collector.init();
  }, [collector]);

  return (
    <BugReportContext.Provider value={{ collector, leagueId, seasonId, teamId }}>
      {children}
    </BugReportContext.Provider>
  );
}

export function useBugReportContext() {
  const ctx = React.useContext(BugReportContext);
  if (!ctx) {
    throw new Error('useBugReportContext must be used inside BugReportProvider');
  }
  return ctx;
}
