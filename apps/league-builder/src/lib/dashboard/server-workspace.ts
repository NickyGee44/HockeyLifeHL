import { cookies } from 'next/headers';
import { pickOperationalSeason, type OperationalSeasonLike } from '@/lib/seasons/operational';
import {
  ACTIVE_SEASON_WORKSPACE_COOKIE,
  parseActiveSeasonWorkspaceCookie,
  type ActiveSeasonWorkspaceEntry,
} from './workspace-cookie';
import {
  buildEquivalentSeasonWorkspaceHref,
  buildLeagueSeasonsHref,
} from './workspace-routes';

type SeasonWorkspaceLike = OperationalSeasonLike & {
  id: string;
  name?: string | null;
};

export async function getStoredActiveSeasonWorkspace(
  leagueId: string
): Promise<ActiveSeasonWorkspaceEntry | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_SEASON_WORKSPACE_COOKIE)?.value;
  const parsed = parseActiveSeasonWorkspaceCookie(raw);
  return parsed[leagueId] ?? null;
}

export async function getPreferredSeasonWorkspace<T extends SeasonWorkspaceLike>(
  leagueId: string,
  seasons: T[] | null | undefined
): Promise<T | null> {
  if (!seasons || seasons.length === 0) {
    return null;
  }

  const stored = await getStoredActiveSeasonWorkspace(leagueId);
  if (stored) {
    const matched = seasons.find((season) => season.id === stored.seasonId);
    if (matched) {
      return matched;
    }
  }

  return pickOperationalSeason(seasons) ?? seasons[0] ?? null;
}

export async function getPreferredSeasonWorkspaceHref<T extends SeasonWorkspaceLike>(params: {
  locale: string;
  leagueId: string;
  seasons: T[] | null | undefined;
  pathname: string;
}) {
  const preferredSeason = await getPreferredSeasonWorkspace(params.leagueId, params.seasons);

  if (!preferredSeason) {
    return buildLeagueSeasonsHref(params.locale, params.leagueId);
  }

  return buildEquivalentSeasonWorkspaceHref({
    locale: params.locale,
    leagueId: params.leagueId,
    seasonId: preferredSeason.id,
    pathname: params.pathname,
  });
}
