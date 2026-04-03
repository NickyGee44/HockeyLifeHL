'use client';

/**
 * Single guided schedule builder for league owners:
 * 1. Basics
 * 2. Availability
 * 3. Review
 * 4. Publish
 */

import { useCallback, useState } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { ArrowLeft, ArrowRight, Calendar, Check, ClipboardList, Sparkles } from 'lucide-react';
import type {
  AdditionalIceSlot,
  ScheduleConfig,
  ScheduleConstraint,
  ScheduleConstraintConfig,
  ScheduleGenerationResult,
  ScheduleTemplate,
  Team,
  Venue,
} from '@/lib/schedule/types';
import { getStandardHolidayGroupsInRange } from '@/lib/schedule/holidays';
import { QuickSetupStep } from './QuickSetupStep';
import { ReviewAndGenerateStep } from './ReviewAndGenerateStep';
import { ScheduleAvailabilityStep } from './ScheduleAvailabilityStep';
import { SchedulePublishStep } from './SchedulePublishStep';

interface SimpleScheduleWizardProps {
  seasonId: string;
  leagueId: string;
  teams: Team[];
  venues: Venue[];
  templates: ScheduleTemplate[];
  startDate: Date;
  endDate: Date;
  onComplete: (result: ScheduleGenerationResult) => void;
  onCancel: () => void;
  isSaving?: boolean;
  hasExistingSchedule?: boolean;
}

type BuilderStep = 'basics' | 'availability' | 'review' | 'publish';

const STEPS: { id: BuilderStep; label: string; icon: React.ReactNode }[] = [
  { id: 'basics', label: 'Basics', icon: <Calendar className="h-4 w-4" /> },
  { id: 'availability', label: 'Availability', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'review', label: 'Review', icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'publish', label: 'Publish', icon: <Check className="h-4 w-4" /> },
];

function getDefaultConfig(startDate: Date, endDate: Date): ScheduleConfig {
  const effectiveStart = new Date(startDate);
  const defaultGameDays = [1, 3];

  let availableSlots = 0;
  const current = new Date(effectiveStart);
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(endDate);
  endNorm.setHours(23, 59, 59, 999);
  while (current <= endNorm) {
    if (defaultGameDays.includes(current.getDay())) availableSlots++;
    current.setDate(current.getDate() + 1);
  }

  const gamesPerTeam = availableSlots > 0 ? availableSlots : 14;
  const allHolidayDates = getStandardHolidayGroupsInRange(effectiveStart, endDate).flatMap(
    (holiday) => holiday.dates
  );

  return {
    scheduleType: 'round_robin',
    gamesPerTeam,
    allowBackToBack: false,
    homeAwayBalance: true,
    divisionGamesRatio: 0.6,
    divisionAware: true,
    crossDivisionGamesPerTeam: 2,
    gameDays: defaultGameDays,
    gameTimes: ['19:00', '20:30', '22:00'],
    gameDurationMinutes: 60,
    startDate: effectiveStart,
    endDate,
    allowByeWeeks: false,
    byeWeeksPerTeam: 1,
    defaultVenueId: null,
    rotateHomeVenue: true,
    skipHolidays: true,
    holidayDates: allHolidayDates,
    playoffFormat: 'none',
    playoffTeams: 8,
    playoffQualificationMode: 'count',
    playoffPercentage: 50,
  };
}

