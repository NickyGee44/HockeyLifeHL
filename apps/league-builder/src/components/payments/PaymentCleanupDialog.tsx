'use client';

import { useTranslations } from 'next-intl';
import { Archive, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PlayerPaymentWithDetails } from '@/lib/payments/types';

const DELETE_CONFIRMATION_KEYWORD = 'DELETE';

interface PaymentCleanupDialogProps {
  open: boolean;
  mode: 'archive' | 'delete';
  payment: PlayerPaymentWithDetails | null;
  reason: string;
  confirmationText: string;
  pending: boolean;
  onReasonChange: (value: string) => void;
  onConfirmationTextChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function PaymentCleanupDialog({
  open,
  mode,
  payment,
  reason,
  confirmationText,
  pending,
  onReasonChange,
  onConfirmationTextChange,
  onOpenChange,
  onConfirm,
}: PaymentCleanupDialogProps) {
  const t = useTranslations('payments.cleanupDialog');

  if (!payment) return null;

  const isDelete = mode === 'delete';
  const confirmDisabled =
    pending ||
    !reason.trim() ||
    (isDelete && confirmationText.trim().toUpperCase() !== DELETE_CONFIRMATION_KEYWORD);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-neutral-900 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDelete ? <Trash2 className="h-4 w-4 text-red-300" /> : <Archive className="h-4 w-4 text-amber-300" />}
            {isDelete ? t('deleteTitle') : t('archiveTitle')}
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            {isDelete
              ? t('deleteDescription', { player: payment.player.full_name })
              : t('archiveDescription', { player: payment.player.full_name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-neutral-300">
            <p className="font-medium text-white">{payment.season_fee.name}</p>
            <p className="mt-1 text-neutral-400">{payment.player.full_name}</p>
            <p className="mt-1 text-neutral-500">{payment.status.replace(/_/g, ' ')}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              {t('reasonLabel')}
            </label>
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              className="mt-2 min-h-[110px] w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none"
              placeholder={isDelete ? t('deleteReasonPlaceholder') : t('archiveReasonPlaceholder')}
            />
          </div>

          {isDelete && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                {t('confirmLabel', { keyword: DELETE_CONFIRMATION_KEYWORD })}
              </label>
              <input
                value={confirmationText}
                onChange={(event) => onConfirmationTextChange(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none"
                placeholder={DELETE_CONFIRMATION_KEYWORD}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isDelete
                ? 'bg-red-500 text-white hover:bg-red-400'
                : 'bg-amber-400 text-black hover:bg-amber-300'
            }`}
          >
            {pending ? t('working') : isDelete ? t('deleteCta') : t('archiveCta')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PaymentCleanupDialog;
