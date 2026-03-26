'use client';

import * as React from 'react';
import {
  ACTIVE_SEASON_WORKSPACE_COOKIE,
  setActiveSeasonWorkspaceEntry,
} from '@/lib/dashboard/workspace-cookie';

export function SeasonWorkspaceTracker({
  leagueId,
  seasonId,
  seasonName,
}: {
  leagueId: string;
  seasonId: string;
  seasonName: string;
}) {
  React.useEffect(() => {
    const currentCookie = document.cookie
      .split('; ')
      .find((item) => item.startsWith(`${ACTIVE_SEASON_WORKSPACE_COOKIE}=`))
      ?.split('=')
      .slice(1)
      .join('=');

    const nextValue = setActiveSeasonWorkspaceEntry(currentCookie, leagueId, {
      seasonId,
      seasonName,
    });

    document.cookie = `${ACTIVE_SEASON_WORKSPACE_COOKIE}=${nextValue}; path=/; max-age=7776000; SameSite=Lax`;
  }, [leagueId, seasonId, seasonName]);

  return null;
}
