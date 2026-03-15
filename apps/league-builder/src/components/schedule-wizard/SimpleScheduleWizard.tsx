'use client';

/**
 * Simple Schedule Wizard
 *
 * Streamlined 3-step schedule generator:
 * 1. Quick Setup — essential config (dates, days, times, venue, format)
 * 2. AI Assistant — conversational constraint configuration
 * 3. Review & Generate — preview, generate, and save
 *
 * The old 4-step wizard is preserved as "Advanced Mode".
 */

import { useState, useCallback } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { Check, Settings, Sparkles, Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import type {
  ScheduleConfig,
  ScheduleTemplate,
  Team,
  Venue,
  ScheduleGenerationResult,
  ScheduleConstraint,
  ScheduleConstraintConfig,
  AdditionalIceSlot,
} from '@/lib/schedule/types';
import { getStandardHolidayGroupsInRange } from '@/lib/schedule/holidays';
import { QuickSetupStep } from './QuickSetupStep';
import { AIAssistantStep } from './AIAssistantStep';
import { ReviewAndGenerateStep } from './ReviewAndGenerateStep';

// ============================================================================
// TYPES
// ============================================================================

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
  onSwitchToAdvanced?: () => void;
  isSaving?: boolean;
}

type SimpleStep = 'setup' | 'ai' | 'review';

const STEPS: { id: SimpleStep; label: string; icon: React.ReactNode }[] = [
  { id: 'setup', label: 'Setup', icon: <Settings className="w-4 h-4" /> },
  { id: 'ai', label: 'AI Assistant', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'review', label: 'Generate', icon: <Calendar className="w-4 h-4" /> },
];

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

function getDefaultConfig(startDate: Date, endDate: Date): ScheduleConfig {
  const effectiveStart = new Date(startDate);
  const defaultGameDays = [1, 3]; // Monday, Wednesday

  // Count available game-day slots
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

  // Auto-detect all holidays in range
  const allHolidayDates = getStandardHolidayGroupsInRange(effectiveStart, endDate).flatMap(h => h.dates);

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

// ============================================================================
// COMPONENT
// ============================================================================

export function SimpleScheduleWizard({
  seasonId,
  leagueId,
  teams,
  venues,
  templates,
  startDate,
  endDate,
  onComplete,
  onCancel,
  onSwitchToAdvanced,
  isSaving = false,
}: SimpleScheduleWizardProps) {
  const [currentStep, setCurrentStep] = useState<SimpleStep>('setup');
  const [config, setConfig] = useState<ScheduleConfig>(() => getDefaultConfig(startDate, endDate));
  const [generationResult, setGenerationResult] = useState<ScheduleGenerationResult | null>(null);
  const [aiConstraints, setAiConstraints] = useState<ScheduleConstraint[]>([]);
  const [aiConstraintConfig, setAiConstraintConfig] = useState<Partial<ScheduleConstraintConfig>>({});

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const goToNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  }, [currentStepIndex]);

  const goToPrevious = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
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
  }, []);

  const handleSave = useCallback(() => {
    if (generationResult) {
      onComplete(generationResult);
    }
  }, [generationResult, onComplete]);

  const canAdvance = currentStep === 'setup'
    ? config.gameDays.length > 0 && config.gameTimes.length > 0 && teams.length >= 2
    : true;

  return (
    <div className="flex flex-col h-full bg-neutral-900 rounded-xl border border-neutral-800">
      {/* Header with Steps */}
      <div className="flex-shrink-0 border-b border-neutral-800 p-4">
        <h2 className="text-xl font-bold text-white mb-4">Generate Schedule</h2>

        <nav aria-label="Progress">
          <ol className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = step.id === currentStep;

              return (
                <li key={step.id} className="flex items-center">
                  {index > 0 && (
                    <div className={cn('w-8 h-0.5 mx-2', isCompleted ? 'bg-rink-500' : 'bg-neutral-700')} />
                  )}
                  <button
                    onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
                    disabled={index > currentStepIndex}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isCurrent && 'bg-rink-500/10 text-rink-500 ring-1 ring-rink-500/30',
                      isCompleted && !isCurrent && 'text-rink-500 hover:bg-neutral-800',
                      !isCurrent && !isCompleted && 'text-neutral-500 cursor-not-allowed'
                    )}
                  >
                    <span className={cn(
                      'flex items-center justify-center w-6 h-6 rounded-full text-xs',
                      isCurrent && 'bg-rink-500 text-black',
                      isCompleted && !isCurrent && 'bg-rink-500/20 text-rink-500',
                      !isCurrent && !isCompleted && 'bg-neutral-700 text-neutral-400'
                    )}>
                      {isCompleted ? <Check className="w-3 h-3" /> : step.icon}
                    </span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {currentStep === 'setup' && (
          <QuickSetupStep
            config={config}
            setConfig={setConfig}
            venues={venues}
            teams={teams}
          />
        )}

        {currentStep === 'ai' && (
          <AIAssistantStep
            leagueId={leagueId}
            seasonId={seasonId}
            config={config}
            setConfig={setConfig}
            onConstraintsFromAI={handleConstraintsFromAI}
            onSkip={goToNext}
            onSwitchToAdvanced={onSwitchToAdvanced ?? (() => {})}
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
            additionalIceSlots={[]}
            onResult={handleGenerationResult}
            onSave={handleSave}
            isSaving={isSaving}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-neutral-800 p-4 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          {currentStepIndex > 0 && (
            <button
              onClick={goToPrevious}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-300 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {currentStep !== 'review' && (
            <button
              onClick={goToNext}
              disabled={!canAdvance}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-rink-500 rounded-lg hover:bg-rink-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
