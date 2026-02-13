'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

interface SelectedContext {
  leagueId: string | null;
  seasonId: string | null;
}

interface SidebarContextValue {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
  // Selection state
  selected: SelectedContext;
  setSelectedLeague: (id: string | null) => void;
  setSelectedSeason: (id: string | null) => void;
  // Mobile nav state
  isMobileNavOpen: boolean;
  toggleMobileNav: () => void;
  isMobileMoreOpen: boolean;
  toggleMobileMore: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined);

/**
 * Extract league ID from the current URL path.
 * Matches: /dashboard/leagues/{uuid}/...
 */
function extractLeagueIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/dashboard\/leagues\/([0-9a-f-]{36})/);
  return match ? match[1] : null;
}

/**
 * Extract season ID from the current URL path.
 * Matches: /dashboard/seasons/{uuid}/... or /dashboard/leagues/.../seasons/{uuid}/...
 */
function extractSeasonIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/seasons\/([0-9a-f-]{36})/);
  return match ? match[1] : null;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [selected, setSelected] = React.useState<SelectedContext>({
    leagueId: null,
    seasonId: null,
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = React.useState(false);

  // Sync selected league/season from URL on every navigation
  React.useEffect(() => {
    const urlLeagueId = extractLeagueIdFromPath(pathname);
    const urlSeasonId = extractSeasonIdFromPath(pathname);

    if (urlLeagueId && urlLeagueId !== selected.leagueId) {
      setSelected((prev) => ({
        ...prev,
        leagueId: urlLeagueId,
        seasonId: urlSeasonId,
      }));
    } else if (urlSeasonId && urlSeasonId !== selected.seasonId) {
      setSelected((prev) => ({
        ...prev,
        seasonId: urlSeasonId,
      }));
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = React.useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const setSelectedLeague = React.useCallback((id: string | null) => {
    setSelected((prev) => ({
      ...prev,
      leagueId: id,
      seasonId: null,
    }));
  }, []);

  const setSelectedSeason = React.useCallback((id: string | null) => {
    setSelected((prev) => ({
      ...prev,
      seasonId: id,
    }));
  }, []);

  const toggleMobileNav = React.useCallback(() => {
    setIsMobileNavOpen((prev) => !prev);
  }, []);

  const toggleMobileMore = React.useCallback(() => {
    setIsMobileMoreOpen((prev) => !prev);
  }, []);

  const value = React.useMemo(
    () => ({
      isCollapsed,
      setIsCollapsed,
      toggle,
      selected,
      setSelectedLeague,
      setSelectedSeason,
      isMobileNavOpen,
      toggleMobileNav,
      isMobileMoreOpen,
      toggleMobileMore,
    }),
    [
      isCollapsed,
      toggle,
      selected,
      setSelectedLeague,
      setSelectedSeason,
      isMobileNavOpen,
      toggleMobileNav,
      isMobileMoreOpen,
      toggleMobileMore,
    ]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
