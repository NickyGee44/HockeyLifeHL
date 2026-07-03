'use client';

import { useEffect } from 'react';

/**
 * Observes direct children of .league-site-main and adds the `in-view`
 * class when they enter the viewport. Uses IntersectionObserver for
 * performance. Respects prefers-reduced-motion by skipping entirely.
 *
 * Mount once in the league layout — no per-page wiring needed.
 */
export function ScrollRevealObserver() {
  useEffect(() => {
    // Skip all animation work when user prefers reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) return;

    const main = document.querySelector('.league-site-main');
    if (!main) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('in-view');
            observer.unobserve(entry.target); // once revealed, stay revealed
          }
        }
      },
      { rootMargin: '0px 0px -60px 0px', threshold: 0.08 }
    );

    function observeChildren() {
      const children = main!.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        // Skip elements already in view (e.g. above the fold on load)
        if (!child.classList.contains('in-view')) {
          observer.observe(child);
        }
      }
    }

    observeChildren();

    // Watch for dynamically added children (client-side navigation, etc.)
    const mutation = new MutationObserver(() => observeChildren());
    mutation.observe(main, { childList: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, []);

  return null;
}
