import type * as React from 'react';
import {
  Award,
  BarChart3,
  Bug,
  Building2,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Dices,
  FileText,
  Flag,
  Globe,
  Handshake,
  Home,
  Image,
  Mail,
  Newspaper,
  PartyPopper,
  Settings,
  Shield,
  Shuffle,
  Star,
  Trophy,
  UserCircle2,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import type { CaptainTeamOverview } from '@/lib/actions/captain';
import {
  type DashboardWorkspaceScope,
  buildDashboardHomeHref,
  buildEquivalentSeasonWorkspaceHref,
  buildLeagueHubHref,
  buildLeagueSeasonsHref,
  buildSeasonWorkspaceHref,
} from './workspace-routes';

type TranslationFn = (key: string) => string;

export type DashboardNavigationScope =
  | DashboardWorkspaceScope
  | 'support'
  | 'captain'
  | 'admin';

type DashboardIcon = React.ComponentType<{ className?: string }>;

export interface DashboardNavigationItem {
  kind: 'item';
  id: string;
  label: string;
  href: string;
  icon: DashboardIcon;
  scope: DashboardNavigationScope;
  matchPrefixes: string[];
  locked?: boolean;
  badge?: number;
}

export interface DashboardNavigationGroup {
  kind: 'group';
  id: string;
  label: string;
  icon: DashboardIcon;
  scope: DashboardNavigationScope;
  items: DashboardNavigationItem[];
}

export interface DashboardNavigationSection {
  id: string;
  label: string;
  scope: DashboardNavigationScope;
  entries: Array<DashboardNavigationItem | DashboardNavigationGroup>;
}

interface DashboardNavigationBuilderParams {
  locale: string;
  leagueId?: string | null;
  seasonId?: string | null;
  isSubscribed: boolean;
  captainTeams: CaptainTeamOverview[];
  isPlatformAdmin: boolean;
  t: TranslationFn;
}

interface DashboardMobileTabItem {
  id: string;
  label: string;
  href: string;
  icon: DashboardIcon;
}

const PRIMARY_ITEM_IDS_BY_SCOPE: Record<DashboardWorkspaceScope, string[]> = {
  season: ['season-home', 'season-registrations', 'season-teams-item', 'season-schedule-item', 'season-games'],
  league: ['league-home', 'league-current-season', 'league-setup-overview', 'league-website-overview', 'league-finance-home'],
  organization: ['org-home', 'org-leagues', 'org-staff', 'org-settings'],
};

const DEFAULT_SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  leagues: 'Leagues',
  seasons: 'Seasons',
  playoffs: 'Playoffs',
  'migration-center': 'Migration Center',
  integrations: 'Integrations',
  finance: 'Financials',
  staff: 'Staff',
  players: 'Players',
  rosters: 'Rosters',
  standings: 'Standings',
  ratings: 'Ratings',
  eligibility: 'Eligibility',
  draft: 'Draft Room',
  edit: 'Edit Season',
  games: 'Games',
  teams: 'Teams',
};

const TRANSLATED_SEGMENT_KEYS: Record<string, string> = {
  settings: 'settings',
  billing: 'billing',
  website: 'websiteEditor',
  registrations: 'registration',
  schedule: 'schedule',
  news: 'news',
  pages: 'pages',
  sponsors: 'sponsors',
  awards: 'awards',
  gallery: 'gallery',
  events: 'events',
  'contact-inbox': 'contactInbox',
  bugs: 'bugReports',
  'scorekeeper-schedule': 'scorekeeperSchedule',
  scorekeepers: 'scorekeeperSchedule',
  venues: 'venues',
  waiver: 'waiver',
  'goalie-pool': 'goaliePool',
  'email-domain': 'emailDomain',
};

function stripLocaleFromPathname(pathname: string, locale: string) {
  if (pathname === `/${locale}`) {
    return '/';
  }

  return pathname.startsWith(`/${locale}`) ? pathname.slice(locale.length + 1) : pathname;
}

function createItem(
  id: string,
  label: string,
  href: string,
  icon: DashboardIcon,
  scope: DashboardNavigationScope,
  options?: {
    matchPrefixes?: string[];
    locked?: boolean;
    badge?: number;
  }
): DashboardNavigationItem {
  return {
    kind: 'item',
    id,
    label,
    href,
    icon,
    scope,
    matchPrefixes: options?.matchPrefixes ?? [href],
    locked: options?.locked,
    badge: options?.badge,
  };
}

function getLeafItems(
  entries: Array<DashboardNavigationItem | DashboardNavigationGroup>
): DashboardNavigationItem[] {
  return entries.flatMap((entry) =>
    entry.kind === 'group' ? entry.items : [entry]
  );
}

