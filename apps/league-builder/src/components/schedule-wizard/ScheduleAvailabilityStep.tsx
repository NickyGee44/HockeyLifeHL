'use client';

import { useState } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { CalendarClock, ChevronDown, ChevronUp, Clock3, Home, Moon, Sparkles } from 'lucide-react';
import type {
  ScheduleConfig,
  ScheduleConstraint,
  ScheduleConstraintConfig,
  Team,
} from '@/lib/schedule/types';
import { AIAssistantStep } from './AIAssistantStep';

interface ScheduleAvailabilityStepProps {
  leagueId: string;
  seasonId: string;
  teams: Team[];
  config: ScheduleConfig;
  setConfig: React.Dispatch<React.SetStateAction<ScheduleConfig>>;
  onConstraintsFromAI: (
    constraints: ScheduleConstraint[],
    constraintConfig: Partial<ScheduleConstraintConfig>
  ) => void;
}

function ToggleCard({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-rink-500/10 p-3 text-rink-400">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-neutral-400">{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex h-7 w-12 items-center rounded-full border px-1 transition-colors',
            enabled
              ? 'border-rink-400/50 bg-rink-500/20 justify-end'
              : 'border-white/10 bg-white/5 justify-start'
          )}
        >
          <span
            className={cn(
              'h-5 w-5 rounded-full transition-colors',
              enabled ? 'bg-rink-400' : 'bg-neutral-500'
            )}
          />
        </button>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function ScheduleAvailabilityStep({
  leagueId,
  seasonId,
  teams,
  config,
  setConfig,
  onConstraintsFromAI,
}: ScheduleAvailabilityStepProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasDivisions = teams.some((team) => Boolean(team.divisionId));

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium text-white">Availability and rules</h3>
        <p className="text-sm text-neutral-400">
          Start with the simple rules that matter most. Advanced controls stay tucked away unless you need them.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ToggleCard
          icon={Moon}
          title="Avoid back-to-back games"
          description="Keep teams from playing again too soon unless you choose otherwise."
          enabled={!config.allowBackToBack}
          onToggle={() =>
            setConfig((prev) => ({
              ...prev,
              allowBackToBack: !prev.allowBackToBack,
            }))
          }
        />

        <ToggleCard
          icon={CalendarClock}
          title="Give teams a bye week"
          description="Spread out rest weeks across the season."
          enabled={config.allowByeWeeks}
          onToggle={() =>
            setConfig((prev) => ({
              ...prev,
              allowByeWeeks: !prev.allowByeWeeks,
            }))
          }
        >
          {config.allowByeWeeks && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-400">Bye weeks per team</span>
              <select
                value={config.byeWeeksPerTeam}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    byeWeeksPerTeam: Math.max(1, Math.min(4, Number(event.target.value) || 1)),
                  }))
                }
                className="rounded-lg border border-white/10 bg-neutral-800 px-3 py-2 text-sm text-white"
              >
                {[1, 2, 3, 4].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          )}
        </ToggleCard>

        <ToggleCard
          icon={Home}
          title="Use team home venues when possible"
          description="Try to keep home teams in their preferred rink before falling back to the default venue."
          enabled={config.rotateHomeVenue}
          onToggle={() =>
            setConfig((prev) => ({
              ...prev,
              rotateHomeVenue: !prev.rotateHomeVenue,
            }))
          }
        />

        <ToggleCard
          icon={Clock3}
          title="Skip holidays automatically"
          description="Hold back recurring games on the holiday dates you selected in basics."
          enabled={config.skipHolidays}
          onToggle={() =>
            setConfig((prev) => ({
              ...prev,
              skipHolidays: !prev.skipHolidays,
            }))
          }
        >
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-400">Game length</span>
            <select
              value={config.gameDurationMinutes}
              onChange={(event) =>
                setConfig((prev) => ({
                  ...prev,
                  gameDurationMinutes: Number(event.target.value) || 60,
                }))
              }
              className="rounded-lg border border-white/10 bg-neutral-800 px-3 py-2 text-sm text-white"
            >
              {[45, 60, 75, 90].map((value) => (
                <option key={value} value={value}>
                  {value} minutes
                </option>
              ))}
            </select>
          </div>
        </ToggleCard>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <h3 className="text-sm font-semibold text-white">Advanced controls</h3>
            <p className="mt-1 text-sm text-neutral-400">
              Use these only if you want tighter balancing rules.
            </p>
          </div>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4 text-neutral-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          )}
        </button>

        {showAdvanced && (
          <div className="mt-4 grid gap-4 border-t border-white/10 pt-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-neutral-300">Keep home and away balanced</span>
              <button
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    homeAwayBalance: !prev.homeAwayBalance,
                  }))
                }
                className={cn(
                  'flex h-11 w-full items-center rounded-xl border px-4 text-sm transition-colors',
                  config.homeAwayBalance
                    ? 'border-rink-400/40 bg-rink-500/10 text-rink-200'
                    : 'border-white/10 bg-neutral-900/60 text-neutral-400'
                )}
              >
                {config.homeAwayBalance ? 'Balanced' : 'Flexible'}
              </button>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-neutral-300">Same-division games first</span>
              <button
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    divisionAware: !prev.divisionAware,
                  }))
                }
                className={cn(
                  'flex h-11 w-full items-center rounded-xl border px-4 text-sm transition-colors',
                  config.divisionAware
                    ? 'border-rink-400/40 bg-rink-500/10 text-rink-200'
                    : 'border-white/10 bg-neutral-900/60 text-neutral-400'
                )}
                disabled={!hasDivisions}
              >
                {hasDivisions
                  ? config.divisionAware
                    ? 'Prioritized'
                    : 'Not prioritized'
                  : 'No divisions available yet'}
              </button>
            </label>

            {hasDivisions && (
              <>
                <label className="space-y-2">
                  <span className="text-sm text-neutral-300">Cross-division games per team</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={config.crossDivisionGamesPerTeam}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        crossDivisionGamesPerTeam: Math.max(
                          0,
                          Math.min(10, Number(event.target.value) || 0)
                        ),
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-neutral-900/60 px-4 py-3 text-sm text-white"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-neutral-300">Same-division priority</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(config.divisionGamesRatio * 100)}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        divisionGamesRatio: Number(event.target.value) / 100,
                      }))
                    }
                    className="w-full accent-rink-500"
                  />
                  <div className="text-xs text-neutral-500">
                    {Math.round(config.divisionGamesRatio * 100)}% of games should stay inside the division
                  </div>
                </label>
              </>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-rink-500/20 bg-rink-500/[0.05] p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-rink-300">
          <Sparkles className="h-4 w-4" />
          Describe this in plain English
        </div>
        <AIAssistantStep
          leagueId={leagueId}
          seasonId={seasonId}
          config={config}
          setConfig={setConfig}
          onConstraintsFromAI={onConstraintsFromAI}
          showSkipButton={false}
          title="AI helper"
          description="Optional. Use this if you want the system to translate a plain-English request into schedule changes."
        />
      </div>
    </div>
  );
}