export function SimpleScheduleWizard({
  seasonId,
  leagueId,
  teams,
  venues,
  templates: _templates,
  startDate,
  endDate,
  onComplete,
  onCancel,
  isSaving = false,
  hasExistingSchedule = false,
}: SimpleScheduleWizardProps) {
  const [currentStep, setCurrentStep] = useState<BuilderStep>('basics');
  const [config, setConfig] = useState<ScheduleConfig>(() => getDefaultConfig(startDate, endDate));
  const [generationResult, setGenerationResult] = useState<ScheduleGenerationResult | null>(null);
  const [aiConstraints, setAiConstraints] = useState<ScheduleConstraint[]>([]);
  const [aiConstraintConfig, setAiConstraintConfig] = useState<Partial<ScheduleConstraintConfig>>(
    {}
  );

  const currentStepIndex = STEPS.findIndex((step) => step.id === currentStep);

  const goToNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  }, [currentStepIndex]);

  const goToPrevious = useCallback(() => {
    const previousIndex = currentStepIndex - 1;
    if (previousIndex >= 0) {
      setCurrentStep(STEPS[previousIndex].id);
    }
  }, [currentStepIndex]);

  const handleConstraintsFromAI = useCallback(
    (constraints: ScheduleConstraint[], constraintConfig: Partial<ScheduleConstraintConfig>) => {
      setAiConstraints(constraints);
      setAiConstraintConfig(constraintConfig);
    },
    []
  );

  const handleGenerationResult = useCallback((result: ScheduleGenerationResult) => {
    setGenerationResult(result);
    if (result.success) {
      setCurrentStep('publish');
    }
  }, []);

  const handlePublish = useCallback(() => {
    if (generationResult?.success) {
      onComplete(generationResult);
    }
  }, [generationResult, onComplete]);

  const canAdvance =
    currentStep === 'basics'
      ? config.gameDays.length > 0 && config.gameTimes.length > 0 && teams.length >= 4
      : currentStep !== 'publish';

  const additionalIceSlots: AdditionalIceSlot[] = [];

  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="flex-shrink-0 border-b border-neutral-800 p-4">
        <h2 className="mb-4 text-xl font-bold text-white">Build season schedule</h2>

        <nav aria-label="Progress">
          <ol className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = step.id === currentStep;

              return (
                <li key={step.id} className="flex items-center">
                  {index > 0 && (
                    <div
                      className={cn(
                        'mx-2 h-0.5 w-8',
                        isCompleted ? 'bg-rink-500' : 'bg-neutral-700'
                      )}
                    />
                  )}
                  <button
                    onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
                    disabled={index > currentStepIndex}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isCurrent && 'bg-rink-500/10 text-rink-500 ring-1 ring-rink-500/30',
                      isCompleted && !isCurrent && 'text-rink-500 hover:bg-neutral-800',
                      !isCurrent && !isCompleted && 'cursor-not-allowed text-neutral-500'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                        isCurrent && 'bg-rink-500 text-black',
                        isCompleted && !isCurrent && 'bg-rink-500/20 text-rink-500',
                        !isCurrent && !isCompleted && 'bg-neutral-700 text-neutral-400'
                      )}
                    >
                      {isCompleted ? <Check className="h-3 w-3" /> : step.icon}
                    </span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {currentStep === 'basics' && (
          <QuickSetupStep config={config} setConfig={setConfig} venues={venues} teams={teams} />
        )}

        {currentStep === 'availability' && (
          <ScheduleAvailabilityStep
            leagueId={leagueId}
            seasonId={seasonId}
            teams={teams}
            config={config}
            setConfig={setConfig}
            onConstraintsFromAI={handleConstraintsFromAI}
          />
        )}

        {currentStep === 'review' && (
          <ReviewAndGenerateStep
            seasonId={seasonId}
            leagueId={leagueId}
            config={config}
            teams={teams}
            venues={venues}
            templateId={null}
            additionalIceSlots={additionalIceSlots}
            onResult={handleGenerationResult}
            onSave={handlePublish}
            isSaving={isSaving}
            hasExistingSchedule={hasExistingSchedule}
          />
        )}

        {currentStep === 'publish' && generationResult && (
          <SchedulePublishStep
            result={generationResult}
            teams={teams}
            isSaving={isSaving}
            hasExistingSchedule={hasExistingSchedule}
            onPublish={handlePublish}
          />
        )}
      </div>

      <div className="flex-shrink-0 border-t border-neutral-800 p-4">
        <div className="mb-3 text-xs text-neutral-500">
          {aiConstraints.length > 0 || Object.keys(aiConstraintConfig).length > 0 ? (
            <span>
              Manual and AI-based availability rules will be included in the draft review.
            </span>
          ) : (
            <span>Keep the setup simple. You can add more rules later if needed.</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {currentStepIndex > 0 && (
              <button
                onClick={goToPrevious}
                className="flex items-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}

            {currentStep !== 'review' && currentStep !== 'publish' && (
              <button
                onClick={goToNext}
                disabled={!canAdvance}
                className="flex items-center gap-2 rounded-lg bg-rink-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-rink-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
