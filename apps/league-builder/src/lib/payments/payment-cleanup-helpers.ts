import type { PlayerPayment } from './types';

export const ARCHIVABLE_PAYMENT_STATUSES = ['pending', 'overdue', 'cancelled', 'failed'] as const;
export const ARCHIVE_REASON_CONFIRMATION = 'DELETE';

export type PaymentCleanupTransaction = {
  id: string;
  transaction_type: string;
  status: string;
};

export function isPaymentArchived(payment: Pick<PlayerPayment, 'archived_at'>) {
  return Boolean(payment.archived_at);
}

export function getArchivedPaymentError(payment: Pick<PlayerPayment, 'archived_at'>) {
  if (!isPaymentArchived(payment)) {
    return null;
  }

  return 'This payment has been archived and is hidden from active workflows.';
}

export function canArchivePayment(
  payment: Pick<PlayerPayment, 'amount_paid_cents' | 'status' | 'archived_at'>,
  transactions: PaymentCleanupTransaction[]
) {
  if (isPaymentArchived(payment)) {
    return 'This payment has already been archived.';
  }

  if (
    !ARCHIVABLE_PAYMENT_STATUSES.includes(
      payment.status as (typeof ARCHIVABLE_PAYMENT_STATUSES)[number]
    )
  ) {
    return 'Only unpaid pending, overdue, cancelled, or failed payments can be archived.';
  }

  if ((payment.amount_paid_cents ?? 0) > 0) {
    return 'Payments with collected money cannot be archived.';
  }

  const hasProtectedTransactionHistory = transactions.some(
    (transaction) =>
      transaction.status === 'succeeded' || transaction.transaction_type === 'refund'
  );
  if (hasProtectedTransactionHistory) {
    return 'Payments with successful charge or refund history cannot be archived.';
  }

  return null;
}

export function canPermanentlyDeletePayment(
  payment: Pick<PlayerPayment, 'amount_paid_cents' | 'status' | 'archived_at'>,
  transactions: PaymentCleanupTransaction[],
  disputeCount: number
) {
  if (!isPaymentArchived(payment)) {
    return 'Archive this payment before permanently deleting it.';
  }

  const archiveError = canArchivePayment(
    {
      ...payment,
      archived_at: null,
    },
    transactions
  );
  if (archiveError) {
    return archiveError;
  }

  if (disputeCount > 0) {
    return 'Payments with dispute history cannot be permanently deleted.';
  }

  return null;
}
