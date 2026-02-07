'use client';

import * as React from 'react';

interface SelectedContext {
  organizationId: string | null;
  leagueId: string | null;
  seasonId: string | null;
}

interface ExpandedSections {
  [key: string]: boolean;
}

interface SidebarContextValue {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
  // Selection state
  selected: SelectedContext;
  setSelectedOrganization: (id: string | null) => void;
  setSelectedLeague: (id: string | null) => void;
  setSelectedSeason: (id: string | null) => void;
  // Expanded sections state
  expandedSections: ExpandedSections;
  toggleSection: (sectionId: string) => void;
  setExpandedSection: (sectionId: string, expanded: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [selected, setSelected] = React.useState<SelectedContext>({
    organizationId: null,
    leagueId: null,
    seasonId: null,
  });
  const [expandedSections, setExpandedSections] = React.useState<ExpandedSections>({});

  const toggle = React.useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const setSelectedOrganization = React.useCallback((id: string | null) => {
    setSelected((prev) => ({
      ...prev,
      organizationId: id,
      // Clear league and season when org changes
      leagueId: null,
      seasonId: null,
    }));
  }, []);

  const setSelectedLeague = React.useCallback((id: string | null) => {
    setSelected((prev) => ({
      ...prev,
      leagueId: id,
      // Clear season when league changes
      seasonId: null,
    }));
  }, []);

  const setSelectedSeason = React.useCallback((id: string | null) => {
    setSelected((prev) => ({
      ...prev,
      seasonId: id,
    }));
  }, []);

  const toggleSection = React.useCallback((sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const setExpandedSection = React.useCallback((sectionId: string, expanded: boolean) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: expanded,
    }));
  }, []);

  const value = React.useMemo(
    () => ({
      isCollapsed,
      setIsCollapsed,
      toggle,
      selected,
      setSelectedOrganization,
      setSelectedLeague,
      setSelectedSeason,
      expandedSections,
      toggleSection,
      setExpandedSection,
    }),
    [
      isCollapsed,
      toggle,
      selected,
      setSelectedOrganization,
      setSelectedLeague,
      setSelectedSeason,
      expandedSections,
      toggleSection,
      setExpandedSection,
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
