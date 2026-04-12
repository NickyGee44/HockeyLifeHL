import {
  Calendar,
  Plus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { buildDashboardNavigation, getDashboardPrimaryItems } from './navigation';

export interface CommandPaletteEntry {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface BuildCommandPaletteEntriesParams {
  t: (key: string) => string;
  leagueId?: string | null;
  seasonId?: string | null;
}

export function buildCommandPalettePages({
  t,
  leagueId,
  seasonId,
}: BuildCommandPaletteEntriesParams): CommandPaletteEntry[] {
  const navigation = buildDashboardNavigation({
    locale: '',
    leagueId,
    seasonId,
    isSubscribed: true,
    captainTeams: [],
    isPlatformAdmin: false,
    t: t as (key: string) => string,
  });

  const organizationPages = getDashboardPrimaryItems('organization', navigation);
  const scopedPages = seasonId
    ? getDashboardPrimaryItems('season', navigation)
    : leagueId
      ? getDashboardPrimaryItems('league', navigation)
      : [];

  return [...organizationPages, ...scopedPages].map((item) => ({
    label: item.label,
    href: item.href,
    icon: item.icon,
  }));
}

export function buildCommandPaletteActions({
  t,
  leagueId,
}: Omit<BuildCommandPaletteEntriesParams, 'seasonId'>): CommandPaletteEntry[] {
  const leagueBase = leagueId ? `/dashboard/leagues/${leagueId}` : null;

  return [
    { label: t('actions.createLeague'), icon: Plus, href: '/dashboard/leagues/new' },
    ...(leagueBase
      ? [
          { label: t('actions.addTeam'), icon: Users, href: `${leagueBase}/teams/new` },
          { label: t('actions.newSeason'), icon: Calendar, href: `${leagueBase}/seasons/new` },
        ]
      : []),
  ];
}

