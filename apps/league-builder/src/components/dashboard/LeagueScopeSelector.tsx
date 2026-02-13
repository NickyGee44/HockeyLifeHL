'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { ChevronDown, Check } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { LeagueLogo } from '@/components/ui/league-logo';
import type { DashboardData } from '@/lib/actions/dashboard';

interface LeagueScopeSelectorProps {
  dashboardData: DashboardData | null;
  collapsed?: boolean;
}

interface FlatLeague {
  id: string;
  name: string;
  slug: string;
  status: string;
  logo_url: string | null;
  primary_color: string | null;
}

export function LeagueScopeSelector({ dashboardData, collapsed = false }: LeagueScopeSelectorProps) {
  const t = useTranslations('navigation');
  const { selected, setSelectedLeague } = useSidebar();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Flatten orgs[].leagues[] into a single list
  const allLeagues: FlatLeague[] = React.useMemo(() => {
    if (!dashboardData?.organizations) return [];
    return dashboardData.organizations.flatMap((org) =>
      org.leagues.map((league) => ({
        id: league.id,
        name: league.name,
        slug: league.slug,
        status: league.status,
        logo_url: league.logo_url,
        primary_color: league.primary_color,
      }))
    );
  }, [dashboardData]);

  // Auto-select first league with active status, or first league overall
  React.useEffect(() => {
    if (selected.leagueId || allLeagues.length === 0) return;
    const activeLeague = allLeagues.find((l) => l.status === 'active');
    setSelectedLeague(activeLeague?.id || allLeagues[0].id);
  }, [allLeagues, selected.leagueId, setSelectedLeague]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLeague = allLeagues.find((l) => l.id === selected.leagueId);

  if (allLeagues.length === 0) return null;

  // Single league — show static text
  if (allLeagues.length === 1) {
    const league = allLeagues[0];
    return (
      <div className={cn('px-3 py-3', collapsed && 'px-0 flex justify-center')}>
        {collapsed ? (
          <div className="relative group">
            <LeagueLogo
              logoUrl={league.logo_url}
              leagueName={league.name}
              primaryColor={league.primary_color || '#22D3EE'}
              size="xs"
              shape="square"
            />
            <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {league.name}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <LeagueLogo
              logoUrl={league.logo_url}
              leagueName={league.name}
              primaryColor={league.primary_color || '#22D3EE'}
              size="sm"
              shape="square"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{league.name}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Multiple leagues — show dropdown
  return (
    <div className={cn('px-3 py-3', collapsed && 'px-1')} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2.5 rounded-lg transition-colors',
          'hover:bg-neutral-800/50 p-1.5',
          collapsed && 'justify-center'
        )}
      >
        {selectedLeague && (
          <LeagueLogo
            logoUrl={selectedLeague.logo_url}
            leagueName={selectedLeague.name}
            primaryColor={selectedLeague.primary_color || '#22D3EE'}
            size={collapsed ? 'xs' : 'sm'}
            shape="square"
          />
        )}
        {!collapsed && selectedLeague && (
          <>
            <span className="text-sm font-semibold text-white truncate flex-1 text-left">
              {selectedLeague.name}
            </span>
            <ChevronDown className={cn('w-4 h-4 text-neutral-500 transition-transform', isOpen && 'rotate-180')} />
          </>
        )}
      </button>

      {isOpen && (
        <div className={cn(
          'absolute z-50 mt-1 py-1 rounded-xl bg-neutral-800 border border-white/10 shadow-lg max-h-64 overflow-y-auto',
          collapsed ? 'left-16 top-14 w-56' : 'left-3 right-3'
        )}>
          <div className="px-3 py-1.5">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {t('switchLeague')}
            </span>
          </div>
          {allLeagues.map((league) => (
            <button
              key={league.id}
              onClick={() => {
                setSelectedLeague(league.id);
                setIsOpen(false);
              }}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors hover:bg-neutral-700',
                league.id === selected.leagueId ? 'text-rink-500' : 'text-neutral-300'
              )}
            >
              <LeagueLogo
                logoUrl={league.logo_url}
                leagueName={league.name}
                primaryColor={league.primary_color || '#22D3EE'}
                size="xs"
                shape="square"
              />
              <span className="text-sm font-medium truncate flex-1">{league.name}</span>
              {league.id === selected.leagueId && (
                <Check className="w-4 h-4 text-rink-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
