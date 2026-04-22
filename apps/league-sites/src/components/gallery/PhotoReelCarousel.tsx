'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReelPhoto } from '@/lib/types';

interface PhotoReelCarouselProps {
  photos: ReelPhoto[];
  galleryHref: string;
}

export default function PhotoReelCarousel({ photos, galleryHref }: PhotoReelCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = photos.length;

  const advance = useCallback(
    (dir: 1 | -1) => {
      setCurrent((prev) => (prev + dir + total) % total);
    },
    [total],
  );

  // Auto-rotate every 8s unless paused
  useEffect(() => {
    if (paused || total <= 1) return;
    timerRef.current = setInterval(() => advance(1), 8000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, advance, total]);

  if (total === 0) return null;

  const photo = photos[current];

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Responsive aspect ratio container */}
      <div className="relative aspect-[4/3] sm:aspect-[16/9] xl:aspect-[21/9] w-full bg-black">
        {/* Photo stack — crossfade via opacity */}
        {photos.map((p, i) => (
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

        {/* Frosted glass caption bar */}
        <div className="absolute inset-x-0 bottom-0 z-10 bg-black/40 backdrop-blur-md px-5 py-3 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            {photo.caption && (
              <p className="text-sm font-medium text-white truncate">{photo.caption}</p>
            )}
            <p className="text-xs text-white/70 truncate">
              {photo.album_title}
            </p>
          </div>
          <span className="ml-3 shrink-0 text-xs tabular-nums text-white/60">
            {current + 1} / {total}
          </span>
        </div>

        {/* Navigation arrows */}
        {total > 1 && (
          <>
            <button
              onClick={() => advance(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/30 backdrop-blur-sm p-2 text-white/80 hover:bg-black/50 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => advance(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/30 backdrop-blur-sm p-2 text-white/80 hover:bg-black/50 hover:text-white transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {total > 1 && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-6 bg-white'
                    : 'w-1.5 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