export function buildDashboardNavigation({
  locale,
  leagueId,
  seasonId,
  isSubscribed,
  captainTeams,
  isPlatformAdmin,
  t,
}: DashboardNavigationBuilderParams): DashboardNavigationSection[] {
  const organizationEntries: Array<DashboardNavigationItem | DashboardNavigationGroup> = [
    createItem('org-home', 'Dashboard', buildDashboardHomeHref(locale), Home, 'organization'),
    createItem('org-leagues', t('leagues') || 'Leagues', '/dashboard/leagues', Building2, 'organization'),
    createItem('org-staff', t('staffPool') || 'Staff Pool', '/dashboard/staff', Flag, 'organization'),
    createItem('org-settings', 'Organization Settings', '/dashboard/settings', Settings, 'organization'),
  ];

  if (isPlatformAdmin) {
    organizationEntries.push(
      createItem('admin-home', 'Admin Dashboard', '/dashboard/admin', Zap, 'admin')
    );
  }

  const sections: DashboardNavigationSection[] = [
    {
      id: 'organization',
      label: t('organization') || 'Organization',
      scope: 'organization',
      entries: organizationEntries,
    },
  ];

  if (leagueId) {
    const leagueHub = buildLeagueHubHref(locale, leagueId);
    const currentSeasonHref = seasonId
      ? buildSeasonWorkspaceHref(locale, leagueId, seasonId)
      : buildLeagueSeasonsHref(locale, leagueId);
    const leagueEntries: Array<DashboardNavigationItem | DashboardNavigationGroup> = [
      createItem('league-home', 'League Home', leagueHub, Home, 'league'),
      createItem('league-current-season', 'Current Season', currentSeasonHref, CalendarDays, 'league', {
        matchPrefixes: seasonId
          ? [
              buildSeasonWorkspaceHref(locale, leagueId, seasonId),
              `${leagueHub}/seasons`,
            ]
          : [buildLeagueSeasonsHref(locale, leagueId)],
      }),
      {
        kind: 'group',
        id: 'league-setup',
        label: 'League Setup',
        icon: Users,
        scope: 'league',
        items: [
          createItem('league-setup-overview', 'Teams & Divisions', `${leagueHub}/teams-divisions`, Users, 'league', {
            matchPrefixes: [`${leagueHub}/teams-divisions`, `${leagueHub}/divisions`, `${leagueHub}/teams`],
          }),
          createItem('league-staff', t('staff') || 'Staff', `${leagueHub}/staff`, Flag, 'league', { locked: !isSubscribed }),
          createItem('league-game-rules', t('gameRules') || 'Game Rules', `${leagueHub}/settings/game-rules`, ClipboardCheck, 'league', { locked: !isSubscribed }),
          createItem('league-registration', t('registration') || 'Registration', `${leagueHub}/settings/registration`, ClipboardCheck, 'league', { locked: !isSubscribed }),
          createItem('league-waiver', t('waiver') || 'Waiver', `${leagueHub}/settings/waiver`, FileText, 'league', { locked: !isSubscribed }),
          createItem('league-venues', t('venues') || 'Venues', `${leagueHub}/settings/venues`, Globe, 'league', { locked: !isSubscribed }),
          createItem('league-goalie-pool', t('goaliePool') || 'Goalie Pool', `${leagueHub}/settings/goalie-pool`, UserCircle2, 'league', { locked: !isSubscribed }),
        ],
      },
      {
        kind: 'group',
        id: 'league-website-content',
        label: 'Website & Content',
        icon: Globe,
        scope: 'league',
        items: [
          createItem('league-website-overview', t('websiteEditor') || 'Website', `${leagueHub}/website`, Globe, 'league', {
            locked: !isSubscribed,
          }),
          createItem('league-news', t('news') || 'News', `${leagueHub}/news`, Newspaper, 'league', { locked: !isSubscribed }),
          createItem('league-pages', t('pages') || 'Pages', `${leagueHub}/pages`, FileText, 'league', { locked: !isSubscribed }),
          createItem('league-sponsors', t('sponsors') || 'Sponsors', `${leagueHub}/sponsors`, Handshake, 'league', { locked: !isSubscribed }),
          createItem('league-gallery', t('gallery') || 'Gallery', `${leagueHub}/gallery`, Image, 'league', { locked: !isSubscribed }),
          createItem('league-events', t('events') || 'Events', `${leagueHub}/events`, PartyPopper, 'league', { locked: !isSubscribed }),
          createItem('league-awards', t('awards') || 'Awards', `${leagueHub}/awards`, Award, 'league', { locked: !isSubscribed }),
          createItem('league-contact-inbox', t('contactInbox') || 'Contact Inbox', `${leagueHub}/contact-inbox`, Mail, 'support', { locked: !isSubscribed }),
        ],
      },
      {
        kind: 'group',
        id: 'league-finance',
        label: 'Finance',
        icon: Wallet,
        scope: 'league',
        items: [
          createItem('league-finance-home', 'Finance Overview', `${leagueHub}/finance`, Wallet, 'league', {
            matchPrefixes: [`${leagueHub}/finance`, `${leagueHub}/payments`],
            locked: !isSubscribed,
          }),
          createItem('league-billing', t('leagueBilling') || 'League Billing', `${leagueHub}/billing`, CreditCard, 'league'),
          createItem('league-integrations', 'Integrations', `${leagueHub}/integrations`, Zap, 'league'),
        ],
      },
      {
        kind: 'group',
        id: 'league-settings',
        label: 'Settings',
        icon: Settings,
        scope: 'league',
        items: [
          createItem('league-settings-home', t('leagueSettings') || 'League Settings', `${leagueHub}/settings`, Settings, 'league', { locked: !isSubscribed }),
          createItem('league-general', t('general') || 'General', `${leagueHub}/settings/general`, Settings, 'league', { locked: !isSubscribed }),
          createItem('league-email-domain', t('emailDomain') || 'Email Domain', `${leagueHub}/settings/email-domain`, Mail, 'league', { locked: !isSubscribed }),
          createItem('league-bugs', t('bugReports') || 'Bug Reports', `${leagueHub}/bugs`, Bug, 'support'),
        ],
      },
    ];

    sections.unshift({
      id: 'league',
      label: 'League',
      scope: 'league',
      entries: leagueEntries,
    });

  }

  if (leagueId && seasonId) {
    const seasonHome = buildSeasonWorkspaceHref(locale, leagueId, seasonId);
    const seasonEntries: Array<DashboardNavigationItem | DashboardNavigationGroup> = [
      createItem('season-home', 'Season Overview', seasonHome, Home, 'season', { locked: !isSubscribed }),
      createItem('season-registrations', t('registration') || 'Registration', buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'registrations'), ClipboardCheck, 'season', {
        locked: !isSubscribed,
      }),
      createItem('season-teams-item', t('teams') || 'Teams', buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'teams'), Users, 'season', {
        matchPrefixes: [
          buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'teams'),
          buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'players'),
          buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'rosters'),
        ],
        locked: !isSubscribed,
      }),
      {
        kind: 'group',
        id: 'season-core',
        label: 'Season Play',
        icon: Calendar,
        scope: 'season',
        items: [
          createItem('season-schedule-item', t('schedule') || 'Schedule', buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'schedule'), Calendar, 'season', { locked: !isSubscribed }),
          createItem('season-games', 'Games', buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'games'), Trophy, 'season', { locked: !isSubscribed }),
          createItem('season-standings', 'Standings', buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'standings'), BarChart3, 'season', { locked: !isSubscribed }),
          createItem('season-playoffs', 'Playoffs', buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'playoffs'), Trophy, 'season', { locked: !isSubscribed }),
          createItem('season-draft', 'Draft Room', buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'draft'), Shuffle, 'season', { locked: !isSubscribed }),
        ],
      },
      {
        kind: 'group',
        id: 'season-tools',
        label: 'Season Tools',
        icon: Dices,
        scope: 'season',
        items: [
          createItem('season-scorekeepers', t('scorekeeperSchedule') || 'Scorekeeper Schedule', buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'scorekeepers'), ClipboardList, 'season', {
            locked: !isSubscribed,
          }),
          createItem('season-ratings', 'Ratings', buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'ratings'), Star, 'season', { locked: !isSubscribed }),
          createItem('season-eligibility', 'Eligibility', buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'eligibility'), Shield, 'season', { locked: !isSubscribed }),
          createItem('season-settings', 'Edit Season', buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'settings'), Settings, 'season', {
            matchPrefixes: [buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'settings')],
            locked: !isSubscribed,
          }),
        ],
      },
    ];

    sections.unshift({
      id: 'season',
      label: 'Season Workspace',
      scope: 'season',
      entries: seasonEntries,
    });
  }

  if (captainTeams.length > 0) {
    sections.push({
      id: 'captain',
      label: 'Captain',
      scope: 'captain',
      entries: captainTeams.map((team) =>
        createItem(
          `captain-${team.id}`,
          team.short_name,
          `/dashboard/captain/${team.id}`,
          Shield,
          'captain',
          { badge: team.pending_requests_count }
        )
      ),
    });
  }

  return sections.filter((section) => section.entries.length > 0);
}

