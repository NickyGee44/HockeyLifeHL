'use client';

import { Play, Pause, Undo2, RefreshCcw, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui/lib/utils';
import type { DraftControlsProps } from './types';

export function DraftControls({
  draft,
  isAdmin,
  onPause,
  onResume,
  onUndo,
  onOpenTrade,
  isSubmitting,
}: DraftControlsProps) {
  const t = useTranslations('draft');

  if (!isAdmin) return null;

  const isPaused = draft.status === 'paused';
  const isActive = draft.status === 'active';
  const canUndo = draft.undo_available && draft.last_pick_id;

  return (
    <div className="flex items-center gap-2">
      {/* Pause/Resume Button */}
      {isActive ? (
        <button
          onClick={onPause}
          disabled={isSubmitting}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all',
            'bg-yellow-500 text-black hover:bg-yellow-600',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <Pause className="h-4 w-4" />
          {t('pause')}
        </button>
      ) : isPaused ? (
        <button
          onClick={onResume}
          disabled={isSubmitting}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all',
            'bg-green-500 text-white hover:bg-green-600',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <Play className="h-4 w-4" />
          {t('resume')}
        </button>
      ) : null}

      {/* Undo Button */}
      {(isActive || isPaused) && (
        <button
          onClick={onUndo}
          disabled={isSubmitting || !canUndo}
          title={canUndo ? t('undoLastPickTitle') : t('noPickToUndo')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all',
            canUndo
              ? 'border border-orange-500/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
              : 'border border-neutral-700 bg-neutral-800/50 text-neutral-500',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <Undo2 className="h-4 w-4" />
          {t('undo')}
        </button>
      )}

      {/* Trade Button */}
      {draft.allow_trades && (isActive || isPaused) && (
        <button
          onClick={onOpenTrade}
          disabled={isSubmitting}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all',
            'border border-rink-500/50 bg-rink-500/10 text-rink-400 hover:bg-rink-500/20',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <RefreshCcw className="h-4 w-4" />
          {t('tradePick')}
        </button>
      )}

      {/* Status Indicator */}
      {isPaused && (
        <div className="ml-2 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium text-yellow-500">{t('draftPaused')}</span>
        </div>
      )}
    </div>
  );
}
