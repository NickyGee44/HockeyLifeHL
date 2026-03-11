'use client';

import { useEffect } from 'react';

export function ScorekeeperChromeMode() {
  useEffect(() => {
    document.documentElement.setAttribute('data-scorekeeper-mode', 'true');

    return () => {
      document.documentElement.removeAttribute('data-scorekeeper-mode');
    };
  }, []);

  return null;
}
