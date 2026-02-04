'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
} from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';
import type { DraftSetupWizardProps, DraftSetupConfig } from './types';

const STEPS = [
  { id: 'basics', title: 'Draft Settings', icon: Settings },
  { id: 'timing', title: 'Pick Timer', icon: Clock },
  { id: 'options', title: 'Options', icon: Zap },
  { id: 'review', title: 'Review', icon: Check },
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
  onComplete,
  onCancel,
}: DraftSetupWizardProps) {
  const [supabase] = useState(() => createClient());
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<DraftSetupConfig>(DEFAULT_CONFIG);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateConfig = (updates: Partial<DraftSetupConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!config.name.trim()) {
      setError('Please enter a draft name');
      setCurrentStep(0);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Note: setup_draft RPC is defined in migrations but not in generated types yet
      const { data, error: rpcError } = await (supabase.rpc as any)('setup_draft', {
        p_league_id: leagueId,
        p_season_id: seasonId,
        p_name: config.name,
        p_draft_type: config.draftType,
        p_pick_time_seconds: config.pickTimeSeconds,
        p_total_rounds: config.totalRounds,
        p_auto_pick_enabled: config.autoPickEnabled,
        p_allow_trades: config.allowTrades,
        p_require_roster_confirmation: config.requireRosterConfirmation,
      });

      if (rpcError) throw rpcError;

      const result = data as { success?: boolean; error?: string; draft_id?: string };
      if (!result?.success) throw new Error(result?.error || 'Failed to create draft');

      onComplete(result.draft_id!);
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
                Draft Name
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => updateConfig({ name: e.target.value })}
                placeholder="e.g., 2026 Season Draft"
                className="w-full rounded-xl border border-rink-500/30 bg-black/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rink-500"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-neutral-300">
                Draft Type
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
                    <p className="font-semibold text-white">Snake Draft</p>
                    <p className="text-xs text-neutral-400">
                      Order reverses each round
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
                    <p className="font-semibold text-white">Linear Draft</p>
                    <p className="text-xs text-neutral-400">
                      Same order each round
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Total Rounds
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
                Time Per Pick (seconds)
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
                <span>Quick (30s)</span>
                <span>Normal (90s)</span>
                <span>Extended (5m)</span>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-700 bg-neutral-800/50 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-rink-500" />
                <span className="font-medium text-white">Timer Preview</span>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-32 w-32">
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
                      strokeDasharray="352"
                      strokeDashoffset="88"
                      className="text-rink-500"
                    />
                  </svg>
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
                  <p className="font-medium text-white">Auto-Pick on Timeout</p>
                  <p className="text-xs text-neutral-400">
                    Automatically pick best available when timer expires
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
                  <p className="font-medium text-white">Allow Pick Trading</p>
                  <p className="text-xs text-neutral-400">
                    Commissioners can trade future picks between teams
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
                  <p className="font-medium text-white">Require Roster Confirmation</p>
                  <p className="text-xs text-neutral-400">
                    Captains must confirm their roster after the draft
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

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Review Settings</h3>
            <div className="rounded-xl border border-rink-500/30 bg-rink-500/5 p-6">
              <dl className="space-y-4">
                <div className="flex justify-between">
                  <dt className="text-neutral-400">Draft Name</dt>
                  <dd className="font-medium text-white">{config.name || 'Not set'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-400">Type</dt>
                  <dd className="font-medium text-white capitalize">{config.draftType}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-400">Rounds</dt>
                  <dd className="font-medium text-white">{config.totalRounds}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-400">Pick Time</dt>
                  <dd className="font-medium text-white">
                    {Math.floor(config.pickTimeSeconds / 60)}:
                    {(config.pickTimeSeconds % 60).toString().padStart(2, '0')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-400">Auto-Pick</dt>
                  <dd className="font-medium text-white">
                    {config.autoPickEnabled ? 'Enabled' : 'Disabled'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-400">Trading</dt>
                  <dd className="font-medium text-white">
                    {config.allowTrades ? 'Allowed' : 'Disabled'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-400">Roster Confirmation</dt>
                  <dd className="font-medium text-white">
                    {config.requireRosterConfirmation ? 'Required' : 'Optional'}
                  </dd>
                </div>
              </dl>
            </div>
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
        <h2 className="text-2xl font-bold text-white">Set Up Your Draft</h2>
        <p className="text-neutral-400">Configure the draft settings before starting</p>
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
                    'h-0.5 w-12',
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
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 rounded-lg bg-rink-500 px-6 py-2 font-semibold text-black transition-all hover:bg-rink-600 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-rink-500 px-6 py-2 font-semibold text-black transition-all hover:bg-rink-600 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Create Draft
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
