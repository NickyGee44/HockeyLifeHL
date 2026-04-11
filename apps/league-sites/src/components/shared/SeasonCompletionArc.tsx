/**
 * SeasonCompletionArc — grounded hump curve showing regular-season progress.
 * When playoff games exist, switches to a filled "PLAYOFFS" hump with pulse.
 *
 * Server component — pure CSS animations, no client JS.
 *
 * The baseline (bottom edge) of the hump is designed to sit flush against
 * the sponsor footer strip. Pages rendering this component should remove
 * bottom padding so the curve visually connects to the sponsor bar.
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

  const isPlayoffMode = hasPlayoffs;
  const fillPct = isPlayoffMode ? 100 : pct;

  // SVG geometry — wide hump, viewBox 800×100
  // Hump: smooth bell curve from bottom-left to bottom-right with peak at center
  const VB_W = 800;
  const VB_H = 100;
  const PEAK_Y = 10; // how high the peak rises (lower = taller hump)

  const humpPath = [
    `M 0 ${VB_H}`,
    `C 180 ${VB_H}, 280 ${PEAK_Y}, ${VB_W / 2} ${PEAK_Y}`,
    `C ${VB_W - 280} ${PEAK_Y}, ${VB_W - 180} ${VB_H}, ${VB_W} ${VB_H}`,
    'Z',
  ].join(' ');

  // Clip rect width for progress fill (in viewBox units)
  const clipWidth = (fillPct / 100) * VB_W;

  // Unique ID prefix to avoid collisions if multiple instances render
  const uid = 'sc-hump';

  return (
    <section
      className="season-completion-hump relative flex flex-col items-center"
      aria-label="Season Completion"
    >
      {/* Label above the hump */}
      <div className="relative z-10 mb-1 text-center">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
          Season Completion
        </h2>
      </div>

      {/* Percentage / Playoffs label — positioned above the hump peak */}
      <div className="relative z-10 mb-[-18px]">
        {isPlayoffMode ? (
          <span className="text-sm font-black uppercase tracking-[0.25em] text-[var(--league-primary,#D4AF37)] sc-hump-pulse">
            Playoffs
          </span>
        ) : (
          <span className="text-2xl font-extrabold tabular-nums text-[var(--color-text-primary)]">
            {pct}<span className="text-sm font-semibold text-[var(--color-text-muted)]">%</span>
          </span>
        )}
      </div>

      {/* The hump SVG — full width, no bottom margin */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto block"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ maxHeight: '70px' }}
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

          {/* Clip for progress percentage */}
          <clipPath id={`${uid}-clip`}>
            <rect x="0" y="0" width={clipWidth} height={VB_H} />
          </clipPath>
        </defs>

        {/* Track (full hump, muted) */}
        <path d={humpPath} fill={`url(#${uid}-track)`} />

        {/* Progress fill (clipped to percentage) */}
        {fillPct > 0 && (
          <path
            d={humpPath}
            fill={`url(#${uid}-fill)`}
            clipPath={`url(#${uid}-clip)`}
            className={isPlayoffMode ? 'sc-hump-pulse' : ''}
          />
        )}

        {/* Subtle top-edge stroke for definition */}
        <path
          d={[
            `M 0 ${VB_H}`,
            `C 180 ${VB_H}, 280 ${PEAK_Y}, ${VB_W / 2} ${PEAK_Y}`,
            `C ${VB_W - 280} ${PEAK_Y}, ${VB_W - 180} ${VB_H}, ${VB_W} ${VB_H}`,
          ].join(' ')}
          fill="none"
          stroke="var(--league-primary, #D4AF37)"
          strokeWidth="1.2"
          strokeOpacity="0.2"
        />

        {/* Progress edge highlight — shows a brighter stroke up to the fill point */}
        {fillPct > 0 && fillPct < 100 && (
          <path
            d={[
              `M 0 ${VB_H}`,
              `C 180 ${VB_H}, 280 ${PEAK_Y}, ${VB_W / 2} ${PEAK_Y}`,
              `C ${VB_W - 280} ${PEAK_Y}, ${VB_W - 180} ${VB_H}, ${VB_W} ${VB_H}`,
            ].join(' ')}
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
