'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { requestSwap } from '@/lib/actions/scorekeeper-swaps';
import type { DashboardGame } from '@/lib/actions/scorekeeper-dashboard';

interface SwapRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  game: DashboardGame | null;
}

const SWAP_REASONS = [
  'Schedule conflict',
  'Personal emergency',
  'Illness',
  'Transportation issue',
  'Weather conditions',
  'Other',
];

export function SwapRequestModal({ isOpen, onClose, gameId, game }: SwapRequestModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Close on background click
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleSubmit() {
    const reason = selectedReason === 'Other' ? customReason.trim() : selectedReason;

    if (!reason) {
      setError('Please select or enter a reason');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await requestSwap(gameId, reason);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Failed to submit swap request');
      }
    });
  }

  if (!isOpen) return null;

  const gameDate = game ? new Date(game.scheduledAt) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Request Swap
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Game Info */}
          {game && gameDate && (
            <div className="mt-3 p-3 bg-[var(--color-surface-hover)] rounded-xl">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {game.homeTeamName} vs {game.awayTeamName}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                {gameDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {' at '}
                {gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
              {game.venueName && (
                <p className="text-xs text-[var(--color-text-secondary)]">{game.venueName}</p>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          {success ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="font-semibold text-[var(--color-text-primary)]">Swap Request Submitted</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Other scorekeepers will be notified and can accept your swap.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                Select a reason for your swap request. Other scorekeepers in the league will be able to pick up this game.
              </p>

              {/* Reason Selection */}
              <div className="space-y-2 mb-4">
                {SWAP_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => {
                      setSelectedReason(reason);
                      setError(null);
                    }}
                    className={`
                      w-full text-left px-4 py-3 rounded-xl text-sm transition-colors
                      ${selectedReason === reason
                        ? 'bg-[var(--league-primary,#d4af37)]/10 border border-[var(--league-primary,#d4af37)]/30 text-[var(--league-primary,#d4af37)] font-medium'
                        : 'bg-[var(--color-surface-hover)] border border-transparent text-[var(--color-text-primary)] hover:border-[var(--color-border)]'
                      }
                    `}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {/* Custom Reason */}
              {selectedReason === 'Other' && (
                <textarea
                  value={customReason}
                  onChange={(e) => {
                    setCustomReason(e.target.value);
                    setError(null);
                  }}
                  placeholder="Please describe your reason..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--league-primary,#d4af37)] focus:border-transparent resize-none mb-4"
                />
              )}

              {/* Error */}
              {error && (
                <p className="text-sm text-red-400 mb-4">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending || !selectedReason}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-[var(--color-accent-text,#000)] bg-[var(--league-primary,#d4af37)] rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
