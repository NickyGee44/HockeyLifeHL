'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Landmark, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@hockey-life/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { recordOfflineRegistrationPayment } from '@/lib/actions/player-registration';

type OfflinePaymentMethod = 'e_transfer' | 'cash' | 'check' | 'other';

interface ManualRegistrationPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: {
    id: string;
    player: {
      full_name: string;
    };
    fee_amount_cents: number | null;
    amount_paid_cents: number;
    currency: string | null;
    payment_status: string;
  } | null;
  onSaved?: () => void;
}

function formatMoney(amountCents: number, currency: string | null) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency || 'CAD',
  }).format(amountCents / 100);
}

export function ManualRegistrationPaymentDialog({
  open,
  onOpenChange,
  registration,
  onSaved,
}: ManualRegistrationPaymentDialogProps) {
  const outstandingCents = useMemo(() => {
    if (!registration?.fee_amount_cents) {
      return 0;
    }

    return Math.max(
      0,
      registration.fee_amount_cents - (registration.amount_paid_cents || 0)
    );
  }, [registration]);

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<OfflinePaymentMethod>('e_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !registration) {
      return;
    }

    queueMicrotask(() => {
      setAmount(
        outstandingCents > 0 ? (outstandingCents / 100).toFixed(2) : ''
      );
      setPaymentMethod('e_transfer');
      setReferenceNumber('');
      setNotes('');
    });
  }, [open, registration, outstandingCents]);

  const amountCents = Math.round(Number(amount || '0') * 100);
  const amountIsValid =
    Number.isFinite(amountCents) && amountCents > 0 && amountCents <= outstandingCents;

  const handleSubmit = async () => {
    if (!registration) {
      return;
    }

    if (!amountIsValid) {
      toast.error('Enter a valid payment amount within the remaining balance.');
      return;
    }

    setSubmitting(true);
    const result = await recordOfflineRegistrationPayment(registration.id, {
      amountCents,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Offline payment recorded.');
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-700 bg-neutral-900 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-rink-400" />
            Record Offline Payment
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Mark an e-transfer, cash, cheque, or other manual payment for{' '}
            <span className="font-medium text-neutral-200">
              {registration?.player.full_name || 'this player'}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-neutral-700 bg-neutral-800/40 p-4 sm:grid-cols-3">
            <SummaryStat
              label="Total Fee"
              value={formatMoney(registration?.fee_amount_cents || 0, registration?.currency || 'CAD')}
            />
            <SummaryStat
              label="Already Paid"
              value={formatMoney(registration?.amount_paid_cents || 0, registration?.currency || 'CAD')}
            />
            <SummaryStat
              label="Outstanding"
              value={formatMoney(outstandingCents, registration?.currency || 'CAD')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offline-payment-amount" className="text-white">
              Amount Received
            </Label>
            <Input
              id="offline-payment-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="border-neutral-700 bg-neutral-800"
              placeholder="0.00"
            />
            <p className="text-xs text-neutral-500">
              Use the amount the owner actually received outside Stripe.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-white">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) =>
                  setPaymentMethod(value as OfflinePaymentMethod)
                }
              >
                <SelectTrigger className="border-neutral-700 bg-neutral-800">
                  <SelectValue placeholder="Choose a method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="e_transfer">E-Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="offline-payment-reference" className="text-white">
                Reference Number
              </Label>
              <Input
                id="offline-payment-reference"
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                className="border-neutral-700 bg-neutral-800"
                placeholder="Optional deposit / transfer reference"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="offline-payment-notes" className="text-white">
              Notes
            </Label>
            <Textarea
              id="offline-payment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-24 resize-none border-neutral-700 bg-neutral-800"
              placeholder="Optional notes for your bookkeeping or follow-up."
            />
          </div>

          {!amountIsValid && amount.trim() !== '' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              The amount must be greater than zero and no more than the remaining
              balance.
            </div>
          )}

          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-200">
            <div className="flex items-start gap-2">
              <ReceiptText className="mt-0.5 h-4 w-4 text-blue-300" />
              <p>
                This updates the player&apos;s registration payment status and keeps
                the league payment dashboard aligned for manual collections.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !amountIsValid}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Record Payment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  );
}