export function flattenDashboardNavigation(
  sections: DashboardNavigationSection[]
): DashboardNavigationItem[] {
  return sections.flatMap((section) => getLeafItems(section.entries));
}

export function isDashboardNavigationItemActive(
  item: DashboardNavigationItem,
  pathname: string,
  locale: string
) {
  const normalizedPath = stripLocaleFromPathname(pathname, locale);

  return item.matchPrefixes.some((prefix) => {
    if (prefix === '/dashboard') {
      return normalizedPath === prefix || normalizedPath === '/tableau-de-bord';
    }

    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`) || normalizedPath.startsWith(`${prefix}?`);
  });
}

export function getDashboardAutoExpandedGroups(
  pathname: string,
  locale: string,
  sections: DashboardNavigationSection[]
) {
  const expanded = new Set<string>();

  for (const section of sections) {
    for (const entry of section.entries) {
      if (entry.kind !== 'group') {
        continue;
      }

      if (entry.items.some((item) => isDashboardNavigationItemActive(item, pathname, locale))) {
        expanded.add(entry.id);
      }
    }
  }

  return expanded;
}

export function getDashboardMobileTabs(
  scope: DashboardWorkspaceScope,
  sections: DashboardNavigationSection[]
): DashboardMobileTabItem[] {
  const allItems = flattenDashboardNavigation(sections);
  const itemMap = new Map(allItems.map((item) => [item.id, item]));

  return PRIMARY_ITEM_IDS_BY_SCOPE[scope]
    .map((id) => itemMap.get(id))
    .filter((item): item is DashboardNavigationItem => Boolean(item))
    .map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      icon: item.icon,
    }));
}

export function getDashboardSegmentLabel(segment: string, t: TranslationFn) {
  const translationKey = TRANSLATED_SEGMENT_KEYS[segment];
  if (translationKey) {
    return t(translationKey);
  }

  return DEFAULT_SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

export function getDashboardContextSwitchHref(params: {
  locale: string;
  pathname: string;
  currentLeagueId: string | null;
  targetLeagueId: string;
  preferredSeasonId?: string | null;
}) {
  const normalizedPath = stripLocaleFromPathname(params.pathname, params.locale);
  const targetLeagueBase = buildLeagueHubHref(params.locale, params.targetLeagueId);

  if (!params.currentLeagueId) {
    return params.preferredSeasonId
      ? buildSeasonWorkspaceHref(params.locale, params.targetLeagueId, params.preferredSeasonId)
      : targetLeagueBase;
  }

  const currentLeagueBase = buildLeagueHubHref('', params.currentLeagueId);
  const targetLeagueBaseWithoutLocale = buildLeagueHubHref('', params.targetLeagueId);

  if (normalizedPath.startsWith(`${currentLeagueBase}/seasons/`)) {
    return params.preferredSeasonId
      ? buildEquivalentSeasonWorkspaceHref({
          locale: params.locale,
          leagueId: params.targetLeagueId,
          seasonId: params.preferredSeasonId,
          pathname: normalizedPath.replace(currentLeagueBase, targetLeagueBaseWithoutLocale),
        })
      : targetLeagueBase;
  }

  if (normalizedPath === currentLeagueBase || normalizedPath.startsWith(`${currentLeagueBase}/`)) {
    return `${localePrefix(params.locale)}${normalizedPath.replace(currentLeagueBase, targetLeagueBaseWithoutLocale)}`;
  }

  return params.preferredSeasonId
    ? buildSeasonWorkspaceHref(params.locale, params.targetLeagueId, params.preferredSeasonId)
    : targetLeagueBase;
}

function localePrefix(locale: string) {
  return locale ? `/${locale}` : '';
}

export function getDashboardSectionAccent(scope: DashboardNavigationScope) {
  switch (scope) {
    case 'season':
      return 'text-rink-300';
    case 'league':
      return 'text-arena-300';
    case 'organization':
      return 'text-neutral-300';
    case 'support':
      return 'text-amber-300';
    case 'captain':
      return 'text-violet-300';
    case 'admin':
      return 'text-rose-300';
    default:
      return 'text-neutral-300';
  }
}

export function getDashboardSectionItems(section: DashboardNavigationSection) {
  return getLeafItems(section.entries);
}

export function getDashboardPrimaryItems(
  scope: DashboardWorkspaceScope,
  sections: DashboardNavigationSection[]
) {
  const allItems = flattenDashboardNavigation(sections);
  const itemMap = new Map(allItems.map((item) => [item.id, item]));

  return PRIMARY_ITEM_IDS_BY_SCOPE[scope]
    .map((id) => itemMap.get(id))
    .filter((item): item is DashboardNavigationItem => Boolean(item));
}
