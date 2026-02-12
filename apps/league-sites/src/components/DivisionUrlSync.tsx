'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDivisionFilter } from './DivisionFilterProvider';

/**
 * Invisible component that syncs the global division filter to URL search params.
 * Drop into any server-rendered page that reads `?division=` to enable
 * server-side division filtering driven by the header dropdown.
 */
export function DivisionUrlSync({ pagePath }: { pagePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedDivisionId } = useDivisionFilter();
  const prevRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // First render: capture current URL state without navigating
    if (prevRef.current === undefined) {
      prevRef.current = searchParams.get('division') || null;
      return;
    }

    // Only navigate when the global filter actually changes
    if (prevRef.current === selectedDivisionId) return;
    prevRef.current = selectedDivisionId;

    const params = new URLSearchParams(searchParams.toString());
    if (selectedDivisionId) {
      params.set('division', selectedDivisionId);
    } else {
      params.delete('division');
    }
    const qs = params.toString();
    router.replace(qs ? `${pagePath}?${qs}` : pagePath);
  }, [selectedDivisionId, searchParams, router, pagePath]);

  return null;
}
