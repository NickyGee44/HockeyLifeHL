/**
 * Cancel Subscription Dialog
 *
 * Handles subscription cancellation with reason collection and confirmation.
 * Offers two options: cancel immediately or cancel at period end.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { cancelSubscription, reactivateSubscription } from '@/lib/actions/subscription';
import { CANCELLATION_REASONS } from '@/lib/types/subscription';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

interface CancelSubscriptionDialogProps {
  onCancelled?: () => void;
  trigger?: React.ReactNode;
}

export function CancelSubscriptionDialog({
  onCancelled,
  trigger,
}: CancelSubscriptionDialogProps) {
  const t = useTranslations('subscription.cancelDialog');
  const tSub = useTranslations('subscription');
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'select-reason' | 'confirm'>('select-reason');
  const [reason, setReason] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [cancelTiming, setCancelTiming] = useState<'end-of-period' | 'immediately'>(
    'end-of-period'
  );
  const [loading, setLoading] = useState(false);

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when closing
      setStep('select-reason');
      setReason('');
      setFeedback('');
      setCancelTiming('end-of-period');
    }
  }

  function handleNext() {
    if (!reason) {
      toast.error(t('pleaseSelectReason'));
      return;
    }
    setStep('confirm');
  }

  function handleBack() {
    setStep('select-reason');
  }

  async function handleConfirmCancel() {
    setLoading(true);

    const result = await cancelSubscription(
      cancelTiming === 'immediately',
      reason,
      feedback || undefined
    );

    if (result.success) {
      const effectiveDate = result.data.effectiveDate;
      toast.success(
        cancelTiming === 'immediately'
          ? t('cancelledSuccess')
          : t('cancellationScheduled'),
        {
          description:
            cancelTiming === 'immediately'
              ? t('cancelledImmediately')
              : t('cancellationScheduledDesc', { date: effectiveDate.toLocaleDateString() }),
        }
      );
      setOpen(false);
      onCancelled?.();
    } else {
      toast.error(tSub('failedCancelSubscription'), {
        description: result.error,
      });
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        {step === 'select-reason' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('title')}</DialogTitle>
              <DialogDescription>
                {t('description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Reason Select */}
              <div className="space-y-2">
                <Label htmlFor="reason">{t('reasonLabel')}</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason">
                    <SelectValue placeholder={t('selectReason')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCELLATION_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Feedback Textarea */}
              <div className="space-y-2">
                <Label htmlFor="feedback">
                  {t('feedbackLabel')}
                </Label>
                <Textarea
                  id="feedback"
                  placeholder={t('feedbackPlaceholder')}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t('keepSubscription')}
              </Button>
              <Button variant="destructive" onClick={handleNext}>
                {t('continue')}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('confirmTitle')}</DialogTitle>
              <DialogDescription>
                {t('confirmDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Cancellation Timing */}
              <RadioGroup value={cancelTiming} onValueChange={(v) => setCancelTiming(v as any)}>
                <div className="space-y-3">
                  {/* Cancel at Period End */}
                  <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="end-of-period" id="end-of-period" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="end-of-period" className="cursor-pointer font-medium">
                        {t('endOfPeriod')}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('endOfPeriodDesc')}
                      </p>
                    </div>
                  </div>

                  {/* Cancel Immediately */}
                  <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="immediately" id="immediately" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="immediately" className="cursor-pointer font-medium">
                        {t('immediately')}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('immediatelyDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>

              {/* Warning */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      {t('whatHappens')}
                    </p>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
                      <li>{t('paidFeaturesRevoked')}</li>
                      <li>{t('freeFeaturesRemain')}</li>
                      <li>{t('dataPreserved')}</li>
                      <li>{t('reactivateAnytime')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                {t('back')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmCancel}
                disabled={loading}
              >
                {loading ? t('processingAction') : t('confirmCancellation')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Reactivate Subscription Component
 *
 * Allows users to reactivate a subscription that's scheduled for cancellation.
 */
interface ReactivateSubscriptionProps {
  onReactivated?: () => void;
}

export function ReactivateSubscription({ onReactivated }: ReactivateSubscriptionProps) {
  const t = useTranslations('subscription.reactivate');
  const [loading, setLoading] = useState(false);

  async function handleReactivate() {
    setLoading(true);

    const result = await reactivateSubscription();

    if (result.success) {
      toast.success(t('success'), {
        description: t('successDesc'),
      });
      onReactivated?.();
    } else {
      toast.error(t('failed'), {
        description: result.error,
      });
    }

    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            {t('title')}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            {t('description')}
          </p>
          <Button
            size="sm"
            variant="default"
            className="mt-3"
            onClick={handleReactivate}
            disabled={loading}
          >
            {loading ? t('reactivating') : t('button')}
          </Button>
        </div>
      </div>
    </div>
  );
}
