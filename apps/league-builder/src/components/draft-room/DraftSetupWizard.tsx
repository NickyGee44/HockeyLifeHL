'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Settings,
  Clock,
  Shuffle,
  ArrowRight,
  ArrowLeft,
  Check,
  Users,
  Zap,
  RefreshCcw,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ListOrdered,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@hockey-life/ui/lib/utils';
import { setupDraft, setDraftOrder as saveDraftOrder } from '@/lib/actions/draft';
import type { DraftSetupWizardProps, DraftSetupConfig } from './types';

const STEPS = [
  { id: 'basics', titleKey: 'stepDraftSettings' as const, icon: Settings },
  { id: 'timing', titleKey: 'stepPickTimer' as const, icon: Clock },
  { id: 'options', titleKey: 'stepOptions' as const, icon: Zap },
  { id: 'order', titleKey: 'stepDraftOrder' as const, icon: ListOrdered },
  { id: 'review', titleKey: 'stepReview' as const, icon: Check },
];

const DEFAULT_CONFIG: DraftSetupConfig = {
  name: '',
  draftType: 'snake',
  pickTimeSeconds: 90,
  totalRounds: 10,
  autoPickEnabled: true,
  allowTrades: true,
  requireRosterConfirmation: true,
};

export function DraftSetupWizard({
  leagueId,
  seasonId,
  teams,
  onComplete,
  onCancel,
}: DraftSetupWizardProps) {
  const t = useTranslations('draft');
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<DraftSetupConfig>(DEFAULT_CONFIG);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft order state: array of team objects in pick order
  const [draftOrder, setDraftOrder] = useState<{ id: string; name: string }[]>(
    () => [...teams]
  );
  const [isShuffling, setIsShuffling] = useState(false);
  const [revealedFirst, setRevealedFirst] = useState(false);
  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // BUG 1 fix: clean up shuffle timer on unmount
  useEffect(() => {
    return () => {
      if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
    };
  }, []);

  const updateConfig = (updates: Partial<DraftSetupConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep === 0 && !config.name.trim()) {
      setError(t('draftNameRequired'));
      return;
    }
    setError(null);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Move a team up in the draft order
  const moveTeamUp = useCallback((index: number) => {
    if (index <= 0) return;
    setDraftOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  // Move a team down in the draft order
  const moveTeamDown = useCallback((index: number) => {
    setDraftOrder((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  // Fisher-Yates shuffle helper
  const fisherYatesShuffle = <T,>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Animated randomize: 6 rapid shuffles then reveal
  const animatedRandomize = useCallback(() => {
    if (isShuffling) return;
    setIsShuffling(true);
    setRevealedFirst(false);

    let count = 0;
    const totalShuffles = 6;

    const doShuffle = () => {
      count++;
      setDraftOrder((prev) => fisherYatesShuffle(prev));

      if (count < totalShuffles) {
        shuffleTimerRef.current = setTimeout(doShuffle, 250);
      } else {
        // Final settle
        setIsShuffling(false);
        setRevealedFirst(true);
        // Remove gold highlight after 2s
        shuffleTimerRef.current = setTimeout(() => {
          setRevealedFirst(false);
        }, 2000);
      }
    };

    doShuffle();
  }, [isShuffling]);

  const handleSubmit = async () => {
    if (!config.name.trim()) {
      setError(t('draftNameRequired'));
      setCurrentStep(0);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await setupDraft(leagueId, seasonId, {
        name: config.name,
        draftType: config.draftType,
        pickTimeSeconds: config.pickTimeSeconds,
        totalRounds: config.totalRounds,
        autoPickEnabled: config.autoPickEnabled,
        allowTrades: config.allowTrades,
        requireRosterConfirmation: config.requireRosterConfirmation,
      });

      if (!result.success) throw new Error(result.error || 'Failed to create draft');

      const newDraftId = result.data!.draftId;

      // Save draft order if teams exist
      if (draftOrder.length > 0) {
        const orderResult = await saveDraftOrder(
          newDraftId,
          leagueId,
          draftOrder.map((team, index) => ({
            teamId: team.id,
            pickPosition: index + 1,
          }))
        );

        if (!orderResult.success) {
          console.error('Failed to save draft order:', orderResult.error);
          toast.warning('Draft created, but the pick order could not be saved. You can re-randomize it in the draft room.');
        }
      }

      onComplete(newDraftId);
    } catch (err) {
      console.error('Error creating draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to create draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                {t('draftName')}
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => updateConfig({ name: e.target.value })}
                placeholder={t('draftNamePlaceholder')}
                className="w-full rounded-xl border border-rink-500/30 bg-black/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rink-500"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-neutral-300">
                {t('draftType')}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => updateConfig({ draftType: 'snake' })}
                  className={cn(
                    'flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
                    config.draftType === 'snake'
                      ? 'border-rink-500 bg-rink-500/10'
                      : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                  )}
                >
                  <Shuffle
                    className={cn(
                      'h-8 w-8',
                      config.draftType === 'snake' ? 'text-rink-500' : 'text-neutral-400'
                    )}
                  />
                  <div className="text-center">
                    <p className="font-semibold text-white">{t('snakeDraft')}</p>
                    <p className="text-xs text-neutral-400">
                      {t('snakeDraftDescription')}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => updateConfig({ draftType: 'linear' })}
                  className={cn(
                    'flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
                    config.draftType === 'linear'
                      ? 'border-rink-500 bg-rink-500/10'
                      : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                  )}
                >
                  <ArrowRight
                    className={cn(
                      'h-8 w-8',
                      config.draftType === 'linear' ? 'text-rink-500' : 'text-neutral-400'
                    )}
                  />
                  <div className="text-center">
                    <p className="font-semibold text-white">{t('linearDraft')}</p>
                    <p className="text-xs text-neutral-400">
                      {t('linearDraftDescription')}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                {t('totalRounds')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="25"
                  value={config.totalRounds}
                  onChange={(e) => updateConfig({ totalRounds: parseInt(e.target.value) })}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-neutral-700 accent-rink-500"
                />
                <span className="w-12 text-center text-xl font-bold text-rink-500">
                  {config.totalRounds}
                </span>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                {t('timePerPick')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="30"
                  max="300"
                  step="15"
                  value={config.pickTimeSeconds}
                  onChange={(e) =>
                    updateConfig({ pickTimeSeconds: parseInt(e.target.value) })
                  }
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-neutral-700 accent-rink-500"
                />
                <span className="w-20 text-center">
                  <span className="text-xl font-bold text-rink-500">
                    {Math.floor(config.pickTimeSeconds / 60)}:
                    {(config.pickTimeSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </span>
              </div>
              <div className="mt-4 flex justify-between text-xs text-neutral-500">
                <span>{t('timerQuick')}</span>
                <span>{t('timerNormal')}</span>
                <span>{t('timerExtended')}</span>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-700 bg-neutral-800/50 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-rink-500" />
                <span className="font-medium text-white">{t('timerPreview')}</span>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-32 w-32">
                  {(() => {
                    const circumference = 2 * Math.PI * 56; // ~351.86
                    const maxTime = 300;
                    const fraction = config.pickTimeSeconds / maxTime;
                    const offset = circumference * (1 - fraction);
                    return (
                      <svg className="h-full w-full -rotate-90 transform">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-neutral-700"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          className="text-rink-500 transition-all duration-300"
                        />
                      </svg>
                    );
                  })()}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {Math.floor(config.pickTimeSeconds / 60)}:
                      {(config.pickTimeSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-neutral-700 bg-neutral-800/50 p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-rink-500" />
                <div>
                  <p className="font-medium text-white">{t('autoPickOnTimeout')}</p>
                  <p className="text-xs text-neutral-400">
                    {t('autoPickOnTimeoutDescription')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateConfig({ autoPickEnabled: !config.autoPickEnabled })}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  config.autoPickEnabled ? 'bg-rink-500' : 'bg-neutral-600'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    config.autoPickEnabled ? 'left-5' : 'left-0.5'
                  )}
                />
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-neutral-700 bg-neutral-800/50 p-4">
              <div className="flex items-center gap-3">
                <RefreshCcw className="h-5 w-5 text-rink-500" />
                <div>
                  <p className="font-medium text-white">{t('allowPickTrading')}</p>
                  <p className="text-xs text-neutral-400">
                    {t('allowPickTradingDescription')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateConfig({ allowTrades: !config.allowTrades })}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  config.allowTrades ? 'bg-rink-500' : 'bg-neutral-600'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    config.allowTrades ? 'left-5' : 'left-0.5'
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-neutral-700 bg-neutral-800/50 p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-rink-500" />
                <div>
                  <p className="font-medium text-white">{t('requireRosterConfirmation')}</p>
                  <p className="text-xs text-neutral-400">
                    {t('requireRosterConfirmationDescription')}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  updateConfig({
                    requireRosterConfirmation: !config.requireRosterConfirmation,
                  })
                }
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  config.requireRosterConfirmation ? 'bg-rink-500' : 'bg-neutral-600'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    config.requireRosterConfirmation ? 'left-5' : 'left-0.5'
                  )}
                />
              </button>
            </div>
          </div>
        );

      // Draft Order step
      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{t('draftOrderTitle')}</h3>
                <p className="text-sm text-neutral-400">
                  {config.draftType === 'snake' ? t('draftOrderDescSnake') : t('draftOrderDescLinear')}
                </p>
              </div>
              <button
                onClick={animatedRandomize}
                disabled={isShuffling}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
                  'bg-rink-500/10 text-rink-500 border border-rink-500/30',
                  'hover:bg-rink-500/20 transition-colors',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                <Shuffle className={cn('h-4 w-4', isShuffling && 'animate-spin')} />
                {isShuffling ? t('shuffling') : t('randomize')}
              </button>
            </div>

            {draftOrder.length === 0 ? (
              <div className="rounded-xl border border-neutral-700 bg-neutral-800/50 p-8 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-neutral-500" />
                <p className="text-neutral-400">{t('noTeamsAvailable')}</p>
                <p className="text-sm text-neutral-500">
                  {t('addTeamsFirst')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {draftOrder.map((team, index) => (
                  <motion.div
                    key={team.id}
                    layout
                    layoutId={team.id}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-neutral-600',
                      revealedFirst && index === 0
                        ? 'border-amber-400/80 ring-2 ring-amber-400/80 bg-amber-500/10'
                        : 'border-neutral-700 bg-neutral-800/50'
                    )}
                  >
                    {/* Pick number badge */}
                    <motion.div
                      key={`${team.id}-${index}`}
                      initial={false}
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                        revealedFirst && index === 0
                          ? 'bg-amber-400/20 text-amber-400'
                          : 'bg-rink-500/10 text-rink-500'
                      )}
                    >
                      {index + 1}
                    </motion.div>

                    {/* Team name */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-white">{team.name}</p>
                    </div>

                    {/* Move buttons */}
                    <div className="flex flex-shrink-0 flex-col gap-0.5">
                      <button
                        onClick={() => moveTeamUp(index)}
                        disabled={index === 0 || isShuffling}
                        className={cn(
                          'rounded p-1 transition-colors',
                          index === 0 || isShuffling
                            ? 'cursor-not-allowed text-neutral-600'
                            : 'text-neutral-400 hover:bg-neutral-700 hover:text-white'
                        )}
                        aria-label={t('moveTeamUp', { team: team.name })}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => moveTeamDown(index)}
                        disabled={index === draftOrder.length - 1 || isShuffling}
                        className={cn(
                          'rounded p-1 transition-colors',
                          index === draftOrder.length - 1 || isShuffling
                            ? 'cursor-not-allowed text-neutral-600'
                            : 'text-neutral-400 hover:bg-neutral-700 hover:text-white'
                        )}
                        aria-label={t('moveTeamDown', { team: team.name })}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {draftOrder.length > 0 && (
              <p className="text-xs text-neutral-500 text-center">
                {t('draftOrderHint')}
              </p>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">{t('reviewSettings')}</h3>
            <div className="rounded-xl border border-rink-500/30 bg-rink-500/5 p-6">
              <dl className="space-y-4">
                <div className="flex justify-between">
                  <dt className="text-neutral-400">{t('draftName')}</dt>
                  <dd className="font-medium text-white">{config.name || t('notSet')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-400">{t('reviewType')}</dt>
                  <dd className="font-medium text-white capitalize">{config.draftType}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-400">{t('reviewRounds')}</dt>
                  <dd className="font-medium text-white">{config.totalRounds}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-400">{t('reviewPickTime')}</dt>
                  <dd className="font-medium text-white">
                    {Math.floor(config.pickTimeSeconds / 60)}:
                    {(config.pickTimeSeconds % 60).toString().padStart(2, '0')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-400">{t('reviewAutoPick')}</dt>
                  <dd className="font-medium text-white">
                    {config.autoPickEnabled ? t('enabled') : t('disabled')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-400">{t('reviewTrading')}</dt>
                  <dd className="font-medium text-white">
                    {config.allowTrades ? t('allowed') : t('disabled')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-400">{t('reviewRosterConfirmation')}</dt>
                  <dd className="font-medium text-white">
                    {config.requireRosterConfirmation ? t('required') : t('optional')}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Draft Order Summary */}
            {draftOrder.length > 0 && (
              <div className="rounded-xl border border-rink-500/30 bg-rink-500/5 p-6">
                <h4 className="mb-3 text-sm font-semibold text-neutral-300">{t('draftOrderSummary')}</h4>
                <div className="flex flex-wrap gap-2">
                  {draftOrder.map((team, index) => (
                    <span
                      key={team.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-800 px-2.5 py-1 text-sm"
                    >
                      <span className="font-bold text-rink-500">{index + 1}.</span>
                      <span className="text-white">{team.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-white">{t('setupTitle')}</h2>
        <p className="text-neutral-400">{t('setupSubtitle')}</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-center">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setCurrentStep(index)}
                disabled={index > currentStep}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-all',
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-rink-500 text-black'
                      : 'bg-neutral-800 text-neutral-400'
                )}
              >
                {isComplete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-8 sm:w-12',
                    index < currentStep ? 'bg-green-500' : 'bg-neutral-700'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Content */}
      <div className="min-h-[300px] rounded-2xl border border-white/10 bg-neutral-900 p-6">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={currentStep === 0 ? onCancel : handleBack}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {currentStep === 0 ? t('cancel') : t('back')}
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 rounded-lg bg-rink-500 px-6 py-2 font-semibold text-black transition-all hover:bg-rink-600 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]"
          >
            {t('next')}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-rink-500 px-6 py-2 font-semibold text-black transition-all hover:bg-rink-600 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                {t('creating')}
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {t('createDraft')}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
