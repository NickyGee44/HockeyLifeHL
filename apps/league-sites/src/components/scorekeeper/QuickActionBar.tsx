'use client';

interface QuickActionBarProps {
  onGoal: () => void;
  onPenalty: () => void;
  onShot: () => void;
  disabled?: boolean;
  selectedTeamName?: string | null;
}

export function QuickActionBar({
  onGoal,
  onPenalty,
  onShot,
  disabled = false,
  selectedTeamName,
}: QuickActionBarProps) {
  const noTeamSelected = disabled && !selectedTeamName;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur-lg pb-safe">
      {/* Prompt when no team selected */}
      {noTeamSelected && (
        <div className="text-center py-1.5 text-xs font-medium text-[var(--league-primary,#d4af37)] bg-[var(--league-primary,#d4af37)]/5 border-b border-[var(--color-border)] animate-pulse">
          Tap a team above to start scoring
        </div>
      )}

      {/* Selected team indicator */}
      {selectedTeamName && (
        <div className="text-center py-1 text-[11px] font-semibold text-[var(--league-primary,#d4af37)] bg-[var(--league-primary,#d4af37)]/5 border-b border-[var(--color-border)]">
          Scoring for: {selectedTeamName}
        </div>
      )}

      <div className="flex items-stretch max-w-lg mx-auto">
        {/* Goal */}
        <button
          onClick={onGoal}
          disabled={disabled}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 text-green-400 hover:bg-green-500/5 active:bg-green-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-semibold">Goal</span>
        </button>

        {/* Penalty */}
        <button
          onClick={onPenalty}
          disabled={disabled}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 text-yellow-400 hover:bg-yellow-500/5 active:bg-yellow-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span className="text-xs font-semibold">Penalty</span>
        </button>

        {/* Shot/Save */}
        <button
          onClick={onShot}
          disabled={disabled}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 text-blue-400 hover:bg-blue-500/5 active:bg-blue-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-semibold">Shot</span>
        </button>
      </div>
    </div>
  );
}
