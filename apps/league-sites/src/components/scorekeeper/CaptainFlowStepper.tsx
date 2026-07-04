'use client';

import {
  CAPTAIN_GAME_FLOW_STEPS,
  gameFlowStepIndex,
  type GameFlowStep,
} from '@/lib/scorekeeper/game-flow';

interface CaptainFlowStepperProps {
  current: GameFlowStep;
}

/**
 * Compact progress header for the captain self-scoring workflow. Purely
 * presentational — the active step is derived from the persisted game status
 * (see deriveGameFlowStep), so it always reflects real state.
 */
export function CaptainFlowStepper({ current }: CaptainFlowStepperProps) {
  const currentIndex = gameFlowStepIndex(current);
  const activeMeta = CAPTAIN_GAME_FLOW_STEPS[currentIndex];

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/40 px-3 py-2.5">
      <ol className="flex items-center gap-1.5">
        {CAPTAIN_GAME_FLOW_STEPS.map((step, index) => {
          const state =
            index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'upcoming';
          return (
            <li key={step.key} className="flex flex-1 items-center gap-1.5">
              <span
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  state === 'done'
                    ? 'bg-[var(--league-primary,#d4af37)] text-black'
                    : state === 'active'
                      ? 'bg-[var(--league-primary,#d4af37)] text-black ring-2 ring-[var(--league-primary,#d4af37)]/40'
                      : 'bg-[var(--color-background)] text-[var(--color-text-secondary)] border border-[var(--color-border)]',
                ].join(' ')}
                aria-current={state === 'active' ? 'step' : undefined}
              >
                {state === 'done' ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={[
                  'hidden truncate text-xs font-semibold sm:block',
                  state === 'upcoming'
                    ? 'text-[var(--color-text-secondary)]'
                    : 'text-[var(--color-text-primary)]',
                ].join(' ')}
              >
                {step.label}
              </span>
              {index < CAPTAIN_GAME_FLOW_STEPS.length - 1 && (
                <span
                  className={[
                    'h-px flex-1 transition-colors',
                    index < currentIndex
                      ? 'bg-[var(--league-primary,#d4af37)]'
                      : 'bg-[var(--color-border)]',
                  ].join(' ')}
                />
              )}
            </li>
          );
        })}
      </ol>
      {/* On narrow screens the labels collapse; show the active step's name + hint. */}
      {activeMeta && (
        <p className="mt-1.5 text-xs text-[var(--color-text-secondary)] sm:hidden">
          <span className="font-semibold text-[var(--color-text-primary)]">{activeMeta.label}</span>
          {' — '}
          {activeMeta.description}
        </p>
      )}
    </div>
  );
}
