'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

export type NavigationScope = 'org' | 'league' | 'season';

interface AppSidebarContextValue {
  // IDs extracted from URL
  orgId: string | null;
  leagueId: string | null;
  seasonId: string | null;
  // Derived scope
  scope: NavigationScope;
  // Collapsible group state
  expandedGroups: Set<string>;
  toggleGroup: (groupId: string) => void;
  // Mobile sidebar
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
}

const AppSidebarContext = React.createContext<AppSidebarContextValue | undefined>(undefined);

/**
 * Extract league ID from the current URL path.
 * Matches: /dashboard/leagues/{uuid}/...
 */
function extractLeagueIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/dashboard\/leagues\/([0-9a-f-]{36})/i);
  return match ? match[1] : null;
}

/**
 * Extract season ID from the current URL path.
 * Matches: /dashboard/leagues/.../seasons/{uuid}/...
 */
function extractSeasonIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/seasons\/([0-9a-f-]{36})/i);
  return match ? match[1] : null;
}

/**
 * Determine the navigation scope from the URL.
 */
function deriveScope(leagueId: string | null, seasonId: string | null): NavigationScope {
  if (seasonId) return 'season';
  if (leagueId) return 'league';
  return 'org';
}

export function AppSidebarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [isMobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  // Extract IDs from URL
  const leagueId = React.useMemo(() => extractLeagueIdFromPath(pathname), [pathname]);
  const seasonId = React.useMemo(() => extractSeasonIdFromPath(pathname), [pathname]);
  const scope = React.useMemo(() => deriveScope(leagueId, seasonId), [leagueId, seasonId]);

  // Auto-expand groups when navigating to a child page
  React.useEffect(() => {
    const path = pathname.replace(/^\/[a-z]{2}/, ''); // strip locale
    const autoExpand = new Set<string>();

    if (path.includes('/news') || path.includes('/pages') || path.includes('/sponsors') ||
        path.includes('/gallery') || path.includes('/events') || path.includes('/awards')) {
      autoExpand.add('content');
    }
    if (path.includes('/payments') || path.includes('/billing')) {
      autoExpand.add('financials');
    }
    if (path.includes('/settings/')) {
      autoExpand.add('league-settings');
    }

    if (autoExpand.size > 0) {
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        for (const g of autoExpand) next.add(g);
        return next;
      });
    }
  }, [pathname]);

  // Close mobile sidebar on navigation
  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  const toggleGroup = React.useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const toggleMobileSidebar = React.useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  const value = React.useMemo(
    () => ({
      orgId: null, // future: extract org from URL or context
      leagueId,
      seasonId,
      scope,
      expandedGroups,
      toggleGroup,
      isMobileSidebarOpen,
      setMobileSidebarOpen,
      toggleMobileSidebar,
    }),
    [leagueId, seasonId, scope, expandedGroups, toggleGroup, isMobileSidebarOpen, toggleMobileSidebar]
  );

  return (
    <AppSidebarContext.Provider value={value}>
      {children}
    </AppSidebarContext.Provider>
  );
}

export function useAppSidebar() {
  const context = React.useContext(AppSidebarContext);
  if (context === undefined) {
    throw new Error('useAppSidebar must be used within an AppSidebarProvider');
  }
  return context;
}
