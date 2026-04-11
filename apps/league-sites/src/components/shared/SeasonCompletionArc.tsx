/**
 * SeasonCompletionArc — elliptical arc showing regular-season progress.
 * When playoff games exist, switches to a pulsing "PLAYOFFS" label.
 *
 * Server component — pure CSS animations, no client JS.
 */

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

  // Arc geometry — elliptical, 220° sweep (phone-brightness style)
  // SVG viewBox is 200×140, arc center at (100, 130)
  const rx = 85;
  const ry = 105;
  const cx = 100;
  const cy = 130;
  const startAngle = -200; // degrees from 3-o'clock, going CCW
  const endAngle = 20;
  const sweepDeg = endAngle - startAngle; // 220°

  function polarToCartesian(
    cxVal: number,
    cyVal: number,
    rxVal: number,
    ryVal: number,
    angleDeg: number,
  ) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cxVal + rxVal * Math.cos(rad),
      y: cyVal + ryVal * Math.sin(rad),
    };
  }

  const start = polarToCartesian(cx, cy, rx, ry, startAngle);
  const end = polarToCartesian(cx, cy, rx, ry, endAngle);

  // Track path (full arc)
  const trackD = [
    `M ${start.x} ${start.y}`,
    `A ${rx} ${ry} 0 1 1 ${end.x} ${end.y}`,
  ].join(' ');

  // Filled arc — clip to pct of sweep
  const fillAngle = startAngle + (sweepDeg * (hasPlayoffs ? 100 : pct)) / 100;
  const fillEnd = polarToCartesian(cx, cy, rx, ry, fillAngle);
  const largeArc = (fillAngle - startAngle) > 180 ? 1 : 0;
  const fillD = [
    `M ${start.x} ${start.y}`,
    `A ${rx} ${ry} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`,
  ].join(' ');

  const isPlayoffMode = hasPlayoffs;

  return (
    <section
      className="season-completion-arc relative flex flex-col items-center pb-0 -mb-2"
      aria-label="Season Completion"
    >
      {/* Heading */}
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2">
        Season Completion
      </h2>

      <div className="relative w-[220px] h-[150px]">
        <svg
          viewBox="0 0 200 140"
          className="w-full h-full"
          aria-hidden="true"
        >
          {/* Glow filter for playoff mode */}
          {isPlayoffMode && (
            <defs>
              <filter id="playoff-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          )}

          {/* Track (background arc) */}
          <path
            d={trackD}
            fill="none"
            stroke="var(--color-border, rgba(255,255,255,0.08))"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Filled arc */}
          {(pct > 0 || isPlayoffMode) && (
            <path
              d={fillD}
              fill="none"
              stroke="var(--league-primary, #D4AF37)"
              strokeWidth="6"
              strokeLinecap="round"
              className={isPlayoffMode ? 'season-arc-pulse' : ''}
              filter={isPlayoffMode ? 'url(#playoff-glow)' : undefined}
            />
          )}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pt-4">
          {isPlayoffMode ? (
            <span className="text-lg font-black uppercase tracking-widest text-[var(--league-primary,#D4AF37)] season-arc-pulse-text">
              Playoffs
            </span>
          ) : (
            <span className="text-3xl font-extrabold tabular-nums text-[var(--color-text-primary)]">
              {pct}<span className="text-lg font-semibold text-[var(--color-text-muted)]">%</span>
            </span>
          )}
        </div>
      </div>

      {/* Inline styles for pulse animation — CSS-only, no client JS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes season-arc-strobe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
.season-arc-pulse {
  animation: season-arc-strobe 2.4s ease-in-out infinite;
}
.season-arc-pulse-text {
  animation: season-arc-strobe 2.4s ease-in-out infinite;
}
`,
        }}
      />
    </section>
  );
}
