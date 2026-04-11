import {
  Calendar,
  CreditCard,
  Database,
  Dices,
  Home,
  Newspaper,
  Palette,
  Plus,
  Settings,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { buildSeasonWorkspaceHref } from './workspace-routes';

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
  const leagueBase = leagueId ? `/dashboard/leagues/${leagueId}` : null;

  const orgPages: CommandPaletteEntry[] = [
    { label: t('pages.overview'), icon: Home, href: '/dashboard' },
    { label: t('pages.leagues'), icon: Users, href: '/dashboard/leagues' },
    { label: 'Staff Pool', icon: User, href: '/dashboard/staff' },
    { label: t('pages.settings'), icon: Settings, href: '/dashboard/settings' },
  ];

  if (!leagueBase) {
    return orgPages;
  }

  if (!seasonId) {
    return [
      ...orgPages,
      { label: 'League Overview', icon: Home, href: leagueBase },
      { label: t('pages.seasons'), icon: Calendar, href: `${leagueBase}/seasons` },
      { label: t('pages.billing'), icon: CreditCard, href: `${leagueBase}/finance` },
      { label: 'League Settings', icon: Settings, href: `${leagueBase}/settings` },
      { label: 'League Website', icon: Palette, href: `${leagueBase}/website` },
      { label: t('pages.news'), icon: Newspaper, href: `${leagueBase}/news` },
      { label: 'Migration Center', icon: Database, href: `${leagueBase}/migration-center` },
    ];
  }

  const resolvedLeagueId = leagueId as string;
  const resolvedSeasonId = seasonId as string;

  return [
    ...orgPages,
    { label: 'League Overview', icon: Home, href: leagueBase },
    { label: 'Season Overview', icon: Home, href: buildSeasonWorkspaceHref('', resolvedLeagueId, resolvedSeasonId) },
    { label: t('pages.registration'), icon: User, href: buildSeasonWorkspaceHref('', resolvedLeagueId, resolvedSeasonId, 'registrations') },
    { label: t('pages.teamsAndDivisions'), icon: Users, href: buildSeasonWorkspaceHref('', resolvedLeagueId, resolvedSeasonId, 'teams') },
    { label: t('pages.schedule'), icon: Calendar, href: buildSeasonWorkspaceHref('', resolvedLeagueId, resolvedSeasonId, 'schedule') },
    { label: 'Games', icon: Trophy, href: buildSeasonWorkspaceHref('', resolvedLeagueId, resolvedSeasonId, 'games') },
    { label: t('pages.standings'), icon: Trophy, href: buildSeasonWorkspaceHref('', resolvedLeagueId, resolvedSeasonId, 'standings') },
    { label: 'Playoffs', icon: Trophy, href: buildSeasonWorkspaceHref('', resolvedLeagueId, resolvedSeasonId, 'playoffs') },
    { label: t('pages.draftRoom'), icon: Dices, href: buildSeasonWorkspaceHref('', resolvedLeagueId, resolvedSeasonId, 'draft') },
    { label: 'Edit Season', icon: Settings, href: buildSeasonWorkspaceHref('', resolvedLeagueId, resolvedSeasonId, 'settings') },
    { label: 'League Settings', icon: Settings, href: `${leagueBase}/settings` },
  ];
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

