'use client';

import { useEffect } from 'react';

const COOKIE_NAME = 'captain_player_invite';

export function CaptainInviteCookieBridge({ inviteId }: { inviteId: string | null }) {
  useEffect(() => {
    if (!inviteId) return;
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(inviteId)}; path=/; max-age=${60 * 60 * 24 * 14}; samesite=lax`;
  }, [inviteId]);

  return null;
}
