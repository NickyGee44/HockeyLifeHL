'use client';

import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useBugReportContext } from './BugReportProvider';
import { submitBugReport } from '@/lib/actions/bug-report';
import type { BugReportCategory } from '@/lib/bug-report-collector';

type Step = 'form' | 'confirm' | 'success';

interface BugReportModalProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_OPTIONS: Array<{ value: BugReportCategory; label: string }> = [
  { value: 'bug', label: 'Something broke' },
  { value: 'visual', label: 'Looks wrong' },
  { value: 'confusing', label: 'Confusing' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'other', label: 'Other' },
];

export function BugReportModal({ open, onClose }: BugReportModalProps) {
  const { collector, leagueId, seasonId, teamId } = useBugReportContext();
  const [step, setStep] = React.useState<Step>('form');
  const [description, setDescription] = React.useState('');
  const [expectedBehavior, setExpectedBehavior] = React.useState('');
  const [category, setCategory] = React.useState<BugReportCategory>('bug');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmEnabled, setConfirmEnabled] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setStep('form');
      setDescription('');
      setExpectedBehavior('');
      setCategory('bug');
      setError(null);
      setIsSubmitting(false);
      setConfirmEnabled(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (step !== 'confirm') {
      setConfirmEnabled(false);
      return;
    }

    const timer = window.setTimeout(() => setConfirmEnabled(true), 1500);
    return () => window.clearTimeout(timer);
  }, [step]);

  React.useEffect(() => {
    if (step !== 'success') return;

    const timer = window.setTimeout(() => {
      onClose();
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [step, onClose]);

  if (!open) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const collected = collector.getReport();
      const screenshotUrl = await collector.captureScreenshot();

      const result = await submitBugReport({
        leagueId,
        seasonId,
        teamId,
        description,
        expectedBehavior,
        category,
        collected,
        screenshotUrl,
      });

      if (!result.success) {
        setError(result.error || 'Unable to submit report. Please try again.');
        return;
      }

      setStep('success');
    } catch {
      setError('Unable to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-neutral-900 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
          aria-label="Close bug report modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-7">
          {step === 'form' && (
            <>
              <h2 className="text-xl font-bold text-white">Report a bug</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Tell us what happened and we&apos;ll collect technical context automatically.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-200">
                    What happened?
                  </label>
                  <textarea
                    required
                    maxLength={500}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={5}
                    className="w-full resize-none rounded-lg border border-white/15 bg-neutral-950 px-3 py-2.5 text-sm text-white focus:border-rink-500 focus:outline-none"
                    placeholder="Describe the issue"
                  />
                  <p className="mt-1 text-xs text-neutral-500">{description.length}/500</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-200">
                    What did you expect?
                  </label>
                  <textarea
                    maxLength={500}
                    value={expectedBehavior}
                    onChange={(event) => setExpectedBehavior(event.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-white/15 bg-neutral-950 px-3 py-2.5 text-sm text-white focus:border-rink-500 focus:outline-none"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-200">Category</label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as BugReportCategory)}
                    className="w-full rounded-lg border border-white/15 bg-neutral-950 px-3 py-2.5 text-sm text-white focus:border-rink-500 focus:outline-none"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={!description.trim()}
                  onClick={() => setStep('confirm')}
                  className="rounded-lg bg-rink-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-rink-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              <h2 className="text-xl font-bold text-white">You&apos;re about to submit a bug report</h2>
              <div className="mt-4 space-y-4 text-sm text-neutral-300">
                <div className="rounded-lg border border-white/10 bg-neutral-950 p-3">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">Description</p>
                  <p className="mt-1 whitespace-pre-wrap">{description}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-neutral-950 p-3">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">Category</p>
                  <p className="mt-1">{CATEGORY_OPTIONS.find((c) => c.value === category)?.label}</p>
                </div>
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-blue-200">
                  We&apos;ll include a screenshot, your browser info, and error logs to help us fix this faster.
                </div>
                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  disabled={!confirmEnabled || isSubmitting}
                  onClick={handleSubmit}
                  className="rounded-lg bg-rink-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-rink-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSubmitting ? 'Submitting...' : confirmEnabled ? 'Submit Report' : 'Read this first...'}
                </button>
              </div>
            </>
          )}

          {step === 'success' && (
            <div className="py-8 text-center">
              <h2 className="text-xl font-bold text-white">Thanks! We&apos;ll look into this.</h2>
              <p className="mt-2 text-sm text-neutral-400">This window will close automatically.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
