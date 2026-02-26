'use client';

import { useState, useTransition } from 'react';
import { X, Shield, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { createGoalieRequest } from '@/lib/actions/goalie-marketplace';

interface GoalieRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  teamId: string;
  gameDateLabel?: string;
}

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

export function GoalieRequestModal({
  isOpen,
  onClose,
  gameId,
  teamId,
  gameDateLabel,
}: GoalieRequestModalProps) {
  const [isPending, startTransition] = useTransition();
  const [compensation, setCompensation] = useState('Free');
  const [skillLevel, setSkillLevel] = useState('intermediate');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<{ goaliesNotified: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await createGoalieRequest(gameId, teamId, {
        skillLevelNeeded: skillLevel,
        compensation: compensation.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || 'Failed to send request');
      }
    });
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    setCompensation('Free');
    setSkillLevel('intermediate');
    setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--league-primary)]" />
              Request a Goalie
            </h2>
            {gameDateLabel && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                {gameDateLabel}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {result ? (
          /* Success state */
          <div className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
              Request Sent!
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              {result.goaliesNotified > 0
                ? `${result.goaliesNotified} goalie${result.goaliesNotified !== 1 ? 's' : ''} in the pool have been notified.`
                : 'Your request has been saved. No active goalies in the pool yet.'}
            </p>
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] rounded-lg font-medium hover:bg-[var(--color-surface-hover)]/80 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* Form state */
          <div className="p-4 space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              All active goalies in the league pool will be notified and can accept via email.
            </p>

            {/* Skill Level */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                Skill Level Needed
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SKILL_LEVELS.map((sl) => (
                  <button
                    key={sl.value}
                    type="button"
                    onClick={() => setSkillLevel(sl.value)}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      skillLevel === sl.value
                        ? 'bg-[var(--league-primary)]/20 text-[var(--league-primary)] ring-1 ring-[var(--league-primary)]/30'
                        : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {sl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Compensation */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                Compensation
              </label>
              <input
                type="text"
                value={compensation}
                onChange={(e) => setCompensation(e.target.value)}
                placeholder='e.g. "Free", "$20", "Beer"'
                className="w-full px-3 py-2 text-sm bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional info for the goalie..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)] resize-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-sm text-red-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] rounded-lg font-medium hover:bg-[var(--color-surface-hover)]/80 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-[var(--league-primary)] text-[var(--color-accent-text)] rounded-lg font-medium hover:opacity-90 transition-opacity text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Request'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
