'use client';

import { X } from 'lucide-react';
import { EmbeddedPaymentCheckout } from './EmbeddedCheckout';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  registrationId: string;
  registrationName: string;
  amount: number;
  baseFeeCents?: number;
  platformFeeCents?: number;
  platformFeePercent?: number;
  leagueSlug: string;
  onPaymentComplete?: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  registrationId,
  registrationName,
  amount,
  baseFeeCents = amount,
  platformFeeCents = 0,
  platformFeePercent = 0,
  leagueSlug,
  onPaymentComplete,
}: PaymentModalProps) {
  if (!isOpen) return null;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(cents / 100);
  };

  const returnUrl = `${window.location.origin}/${leagueSlug}/me/payments?success=true&registration=${registrationId}`;

  const handleComplete = () => {
    onPaymentComplete?.();
    // Auto-close after 2 seconds
    setTimeout(() => {
      onClose();
      window.location.reload();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="glass-card-strong relative mx-4 w-full max-w-lg overflow-hidden rounded-[28px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Complete Payment
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {registrationName} - {formatCurrency(amount)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="glass-control min-h-11 min-w-11 rounded-xl p-2 transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">League Fee</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {formatCurrency(baseFeeCents)}
              </span>
            </div>
            {platformFeeCents > 0 && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  BLH Platform Fee ({platformFeePercent.toFixed(2)}%)
                </span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {formatCurrency(platformFeeCents)}
                </span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
              <span className="font-medium text-[var(--color-text-primary)]">Total Charge</span>
              <span className="text-lg font-bold text-[var(--color-text-primary)]">
                {formatCurrency(amount)}
              </span>
            </div>
          </div>
          <EmbeddedPaymentCheckout
            registrationId={registrationId}
            returnUrl={returnUrl}
            onComplete={handleComplete}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-hover)]">
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            Payments are securely processed by Stripe. Your payment information is never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
