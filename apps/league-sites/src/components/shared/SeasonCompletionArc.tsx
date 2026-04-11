'use client';

/**
 * SeasonCompletionArc — grounded hump curve showing regular-season progress.
 * When playoff games exist, switches to a filled "PLAYOFFS" hump with pulse.
 *
 * Client component — uses IntersectionObserver for scroll-triggered entrance
 * animation (fires once). The hump fills from 0→final% and the text counts up.
 *
 * The baseline (bottom edge) of the hump is designed to sit flush against
 * the sponsor footer strip. Pages rendering this component should remove
 * bottom padding so the curve visually connects to the sponsor bar.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface SeasonCompletionArcProps {
  /** All games for the current season (all types). */
  games: { game_type?: string | null; status: string }[];
}

export function SeasonCompletionArc({ games }: SeasonCompletionArcProps) {
  const regularGames = games.filter(
    (g) => !g.game_type || g.game_type === 'regular',
  );
  const completedRegular = regularGames.filter(
    (g) => g.status === 'completed' || g.status === 'pending_verification',
  );
  const hasPlayoffs = games.some(
    (g) => g.game_type === 'playoff' || g.game_type === 'playoffs',
  );

  const totalRegular = regularGames.length;
  const pct = totalRegular > 0
    ? Math.round((completedRegular.length / totalRegular) * 100)
    : 0;

  const isPlayoffMode = hasPlayoffs;
  const targetFillPct = isPlayoffMode ? 100 : pct;

  // --- Scroll-triggered animation state ---
  const sectionRef = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);
  const [animatedPct, setAnimatedPct] = useState(0);
  const [animatedFill, setAnimatedFill] = useState(0);
  const [visible, setVisible] = useState(false);

  // Count-up + fill animation
  const animate = useCallback(() => {
    const duration = 1200; // ms
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      // ease-out cubic
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      setAnimatedPct(Math.round(eased * pct));
      setAnimatedFill(eased * targetFillPct);

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setAnimatedPct(pct);
        setAnimatedFill(targetFillPct);
      }
    }

    requestAnimationFrame(tick);
  }, [pct, targetFillPct]);

  // IntersectionObserver — fire once
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          setVisible(true);
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  // SVG geometry — wide hump, viewBox 800×180 (doubled height)
  const VB_W = 800;
  const VB_H = 180;
  const PEAK_Y = 10; // peak near top of taller viewBox

  const humpPath = [
    `M 0 ${VB_H}`,
    `C 180 ${VB_H}, 280 ${PEAK_Y}, ${VB_W / 2} ${PEAK_Y}`,
    `C ${VB_W - 280} ${PEAK_Y}, ${VB_W - 180} ${VB_H}, ${VB_W} ${VB_H}`,
    'Z',
  ].join(' ');

  const humpStroke = [
    `M 0 ${VB_H}`,
    `C 180 ${VB_H}, 280 ${PEAK_Y}, ${VB_W / 2} ${PEAK_Y}`,
    `C ${VB_W - 280} ${PEAK_Y}, ${VB_W - 180} ${VB_H}, ${VB_W} ${VB_H}`,
  ].join(' ');

  // Clip rect width for progress fill (in viewBox units)
  const clipWidth = (animatedFill / 100) * VB_W;

  // Unique ID prefix to avoid collisions if multiple instances render
  const uid = 'sc-hump';

  return (
    <section
      ref={sectionRef}
      className="season-completion-hump relative flex flex-col items-center"
      aria-label="Season Completion"
    >
      <div className="relative z-10 mb-7 w-full text-left md:mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] md:text-3xl">
          Season Completion
        </h2>
      </div>

      <div
        className="relative z-10 mb-[-60px] translate-y-2 md:translate-y-3"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease-out',
        }}
      >
        {isPlayoffMode ? (
          <span
            className={`text-base font-black uppercase tracking-[0.22em] text-[var(--league-primary,#D4AF37)] md:text-lg ${visible ? 'sc-hump-pulse' : ''}`}
          >
            Playoffs
          </span>
        ) : (
          <span className="text-3xl font-extrabold tabular-nums text-[var(--color-text-primary)] md:text-4xl">
            {animatedPct}<span className="text-lg font-semibold text-[var(--color-text-muted)] md:text-xl">%</span>
          </span>
        )}
      </div>

      {/* The hump SVG — full width, no bottom margin */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto block"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ maxHeight: '340px' }}
      >
        <defs>
          {/* Gradient for track */}
          <linearGradient id={`${uid}-track`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-border, rgba(255,255,255,0.08))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--color-border, rgba(255,255,255,0.08))" stopOpacity="0.15" />
          </linearGradient>

          {/* Gradient for filled progress */}
          <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--league-primary, #D4AF37)" stopOpacity={isPlayoffMode ? '0.35' : '0.25'} />
            <stop offset="100%" stopColor="var(--league-primary, #D4AF37)" stopOpacity="0.05" />
          </linearGradient>

          {/* Clip for progress percentage — animated width */}
          <clipPath id={`${uid}-clip`}>
            <rect x="0" y="0" width={clipWidth} height={VB_H} />
          </clipPath>
        </defs>

        {/* Track (full hump, muted) */}
        <path d={humpPath} fill={`url(#${uid}-track)`} />

        {/* Progress fill (clipped to animated percentage) */}
        {animatedFill > 0 && (
          <path
            d={humpPath}
            fill={`url(#${uid}-fill)`}
            clipPath={`url(#${uid}-clip)`}
            className={isPlayoffMode && visible ? 'sc-hump-pulse' : ''}
          />
        )}

        {/* Subtle top-edge stroke for definition */}
        <path
          d={humpStroke}
          fill="none"
          stroke="var(--league-primary, #D4AF37)"
          strokeWidth="1.2"
          strokeOpacity="0.2"
        />

        {/* Progress edge highlight — shows a brighter stroke up to the fill point */}
        {animatedFill > 0 && animatedFill < 100 && (
          <path
            d={humpStroke}
            fill="none"
            stroke="var(--league-primary, #D4AF37)"
            strokeWidth="1.5"
            strokeOpacity="0.45"
            clipPath={`url(#${uid}-clip)`}
          />
        )}
      </svg>

      {/* CSS-only animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
.sc-hump-pulse {
  animation: sc-hump-breathe 3s ease-in-out infinite;
}
@keyframes sc-hump-breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
`,
        }}
      />
    </section>
  );
}
