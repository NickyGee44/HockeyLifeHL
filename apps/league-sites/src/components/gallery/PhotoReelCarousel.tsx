'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReelPhoto } from '@/lib/types';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface PhotoReelCarouselProps {
  photos: ReelPhoto[];
  galleryHref: string;
}

export default function PhotoReelCarousel({ photos, galleryHref }: PhotoReelCarouselProps) {
  const shuffled = useMemo(() => shuffle(photos), [photos]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const total = shuffled.length;

  const advance = useCallback(
    (dir: 1 | -1) => {
      setCurrent((prev) => (prev + dir + total) % total);
    },
    [total],
  );

  // Auto-rotate every 8s unless paused
  useEffect(() => {
    if (prefersReducedMotion || paused || total <= 1) return;
    timerRef.current = setInterval(() => advance(1), 8000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, advance, prefersReducedMotion, total]);

  if (total === 0) return null;

  return (
    <div
      className="glass-card relative w-full overflow-hidden rounded-[28px] shadow-xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Responsive aspect ratio container */}
      <div className="relative aspect-[4/3] sm:aspect-[16/9] xl:aspect-[21/9] w-full bg-black">
        {/* Photo stack — crossfade via opacity */}
        {shuffled.map((p, i) => (
          <img
            key={p.id}
            src={p.url}
            alt={p.caption || `League photo ${i + 1}`}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1200ms] ease-in-out ${
              i === current
                ? 'opacity-100 scale-[1.05]'
                : 'opacity-0 scale-100'
            }`}
            loading={i < 2 ? 'eager' : 'lazy'}
            draggable={false}
          />
        ))}

        {/* Navigation arrows */}
        {total > 1 && (
          <>
            <button
              onClick={() => advance(-1)}
              aria-label="Previous photo"
              className="glass-control absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-black/50 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => advance(1)}
              aria-label="Next photo"
              className="glass-control absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-black/50 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {total > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {shuffled.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to photo ${i + 1}`}
                className="group flex h-11 w-11 items-center justify-center rounded-full"
              >
                <span
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === current
                      ? 'w-6 bg-[var(--league-primary)]'
                      : 'w-1.5 bg-white/40 group-hover:bg-white/60 group-focus-visible:bg-white/60'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
