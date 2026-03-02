'use client';

import { useEffect } from 'react';
import { posthog } from '@/lib/posthog-client';

interface PostHogIdentifierProps {
  userId: string;
  email?: string;
  displayName?: string;
}

export function PostHogIdentifier({ userId, email, displayName }: PostHogIdentifierProps) {
  useEffect(() => {
    if (userId) {
      posthog.identify(userId, {
        email,
        name: displayName,
      });
    }
    return () => {
      posthog.reset();
    };
  }, [userId, email, displayName]);

  return null;
}
