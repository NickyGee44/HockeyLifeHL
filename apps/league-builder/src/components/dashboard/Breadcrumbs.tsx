'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ChevronRight } from 'lucide-react';
import type { DashboardData } from '@/lib/actions/dashboard';
import {
  ACTIVE_SEASON_WORKSPACE_COOKIE,
  parseActiveSeasonWorkspaceCookie,
} from '@/lib/dashboard/workspace-cookie';

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface BreadcrumbsProps {
  dashboardData: DashboardData | null;
}

export function Breadcrumbs({ dashboardData }: BreadcrumbsProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('navigation');
  const [storedSeasonNames, setStoredSeasonNames] = React.useState<Map<string, string>>(new Map());

  React.useEffect(() => {
    const raw = document.cookie
      .split('; ')
      .find((item) => item.startsWith(`${ACTIVE_SEASON_WORKSPACE_COOKIE}=`))
      ?.split('=')
      .slice(1)
      .join('=');

    const parsed = parseActiveSeasonWorkspaceCookie(raw);
    const next = new Map<string, string>();

    for (const [leagueId, entry] of Object.entries(parsed)) {
      if (entry.seasonName) {
        next.set(`${leagueId}:${entry.seasonId}`, entry.seasonName);
      }
    }

    setStoredSeasonNames(next);
  }, [pathname]);

  // Strip locale prefix
  const stripped = pathname.replace(new RegExp(`^/${locale}`), '') || '/';
  const segments = stripped.split('/').filter(Boolean);

  // Don't show breadcrumbs at root dashboard
  if (segments.length <= 1) return null;

  // Build lookup map: id -> name for leagues
  const leagueNames = new Map<string, string>();
  if (dashboardData?.organizations) {
    for (const org of dashboardData.organizations) {
      for (const league of org.leagues) {
        leagueNames.set(league.id, league.name);
      }
    }
  }

  // Also check admin_leagues
  if (dashboardData?.admin_leagues) {
    for (const league of dashboardData.admin_leagues) {
      leagueNames.set(league.id, league.name);
    }
  }

  // Segment label mapping keys (segment -> i18n navigation key)
  const segmentLabels: Record<string, string> = {
    dashboard: 'dashboard',
    schedule: 'schedule',
    teams: 'teamsAndDivisions',
    'teams-divisions': 'teamsAndDivisions',
    standings: 'standings',
    registration: 'registration',
    registrations: 'registration',
    games: 'completedGames',
    players: 'players',
    staff: 'staff',
    settings: 'settings',
    billing: 'billing',
    notifications: 'notifications',
    news: 'news',
    sponsors: 'sponsors',
    awards: 'awards',
    gallery: 'gallery',
    draft: 'draftRoom',
    profile: 'profile',
    website: 'websiteEditor',
    'website-editor': 'websiteEditor',
    new: 'createLeague',
    captain: 'teams',
    rosters: 'rosters',
    eligibility: 'eligibility',
    ratings: 'playerRatings',
    'scorekeeper-schedule': 'scorekeeperSchedule',
    'contact-inbox': 'contactInbox',
    bugs: 'bugReports',
    scorekeepers: 'scorekeeperSchedule',
    domains: 'domains',
    finance: 'financials',
    payments: 'financials',
  };

  const leagueSegmentIndex = segments.indexOf('leagues');
  const seasonSegmentIndex = segments.indexOf('seasons');
  const leagueIdFromPath =
    leagueSegmentIndex >= 0 && UUID_RE.test(segments[leagueSegmentIndex + 1] || '')
      ? segments[leagueSegmentIndex + 1]
      : null;

  const seasonLabels = new Map<string, string>();
  if (leagueIdFromPath) {
    for (const [key, value] of storedSeasonNames.entries()) {
      if (key.startsWith(`${leagueIdFromPath}:`)) {
        seasonLabels.set(key.split(':')[1], value);
      }
    }
  }

  // Segments to skip (noise words that don't add value)
  const skipSegments = new Set(['leagues']);

  // Build crumbs
  const crumbs: Array<{ label: string; href: string }> = [];
  let pathSoFar = '';

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    pathSoFar += `/${seg}`;

    if (skipSegments.has(seg)) continue;

    // UUID segment — try to resolve to a league name
    if (UUID_RE.test(seg)) {
      const isSeasonId = segments[i - 1] === 'seasons';
      if (isSeasonId) {
        crumbs.push({
          label: seasonLabels.get(seg) || 'Season',
          href: pathSoFar,
        });
        continue;
      }

      const leagueName = leagueNames.get(seg);
      if (leagueName) {
        crumbs.push({ label: leagueName, href: pathSoFar });
      }
      // skip unknown UUIDs entirely
      continue;
    }

    const labelKey = segmentLabels[seg];
    const label = seg === 'migration-center'
      ? 'Migration Center'
      : labelKey
        ? t(labelKey)
        : seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
    crumbs.push({ label, href: pathSoFar });
  }

  // Don't show if only one crumb
  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="px-4 sm:px-6 lg:px-8 pt-3 pb-1">
      <ol className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {idx > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
              )}
              {isLast ? (
                <span className="text-neutral-200 font-medium truncate max-w-[200px]">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-neutral-400 hover:text-neutral-200 transition-colors truncate max-w-[200px]"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
