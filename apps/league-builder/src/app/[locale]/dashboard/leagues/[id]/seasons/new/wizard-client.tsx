'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import {
  Calendar,
  Users,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Download,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
}

interface Team {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  primary_color: string | null;
}

interface NewSeasonWizardProps {
  leagueId: string;
  leagueName: string;
  previousSeason: Season | null;
  teams: Team[];
  locale: string;
}

const STEPS = ['info', 'teams', 'rosters', 'review'] as const;
type Step = typeof STEPS[number];

export default function NewSeasonWizard({
  leagueId,
  leagueName,
  previousSeason,
  teams,
  locale,
}: NewSeasonWizardProps) {
  const t = useTranslations('season.wizard');
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>('info');
  const [creating, setCreating] = useState(false);
  const hasImportableTeams = teams.length > 0;

  // Form state
  const [seasonName, setSeasonName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [carryForwardTeams, setCarryForwardTeams] = useState(hasImportableTeams);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(
    new Set(teams.map((t) => t.id))
  );
  const [importRosters, setImportRosters] = useState(true);
  const [teamRosterImport, setTeamRosterImport] = useState<Record<string, boolean>>(
    Object.fromEntries(teams.map((t) => [t.id, true]))
  );

  const currentStepIndex = STEPS.indexOf(currentStep);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const toggleTeamRosterImport = (teamId: string) => {
    setTeamRosterImport((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  const handleCreate = async () => {
    setCreating(true);

    try {
      // Create the season via API
      const response = await fetch(`/api/leagues/${leagueId}/seasons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: seasonName,
          start_date: startDate,
          end_date: endDate,
          carry_forward_teams: carryForwardTeams,
          selected_team_ids: Array.from(selectedTeamIds),
          import_rosters: importRosters,
          team_roster_import: teamRosterImport,
          previous_season_id: previousSeason?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to create season');
      }

      const data = await response.json();

      toast.success('Season created successfully!');
      router.push(`/${locale}/dashboard/leagues/${leagueId}/schedule?season=${data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create season');
      setCreating(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'info':
        return seasonName.trim() !== '' && startDate !== '' && endDate !== '';
      case 'teams':
        return !carryForwardTeams || !hasImportableTeams || selectedTeamIds.size > 0;
      case 'rosters':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          {t('step1')} for {leagueName}
        </h1>
        <p className="text-neutral-400">
          Create a new season, bring teams forward without carrying players, and import rosters only when you want them.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isActive = currentStepIndex === index;
          const isCompleted = currentStepIndex > index;

          return (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm',
                  isActive && 'bg-rink-500 text-black',
                  isCompleted && 'bg-green-500 text-black',
                  !isActive && !isCompleted && 'bg-neutral-800 text-neutral-500'
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
              </div>
              <span
                className={cn(
                  'ml-3 text-sm font-medium hidden sm:block',
                  isActive && 'text-white',
                  isCompleted && 'text-green-500',
                  !isActive && !isCompleted && 'text-neutral-500'
                )}
              >
                {t(`step${index + 1}`)}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-12 sm:w-24 h-0.5 mx-4',
                    isCompleted ? 'bg-green-500' : 'bg-neutral-800'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        {/* Step 1: Season Info */}
        {currentStep === 'info' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-rink-500/10">
                <Calendar className="w-5 h-5 text-rink-500" />
              </div>
              <h2 className="text-lg font-bold text-white">{t('step1')}</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                {t('seasonName')}
              </label>
              <input
                type="text"
                value={seasonName}
                onChange={(e) => setSeasonName(e.target.value)}
                placeholder="e.g., Winter 2025"
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-rink-500 transition-colors"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  {t('startDate')}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-rink-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  {t('endDate')}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-rink-500 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Teams */}
        {currentStep === 'teams' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-rink-500/10">
                <Users className="w-5 h-5 text-rink-500" />
              </div>
              <h2 className="text-lg font-bold text-white">{t('step2')}</h2>
            </div>

            {/* Toggle for carry forward */}
            <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl">
              <div>
                <h3 className="font-medium text-white">{t('carryForwardTeams')}</h3>
                <p className="text-sm text-neutral-400">
                  Bring previous-season teams into this season. Players still register again each season.
                </p>
              </div>
              <button
                onClick={() => hasImportableTeams && setCarryForwardTeams(!carryForwardTeams)}
                disabled={!hasImportableTeams}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  carryForwardTeams ? 'bg-rink-500' : 'bg-neutral-700'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    carryForwardTeams ? 'translate-x-7' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {!hasImportableTeams && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                No previous-season teams were found to copy into this season. You can continue with an empty season and import teams later if they decide to join.
              </div>
            )}

            {carryForwardTeams && hasImportableTeams && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-neutral-400">
                    Select teams ({selectedTeamIds.size} / {teams.length})
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTeamIds(new Set(teams.map((t) => t.id)))}
                      className="text-xs text-rink-500 hover:text-rink-400"
                    >
                      Select All
                    </button>
                    <span className="text-neutral-600">|</span>
                    <button
                      onClick={() => setSelectedTeamIds(new Set())}
                      className="text-xs text-neutral-400 hover:text-neutral-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {teams.map((team) => {
                    const isSelected = selectedTeamIds.has(team.id);
                    return (
                      <button
                        key={team.id}
                        onClick={() => toggleTeam(team.id)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl transition-colors text-left',
                          isSelected
                            ? 'bg-rink-500/10 border border-rink-500/30'
                            : 'bg-neutral-800/50 border border-transparent hover:bg-neutral-800'
                        )}
                      >
                        <div
                          className={cn(
                            'w-5 h-5 rounded flex items-center justify-center flex-shrink-0',
                            isSelected ? 'bg-rink-500 text-white' : 'bg-neutral-700'
                          )}
                        >
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <span className="font-medium text-white">{team.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!carryForwardTeams && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-300">
                You can create the season now and import teams later from the season dashboard. Importing teams does not carry forward players or fees.
              </div>
            )}

            {!carryForwardTeams && (
              <div className="text-center py-8 bg-neutral-800/50 rounded-xl">
                <p className="text-neutral-400">{t('startFresh')}</p>
                <p className="text-sm text-neutral-500 mt-2">
                  You can import teams from the season dashboard or add them manually after the season is created.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Rosters */}
        {currentStep === 'rosters' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-rink-500/10">
                <ClipboardList className="w-5 h-5 text-rink-500" />
              </div>
              <h2 className="text-lg font-bold text-white">{t('step3')}</h2>
            </div>

            {!previousSeason ? (
              <div className="text-center py-8 bg-neutral-800/50 rounded-xl">
                <p className="text-neutral-400">No previous season to import from.</p>
                <p className="text-sm text-neutral-500 mt-2">
                  Rosters will start empty. Players can join teams after the season is created.
                </p>
              </div>
            ) : (
              <>
                {/* Toggle for import rosters */}
                <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl">
                  <div>
                    <h3 className="font-medium text-white">{t('importRosters')}</h3>
                    <p className="text-sm text-neutral-400">
                      Import player rosters from {previousSeason.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setImportRosters(!importRosters)}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors',
                      importRosters ? 'bg-rink-500' : 'bg-neutral-700'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                        importRosters ? 'translate-x-7' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                {importRosters && selectedTeamIds.size > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-neutral-400">
                        Per-team roster import
                      </span>
                      <button
                        onClick={() =>
                          setTeamRosterImport(
                            Object.fromEntries(
                              Array.from(selectedTeamIds).map((id) => [id, true])
                            )
                          )
                        }
                        className="text-xs text-rink-500 hover:text-rink-400"
                      >
                        {t('importAll')}
                      </button>
                    </div>

                    <div className="space-y-2">
                      {teams
                        .filter((team) => selectedTeamIds.has(team.id))
                        .map((team) => {
                          const willImport = teamRosterImport[team.id] ?? true;
                          return (
                            <button
                              key={team.id}
                              onClick={() => toggleTeamRosterImport(team.id)}
                              className={cn(
                                'w-full flex items-center justify-between p-3 rounded-xl transition-colors',
                                willImport
                                  ? 'bg-rink-500/10 border border-rink-500/30'
                                  : 'bg-neutral-800/50 border border-transparent hover:bg-neutral-800'
                              )}
                            >
                              <span className="font-medium text-white">{team.name}</span>
                              <div className="flex items-center gap-2">
                                {willImport && (
                                  <span className="text-xs text-green-500 flex items-center gap-1">
                                    <Download className="w-3 h-3" />
                                    Will import
                                  </span>
                                )}
                                <div
                                  className={cn(
                                    'w-5 h-5 rounded flex items-center justify-center',
                                    willImport ? 'bg-rink-500 text-white' : 'bg-neutral-700'
                                  )}
                                >
                                  {willImport && <Check className="w-4 h-4" />}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-rink-500/10">
                <CheckCircle2 className="w-5 h-5 text-rink-500" />
              </div>
              <h2 className="text-lg font-bold text-white">{t('step4')}</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-neutral-800/50 rounded-xl p-4">
                <h3 className="text-sm text-neutral-400 mb-1">Season Name</h3>
                <p className="font-medium text-white">{seasonName}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-neutral-800/50 rounded-xl p-4">
                  <h3 className="text-sm text-neutral-400 mb-1">Start Date</h3>
                  <p className="font-medium text-white">
                    {new Date(startDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-neutral-800/50 rounded-xl p-4">
                  <h3 className="text-sm text-neutral-400 mb-1">End Date</h3>
                  <p className="font-medium text-white">
                    {new Date(endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="bg-neutral-800/50 rounded-xl p-4">
                <h3 className="text-sm text-neutral-400 mb-1">Teams</h3>
                <p className="font-medium text-white">
                  {carryForwardTeams
                    ? `${selectedTeamIds.size} teams will be carried forward`
                    : 'Starting fresh with no teams'}
                </p>
              </div>

              {previousSeason && (
                <div className="bg-neutral-800/50 rounded-xl p-4">
                  <h3 className="text-sm text-neutral-400 mb-1">Roster Import</h3>
                  <p className="font-medium text-white">
                    {importRosters
                      ? `Rosters will be imported for ${Object.values(teamRosterImport).filter(Boolean).length} teams`
                      : 'No rosters will be imported'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPreviousStep}
          disabled={currentStepIndex === 0}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors',
            currentStepIndex === 0
              ? 'text-neutral-600 cursor-not-allowed'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {currentStep === 'review' ? (
          <button
            onClick={handleCreate}
            disabled={creating}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all',
              creating
                ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20'
            )}
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('creating')}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {t('reviewAndCreate')}
              </>
            )}
          </button>
        ) : (
          <button
            onClick={goToNextStep}
            disabled={!canProceed()}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all',
              !canProceed()
                ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20'
            )}
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
