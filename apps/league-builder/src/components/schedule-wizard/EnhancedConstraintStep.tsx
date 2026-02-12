'use client';

/**
 * Enhanced Constraint Step
 *
 * Complete constraint configuration for schedule generation with tabs for:
 * - Venue Constraints (home ice, availability, blackouts)
 * - Time Slot Constraints (late night limits, early morning, weekend distribution)
 * - Team Priority Rules (seniority, new team penalties)
 * - Basic Constraints (blackout dates - legacy)
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { MapPin, Clock, Trophy, Calendar, Loader2 } from 'lucide-react';
import type {
  Team,
  Venue,
  ScheduleConstraint,
  VenueAvailability,
  VenueBlackoutDate,
  TeamSchedulePreference,
  ScheduleConstraintConfig,
} from '@/lib/schedule/types';
import {
  getScheduleConstraints,
  getVenueAvailability,
  getVenueBlackoutDates,
  getTeamSchedulePreferences,
  getScheduleConstraintConfig,
} from '@/lib/schedule/actions';
import { VenueConstraintsTab } from './VenueConstraintsTab';
import { TimeSlotConstraintsTab } from './TimeSlotConstraintsTab';
import { TeamPriorityTab } from './TeamPriorityTab';
import { ConstraintStep as BasicConstraintStep } from './ConstraintStep';

// ============================================================================
// TYPES
// ============================================================================

interface EnhancedConstraintStepProps {
  seasonId: string;
  leagueId: string;
  teams: Team[];
  venues: Venue[];
  onConstraintsChange: (data: ConstraintData) => void;
}

export interface ConstraintData {
  basicConstraints: ScheduleConstraint[];
  venueAvailability: VenueAvailability[];
  venueBlackouts: VenueBlackoutDate[];
  teamPreferences: TeamSchedulePreference[];
  constraintConfig: Partial<ScheduleConstraintConfig>;
  teamHomeVenues: Record<string, string | null>;
}

type TabId = 'venue' | 'time' | 'priority' | 'basic';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'venue', label: 'Venues', icon: <MapPin className="w-4 h-4" /> },
  { id: 'time', label: 'Time Slots', icon: <Clock className="w-4 h-4" /> },
  { id: 'priority', label: 'Priority', icon: <Trophy className="w-4 h-4" /> },
  { id: 'basic', label: 'Blackouts', icon: <Calendar className="w-4 h-4" /> },
];

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONSTRAINT_CONFIG: Partial<ScheduleConstraintConfig> = {
  maxGamesPerVenuePerDay: 4,
  enforceHomeVenueAssignments: true,
  earlyMorningEndTime: '10:00',
  lateNightStartTime: '21:00',
  globalMaxLateNightGamesPerTeam: null,
  globalMaxEarlyMorningGamesPerTeam: null,
  enforceSeniorityPreferences: false,
  seniorityWeight: 0.5,
  targetWeekendGamePercentage: 50,
  weekendTolerancePercentage: 10,
  newTeamPenaltyWeeks: 0,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function EnhancedConstraintStep({
  seasonId,
  leagueId,
  teams,
  venues,
  onConstraintsChange,
}: EnhancedConstraintStepProps) {
  const [activeTab, setActiveTab] = useState<TabId>('venue');
  const [isLoading, setIsLoading] = useState(true);

  // State for all constraint data
  const [basicConstraints, setBasicConstraints] = useState<ScheduleConstraint[]>([]);
  const [venueAvailability, setVenueAvailability] = useState<VenueAvailability[]>([]);
  const [venueBlackouts, setVenueBlackouts] = useState<VenueBlackoutDate[]>([]);
  const [teamPreferences, setTeamPreferences] = useState<TeamSchedulePreference[]>([]);
  const [constraintConfig, setConstraintConfig] = useState<Partial<ScheduleConstraintConfig>>(
    DEFAULT_CONSTRAINT_CONFIG
  );
  const [teamHomeVenues, setTeamHomeVenues] = useState<Record<string, string | null>>({});

  // Load existing data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [
          constraintsData,
          availabilityData,
          blackoutsData,
          preferencesData,
          configData,
        ] = await Promise.all([
          getScheduleConstraints(seasonId),
          getVenueAvailability(leagueId, seasonId),
          getVenueBlackoutDates(leagueId),
          getTeamSchedulePreferences(leagueId, seasonId),
          getScheduleConstraintConfig(seasonId),
        ]);

        setBasicConstraints(constraintsData);
        setVenueAvailability(availabilityData);
        setVenueBlackouts(blackoutsData);
        setTeamPreferences(preferencesData);

        if (configData) {
          setConstraintConfig(configData);
        }

        // Initialize team home venues from team data
        const homeVenues: Record<string, string | null> = {};
        teams.forEach((team) => {
          homeVenues[team.id] = team.homeVenueId;
        });
        setTeamHomeVenues(homeVenues);
      } catch (error) {
        console.error('Error loading constraint data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [seasonId, leagueId, teams]);

  // Notify parent of changes
  useEffect(() => {
    if (!isLoading) {
      onConstraintsChange({
        basicConstraints,
        venueAvailability,
        venueBlackouts,
        teamPreferences,
        constraintConfig,
        teamHomeVenues,
      });
    }
  }, [
    basicConstraints,
    venueAvailability,
    venueBlackouts,
    teamPreferences,
    constraintConfig,
    teamHomeVenues,
    isLoading,
    onConstraintsChange,
  ]);

  // Update constraint config
  const handleConstraintConfigChange = useCallback(
    (updates: Partial<ScheduleConstraintConfig>) => {
      setConstraintConfig((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // Update team home venue
  const handleTeamHomeVenueChange = useCallback((teamId: string, venueId: string | null) => {
    setTeamHomeVenues((prev) => ({ ...prev, [teamId]: venueId }));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-rink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-white">Schedule Constraints</h3>
        <p className="text-sm text-neutral-400">
          Configure venue, time slot, and team priority constraints for schedule generation.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-neutral-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-rink-500 text-rink-500'
                : 'border-transparent text-neutral-400 hover:text-white'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'venue' && (
          <VenueConstraintsTab
            leagueId={leagueId}
            seasonId={seasonId}
            teams={teams}
            venues={venues}
            venueAvailability={venueAvailability}
            venueBlackouts={venueBlackouts}
            maxGamesPerVenuePerDay={constraintConfig.maxGamesPerVenuePerDay ?? 4}
            onVenueAvailabilityChange={setVenueAvailability}
            onVenueBlackoutsChange={setVenueBlackouts}
            onMaxGamesChange={(max) => handleConstraintConfigChange({ maxGamesPerVenuePerDay: max })}
            onTeamHomeVenueChange={handleTeamHomeVenueChange}
          />
        )}

        {activeTab === 'time' && (
          <TimeSlotConstraintsTab
            teams={teams}
            teamPreferences={teamPreferences}
            constraintConfig={constraintConfig}
            onTeamPreferencesChange={setTeamPreferences}
            onConstraintConfigChange={handleConstraintConfigChange}
          />
        )}

        {activeTab === 'priority' && (
          <TeamPriorityTab
            teams={teams}
            teamPreferences={teamPreferences}
            constraintConfig={constraintConfig}
            onTeamPreferencesChange={setTeamPreferences}
            onConstraintConfigChange={handleConstraintConfigChange}
          />
        )}

        {activeTab === 'basic' && (
          <BasicConstraintStep
            seasonId={seasonId}
            leagueId={leagueId}
            teams={teams}
            venues={venues}
            constraints={basicConstraints.map((c) => c.id)}
            setConstraints={(idsOrUpdater) => {
              // The BasicConstraintStep manages full constraint objects internally
              // and uses this setter to keep the parent's ID list in sync.
              // We need to support both direct values and function updaters.
              setBasicConstraints((prev) => {
                const currentIds = prev.map((c) => c.id);
                const newIds = typeof idsOrUpdater === 'function'
                  ? idsOrUpdater(currentIds)
                  : idsOrUpdater;

                // For removals, filter out constraints no longer in the list
                const filtered = prev.filter((c) => newIds.includes(c.id));

                // If new IDs were added that we don't have objects for yet,
                // they will be loaded by the BasicConstraintStep's internal state.
                // The parent effect will re-sync on next render.
                return filtered;
              });
            }}
          />
        )}
      </div>

      {/* Constraint Summary */}
      <div className="mt-6 p-4 bg-neutral-800/30 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-3">Constraint Summary</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-neutral-400">Venue Slots</div>
            <div className="text-white font-medium">{venueAvailability.length}</div>
          </div>
          <div>
            <div className="text-neutral-400">Blackout Dates</div>
            <div className="text-white font-medium">{venueBlackouts.length}</div>
          </div>
          <div>
            <div className="text-neutral-400">Team Preferences</div>
            <div className="text-white font-medium">{teamPreferences.length}</div>
          </div>
          <div>
            <div className="text-neutral-400">Basic Constraints</div>
            <div className="text-white font-medium">{basicConstraints.length}</div>
          </div>
        </div>

        {constraintConfig.enforceSeniorityPreferences && (
          <div className="mt-3 pt-3 border-t border-neutral-700 text-sm">
            <span className="text-neutral-400">Seniority Enforcement:</span>{' '}
            <span className="text-rink-500">
              Active ({Math.round((constraintConfig.seniorityWeight ?? 0.5) * 100)}% weight)
            </span>
          </div>
        )}

        {(constraintConfig.globalMaxLateNightGamesPerTeam != null ||
          constraintConfig.globalMaxEarlyMorningGamesPerTeam != null) && (
          <div className="mt-2 text-sm">
            <span className="text-neutral-400">Time Limits:</span>{' '}
            {constraintConfig.globalMaxLateNightGamesPerTeam != null && (
              <span className="text-yellow-500 mr-3">
                Max {constraintConfig.globalMaxLateNightGamesPerTeam} late night
              </span>
            )}
            {constraintConfig.globalMaxEarlyMorningGamesPerTeam != null && (
              <span className="text-blue-400">
                Max {constraintConfig.globalMaxEarlyMorningGamesPerTeam} early morning
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
