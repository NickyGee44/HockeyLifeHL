'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ChevronRight, Dot } from 'lucide-react';
import type { DashboardData } from '@/lib/actions/dashboard';
import {
  ACTIVE_SEASON_WORKSPACE_COOKIE,
  parseActiveSeasonWorkspaceCookie,
} from '@/lib/dashboard/workspace-cookie';
import { getDashboardSegmentLabel } from '@/lib/dashboard/navigation';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface BreadcrumbsProps {
  dashboardData: DashboardData | null;
}

function stripLocale(pathname: string, locale: string) {
  if (pathname === `/${locale}`) {
    return '/';
  }

  return pathname.startsWith(`/${locale}`) ? pathname.slice(locale.length + 1) : pathname;
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

  const stripped = stripLocale(pathname, locale);
  const segments = stripped.split('/').filter(Boolean);

  if (segments.length <= 1) {
    return null;
  }

  const leagueNames = new Map<string, string>();
  if (dashboardData?.organizations) {
    for (const org of dashboardData.organizations) {
      for (const league of org.leagues) {
        leagueNames.set(league.id, league.name);
      }
    }
  }
  if (dashboardData?.admin_leagues) {
    for (const league of dashboardData.admin_leagues) {
      leagueNames.set(league.id, league.name);
    }
  }

  const leagueIndex = segments.indexOf('leagues');
  const activeLeagueId =
    leagueIndex >= 0 && UUID_RE.test(segments[leagueIndex + 1] || '')
      ? segments[leagueIndex + 1]
      : null;

  const seasonLabels = new Map<string, string>();
  if (activeLeagueId) {
    for (const [key, value] of storedSeasonNames.entries()) {
      if (key.startsWith(`${activeLeagueId}:`)) {
        seasonLabels.set(key.split(':')[1], value);
      }
    }
  }

  const crumbs: Array<{ label: string; href: string }> = [];
  let pathSoFar = '';

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    pathSoFar += `/${segment}`;

    if (UUID_RE.test(segment)) {
      const previous = segments[index - 1];
      if (previous === 'seasons') {
        crumbs.push({
          label: seasonLabels.get(segment) || 'Season',
          href: pathSoFar,
        });
        continue;
      }

      const leagueName = leagueNames.get(segment);
      if (leagueName) {
        crumbs.push({ label: leagueName, href: pathSoFar });
      }
      continue;
    }

    crumbs.push({
      label: getDashboardSegmentLabel(segment, t),
      href: pathSoFar,
    });
  }

  if (crumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="px-4 pb-2 pt-4 sm:px-6 lg:px-8">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5 text-neutral-600" /> : <Dot className="h-3.5 w-3.5 text-rink-400" />}
              {isLast ? (
                <span className="max-w-[220px] truncate font-semibold text-neutral-100">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="max-w-[220px] truncate text-neutral-400 transition-colors hover:text-neutral-100"
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
