'use client';

/**
 * Schedule Wizard Component
 *
 * Multi-step wizard for generating a season schedule.
 */

import { useState, useCallback, useRef } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { Check, Calendar, Settings, AlertCircle, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import type {
  ScheduleConfig,
  ScheduleTemplate,
  Team,
  Venue,
  ScheduleGenerationResult } from '@/lib/schedule/types';
import { bulkSaveLeagueTeamPreferences } from '@/lib/schedule/actions';
import { ScheduleConfigStep } from './ScheduleConfigStep';
import { EnhancedConstraintStep, type ConstraintData } from './EnhancedConstraintStep';
import { PreviewStep } from './PreviewStep';
import { ResultStep } from './ResultStep';

// ============================================================================
// TYPES
// ============================================================================

interface ScheduleWizardProps {
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
}

type WizardStep = 'config' | 'constraints' | 'preview' | 'result';

const STEPS: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'config', label: 'Configuration', icon: <Settings className="w-4 h-4" /> },
  { id: 'constraints', label: 'Constraints', icon: <AlertCircle className="w-4 h-4" /> },
  { id: 'preview', label: 'Preview', icon: <Calendar className="w-4 h-4" /> },
  { id: 'result', label: 'Complete', icon: <Check className="w-4 h-4" /> },
];

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

/** Count available game day slots between two dates for the given day-of-week set. */
function countAvailableGameDays(start: Date, end: Date, gameDays: number[]): number {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(23, 59, 59, 999);
  while (current <= endNorm) {
    if (gameDays.includes(current.getDay())) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function getDefaultConfig(startDate: Date, endDate: Date): ScheduleConfig {
  // Use the season's actual start date — no clamping to today.
  // Users control the range via the date pickers in the config step.
  const effectiveStart = new Date(startDate);

  const defaultGameDays = [1, 3]; // Monday, Wednesday
  // Auto-calculate gamesPerTeam to fill all available game-day slots in the date range
  const availableSlots = countAvailableGameDays(effectiveStart, endDate, defaultGameDays);
  const gamesPerTeam = availableSlots > 0 ? availableSlots : 14;

  return {
    scheduleType: 'round_robin',
    gamesPerTeam,
    allowBackToBack: false,
    homeAwayBalance: true,
    divisionGamesRatio: 0.6,
    divisionAware: true, // Default on — falls back gracefully when no divisions
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
    holidayDates: [],
    playoffFormat: 'none',
    playoffTeams: 8,
    playoffQualificationMode: 'count',
    playoffPercentage: 50 };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduleWizard({
  seasonId,
  leagueId,
  teams,
  venues,
  templates,
  startDate,
  endDate,
  onComplete,
  onCancel,
  isSaving = false }: ScheduleWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('config');
  const [config, setConfig] = useState<ScheduleConfig>(() => getDefaultConfig(startDate, endDate));
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<ScheduleGenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [constraintData, setConstraintData] = useState<ConstraintData | null>(null);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  // Track which team preferences have already been bulk-saved to avoid re-saving on back/next
  const savedPreferencesRef = useRef(false);

  // Handle constraint data changes from enhanced constraint step
  const handleConstraintsChange = useCallback((data: ConstraintData) => {
    setConstraintData(data);
    setConstraints(data.basicConstraints.map((c) => c.id));
  }, []);

  // Get current step index
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Navigation
  const goToNext = useCallback(async () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= STEPS.length) return;

    // When leaving the constraints step, persist team preferences as league-wide
    // defaults so they auto-load the next time the wizard opens (any season).
    if (currentStep === 'constraints' && !savedPreferencesRef.current) {
      const prefs = constraintData?.teamPreferences ?? [];
      if (prefs.length > 0) {
        setIsSavingPreferences(true);
        try {
          await bulkSaveLeagueTeamPreferences(leagueId, prefs);
          savedPreferencesRef.current = true;
        } catch (e) {
          console.error('Failed to persist team preferences:', e);
        } finally {
          setIsSavingPreferences(false);
        }
      }
    }

    setCurrentStep(STEPS[nextIndex].id);
  }, [currentStepIndex, currentStep, constraintData, leagueId]);

  const goToPrevious = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  // Apply template
  const applyTemplate = useCallback(
    (template: ScheduleTemplate) => {
      setConfig({
        ...template,
        startDate: config.startDate,
        endDate: config.endDate });
      setSelectedTemplateId(template.id);
    },
    [config.startDate, config.endDate]
  );

  // Handle generation result
  const handleGenerationResult = useCallback(
    (result: ScheduleGenerationResult) => {
      setGenerationResult(result);
      setIsGenerating(false);
      if (result.success) {
        setCurrentStep('result');
      } else {
        setError(result.error ?? 'Failed to generate schedule');
      }
    },
    []
  );

  // Handle save
  const handleSave = useCallback(() => {
    if (generationResult) {
      onComplete(generationResult);
    }
  }, [generationResult, onComplete]);

  return (
    <div className="flex flex-col h-full bg-neutral-900 rounded-xl border border-neutral-800">
      {/* Header with Steps */}
      <div className="flex-shrink-0 border-b border-neutral-800 p-4">
        <h2 className="text-xl font-bold text-white mb-4">Generate Schedule</h2>

        {/* Step Indicators */}
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
                        'w-8 h-0.5 mx-2',
                        isCompleted ? 'bg-rink-500' : 'bg-neutral-700'
                      )}
                    />
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
                    <span
                      className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-full text-xs',
                        isCurrent && 'bg-rink-500 text-black',
                        isCompleted && !isCurrent && 'bg-rink-500/20 text-rink-500',
                        !isCurrent && !isCompleted && 'bg-neutral-700 text-neutral-400'
                      )}
                    >
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
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {currentStep === 'config' && (
          <ScheduleConfigStep
            config={config}
            setConfig={setConfig}
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onApplyTemplate={applyTemplate}
            venues={venues}
            teams={teams}
            teamCount={teams.length}
          />
        )}

        {currentStep === 'constraints' && (
          <EnhancedConstraintStep
            seasonId={seasonId}
            leagueId={leagueId}
            teams={teams}
            venues={venues}
            onConstraintsChange={handleConstraintsChange}
          />
        )}

        {currentStep === 'preview' && (
          <PreviewStep
            seasonId={seasonId}
            leagueId={leagueId}
            config={config}
            teams={teams}
            templateId={selectedTemplateId}
            additionalIceSlots={constraintData?.additionalIceSlots ?? []}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            onResult={handleGenerationResult}
          />
        )}

        {currentStep === 'result' && generationResult && (
          <ResultStep
            result={generationResult}
            teams={teams}
            onSave={handleSave}
          />
        )}
      </div>

      {/* Footer with Navigation */}
      <div className="flex-shrink-0 border-t border-neutral-800 p-4 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          {currentStepIndex > 0 && currentStep !== 'result' && (
            <button
              onClick={goToPrevious}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-300 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {currentStep !== 'result' && currentStep !== 'preview' && (
            <button
              onClick={goToNext}
              disabled={isSavingPreferences}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-rink-500 rounded-lg hover:bg-rink-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSavingPreferences ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {currentStep === 'preview' && !isGenerating && (
            <button
              onClick={() => {
                setIsGenerating(true);
                // The PreviewStep will handle the actual generation
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-rink-500 rounded-lg hover:bg-rink-600 transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Generate Schedule
                </>
              )}
            </button>
          )}

          {currentStep === 'result' && generationResult?.success && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-rink-500 rounded-lg hover:bg-rink-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Schedule
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
