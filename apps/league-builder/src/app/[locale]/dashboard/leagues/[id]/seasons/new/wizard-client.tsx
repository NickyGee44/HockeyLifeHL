'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SeasonScheduleMode, SeasonSetup } from '@/lib/onboarding/types';

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

const STEPS = [
  { id: 'basics', label: 'Season basics' },
  { id: 'teams', label: 'Teams' },
  { id: 'rosters', label: 'Players' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'review', label: 'Review' },
] as const;

type Step = (typeof STEPS)[number]['id'];

const REGISTRATION_OPTIONS: Array<{ value: SeasonSetup['registrationType']; label: string; description: string }> = [
  { value: 'open_registration', label: 'Open registration', description: 'Players self-register through the normal flow.' },
  { value: 'draft', label: 'Draft', description: 'Collect players first and sort teams later.' },
  { value: 'captain_invite_only', label: 'Captain invite only', description: 'Captains or staff control roster intake.' },
];

const SCHEDULE_OPTIONS: Array<{ value: SeasonScheduleMode; label: string; description: string }> = [
  { value: 'wizard', label: 'Build in app', description: 'Use the workspace schedule builder after launch.' },
  { value: 'import_csv', label: 'Import CSV', description: 'Upload a schedule file after the season is created.' },
  { value: 'build_later', label: 'Do it later', description: 'Launch now and return when teams are ready.' },
];

const INPUT = 'w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-colors focus:border-rink-400';

export default function NewSeasonWizard({
  leagueId,
  leagueName,
  previousSeason,
  teams,
  locale,
}: NewSeasonWizardProps) {
  const router = useRouter();
  const hasImportableTeams = teams.length > 0;
  const [currentStep, setCurrentStep] = useState<Step>('basics');
  const [creating, setCreating] = useState(false);
  const [seasonName, setSeasonName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [registrationType, setRegistrationType] = useState<SeasonSetup['registrationType']>('open_registration');
  const [registrationOpensAt, setRegistrationOpensAt] = useState('');
  const [registrationClosesAt, setRegistrationClosesAt] = useState('');
  const [carryForwardTeams, setCarryForwardTeams] = useState(hasImportableTeams);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set(teams.map((team) => team.id)));
  const [importRosters, setImportRosters] = useState(previousSeason !== null);
  const [teamRosterImport, setTeamRosterImport] = useState<Record<string, boolean>>(
    Object.fromEntries(teams.map((team) => [team.id, true]))
  );
  const [gamesPerCycle, setGamesPerCycle] = useState(1);
  const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState(18);
  const [allowTeamSelection, setAllowTeamSelection] = useState(false);
  const [scheduleSetupMode, setScheduleSetupMode] = useState<SeasonScheduleMode>('wizard');

  const stepIndex = STEPS.findIndex((step) => step.id === currentStep);
  const isLastStep = stepIndex === STEPS.length - 1;

  function canProceed() {
    if (currentStep === 'basics') return seasonName.trim() !== '' && startDate !== '' && endDate !== '';
    if (currentStep === 'teams') return !carryForwardTeams || !hasImportableTeams || selectedTeamIds.size > 0;
    if (currentStep === 'schedule') return gamesPerCycle > 0 && maxPlayersPerTeam > 0;
    return true;
  }

  function next() {
    const nextStep = STEPS[stepIndex + 1];
    if (nextStep) setCurrentStep(nextStep.id);
  }

  function back() {
    const prevStep = STEPS[stepIndex - 1];
    if (prevStep) {
      setCurrentStep(prevStep.id);
      return;
    }
    router.push(`/${locale}/dashboard/leagues/${leagueId}`);
  }

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((current) => {
      const next = new Set(current);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }

  async function handleCreate() {
    if (creating) return;
    setCreating(true);

    try {
      const response = await fetch(`/api/leagues/${leagueId}/seasons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: seasonName,
          start_date: startDate,
          end_date: endDate,
          registration_type: registrationType,
          registration_opens_at: registrationOpensAt || null,
          registration_closes_at: registrationClosesAt || null,
          carry_forward_teams: carryForwardTeams,
          selected_team_ids: Array.from(selectedTeamIds),
          import_rosters: importRosters,
          team_roster_import: teamRosterImport,
          previous_season_id: previousSeason?.id ?? null,
          games_per_cycle: gamesPerCycle,
          max_players_per_team: maxPlayersPerTeam,
          allow_team_selection: allowTeamSelection,
          schedule_setup_mode: scheduleSetupMode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to create season');
      }

      const data = await response.json();
      toast.success('Season created. Opening the workspace.');
      router.push(`/${locale}/dashboard/leagues/${leagueId}/seasons/${data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create season');
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl lg:grid-cols-[260px_minmax(0,1fr)] sm:p-7">
        <aside className="rounded-[24px] border border-white/[0.08] bg-neutral-950/70 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rink-300/80">Phase 2</p>
          <h1 className="mt-3 text-2xl font-black text-white">Create the first season.</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            Keep this focused. Advanced modules stay available later inside the season workspace.
          </p>
          <div className="mt-6 space-y-3">
            {STEPS.map((step, index) => {
              const active = index === stepIndex;
              const complete = index < stepIndex;
              return (
                <div
                  key={step.id}
                  className={cn(
                    'rounded-2xl border px-4 py-3',
                    active ? 'border-rink-400/40 bg-rink-500/10' : complete ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-white/[0.06] bg-white/[0.02]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold', active ? 'bg-rink-400 text-black' : complete ? 'bg-emerald-400 text-black' : 'bg-neutral-800 text-neutral-400')}>
                      {complete ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    <p className="text-sm font-semibold text-white">{step.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="flex flex-col">
          <div className="mb-6 border-b border-white/[0.08] pb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">{STEPS[stepIndex].label}</p>
            <h2 className="mt-2 text-3xl font-black text-white">{leagueName}</h2>
          </div>

          <div className="min-h-[420px] space-y-6">
            {currentStep === 'basics' ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Season name"><input value={seasonName} onChange={(e) => setSeasonName(e.target.value)} className={INPUT} placeholder="Winter 2026" /></Field>
                  <Card title="Season launch">Create the operating shell first. Waivers, officials, playoffs, and stats stay in the follow-up checklist.</Card>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Start date"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={INPUT} /></Field>
                  <Field label="End date"><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={INPUT} /></Field>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  {REGISTRATION_OPTIONS.map((option) => (
                    <ChoiceCard key={option.value} title={option.label} description={option.description} selected={registrationType === option.value} onClick={() => setRegistrationType(option.value)} />
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Registration opens"><input type="datetime-local" value={registrationOpensAt} onChange={(e) => setRegistrationOpensAt(e.target.value)} className={INPUT} /></Field>
                  <Field label="Registration closes"><input type="datetime-local" value={registrationClosesAt} onChange={(e) => setRegistrationClosesAt(e.target.value)} className={INPUT} /></Field>
                </div>
              </>
            ) : null}

            {currentStep === 'teams' ? (
              <>
                <ToggleRow title="Carry teams forward" description="Copy participating teams into this season without forcing player carry-forward." checked={carryForwardTeams} disabled={!hasImportableTeams} onClick={() => hasImportableTeams && setCarryForwardTeams((v) => !v)} />
                {!hasImportableTeams ? <Notice tone="warn">No prior teams are available yet. You can create the season now and add teams later.</Notice> : null}
                {carryForwardTeams && hasImportableTeams ? (
                  <>
                    <div className="flex items-center justify-between text-sm text-neutral-400">
                      <span>{selectedTeamIds.size} of {teams.length} teams selected</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setSelectedTeamIds(new Set(teams.map((team) => team.id)))} className="text-rink-400 hover:text-rink-300">Select all</button>
                        <button type="button" onClick={() => setSelectedTeamIds(new Set())} className="text-neutral-400 hover:text-white">Clear</button>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {teams.map((team) => {
                        const selected = selectedTeamIds.has(team.id);
                        return (
                          <button key={team.id} type="button" onClick={() => toggleTeam(team.id)} className={cn('rounded-2xl border p-4 text-left', selected ? 'border-rink-400/30 bg-rink-500/10' : 'border-white/[0.08] bg-neutral-950/40 hover:border-white/20')}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-white">{team.name}</p>
                                <p className="text-xs text-neutral-500">{team.short_name}</p>
                              </div>
                              <span className={cn('flex h-7 w-7 items-center justify-center rounded-full border', selected ? 'border-rink-400 bg-rink-500 text-black' : 'border-white/10 bg-neutral-900 text-neutral-600')}>{selected ? <Check className="h-4 w-4" /> : null}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : null}
                {!carryForwardTeams ? <Card title="Start fresh">Launch the season first and import or create teams afterward from the workspace.</Card> : null}
              </>
            ) : null}

            {currentStep === 'rosters' ? (
              <>
                {!previousSeason ? <Card title="No previous season">Rosters will start empty. Players can be imported or added later.</Card> : null}
                {previousSeason ? (
                  <>
                    <ToggleRow title="Import player rosters" description={`Pull rosters forward from ${previousSeason.name}.`} checked={importRosters} onClick={() => setImportRosters((v) => !v)} />
                    {importRosters && selectedTeamIds.size > 0 ? (
                      <div className="space-y-2">
                        {teams.filter((team) => selectedTeamIds.has(team.id)).map((team) => {
                          const willImport = teamRosterImport[team.id] ?? true;
                          return (
                            <button key={team.id} type="button" onClick={() => setTeamRosterImport((current) => ({ ...current, [team.id]: !willImport }))} className={cn('flex w-full items-center justify-between rounded-2xl border p-4 text-left', willImport ? 'border-rink-400/30 bg-rink-500/10' : 'border-white/[0.08] bg-neutral-950/40 hover:border-white/20')}>
                              <div>
                                <p className="text-sm font-semibold text-white">{team.name}</p>
                                <p className="text-xs text-neutral-500">{willImport ? 'Roster will be imported' : 'Roster will start empty'}</p>
                              </div>
                              <span className="text-xs text-neutral-400">{willImport ? 'Import' : 'Skip'}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}

            {currentStep === 'schedule' ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Games per cycle"><input type="number" min={1} value={gamesPerCycle} onChange={(e) => setGamesPerCycle(Number(e.target.value) || 1)} className={INPUT} /></Field>
                  <Field label="Max players per team"><input type="number" min={1} value={maxPlayersPerTeam} onChange={(e) => setMaxPlayersPerTeam(Number(e.target.value) || 1)} className={INPUT} /></Field>
                </div>
                <ToggleRow title="Allow players to choose teams" description="Use this if players should select a team during registration." checked={allowTeamSelection} onClick={() => setAllowTeamSelection((v) => !v)} />
                <div className="grid gap-3 lg:grid-cols-3">
                  {SCHEDULE_OPTIONS.map((option) => (
                    <ChoiceCard key={option.value} title={option.label} description={option.description} selected={scheduleSetupMode === option.value} onClick={() => setScheduleSetupMode(option.value)} />
                  ))}
                </div>
              </>
            ) : null}

            {currentStep === 'review' ? (
              <div className="space-y-4">
                <SummaryCard title="Season basics" rows={[['Name', seasonName], ['Dates', `${formatDate(startDate)} to ${formatDate(endDate)}`], ['Registration', REGISTRATION_OPTIONS.find((option) => option.value === registrationType)?.label ?? registrationType]]} />
                <SummaryCard title="Teams and players" rows={[['Carry forward teams', carryForwardTeams ? `${selectedTeamIds.size} selected` : 'No'], ['Import rosters', importRosters ? `${Object.values(teamRosterImport).filter(Boolean).length} selected` : 'No']]} />
                <SummaryCard title="Schedule baseline" rows={[['Games per cycle', String(gamesPerCycle)], ['Max players per team', String(maxPlayersPerTeam)], ['Team choice', allowTeamSelection ? 'Players choose teams' : 'Staff assign teams'], ['Schedule plan', SCHEDULE_OPTIONS.find((option) => option.value === scheduleSetupMode)?.label ?? scheduleSetupMode]]} />
                <Card title="What happens next">You will land in the season workspace home with a checklist for teams, players, waivers, officials, schedule, playoffs, stats, website/content, and migration.</Card>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-white/[0.08] pt-5">
            <button type="button" onClick={back} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-neutral-400 hover:bg-white/[0.04] hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              {stepIndex === 0 ? 'Back to league hub' : 'Back'}
            </button>
            {isLastStep ? (
              <button type="button" disabled={creating} onClick={handleCreate} className={cn('inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold', creating ? 'cursor-not-allowed bg-neutral-800 text-neutral-500' : 'bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20')}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Create season
              </button>
            ) : (
              <button type="button" disabled={!canProceed()} onClick={next} className={cn('inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold', !canProceed() ? 'cursor-not-allowed bg-neutral-800 text-neutral-500' : 'bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20')}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-200">{label}</span>
      {children}
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-[24px] border border-white/[0.08] bg-neutral-950/40 p-5"><p className="text-sm font-semibold text-white">{title}</p><p className="mt-2 text-sm leading-6 text-neutral-400">{children}</p></div>;
}

function ToggleRow({ title, description, checked, onClick, disabled }: { title: string; description: string; checked: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-[24px] border border-white/[0.08] bg-neutral-950/40 p-5">
      <div><p className="text-sm font-semibold text-white">{title}</p><p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p></div>
      <button type="button" disabled={disabled} onClick={onClick} className={cn('relative h-7 w-14 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50', checked ? 'bg-rink-500' : 'bg-neutral-700')}>
        <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white transition-transform', checked ? 'translate-x-8' : 'translate-x-1')} />
      </button>
    </div>
  );
}

function ChoiceCard({ title, description, selected, onClick }: { title: string; description: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('rounded-[24px] border p-5 text-left', selected ? 'border-rink-400/30 bg-rink-500/10' : 'border-white/[0.08] bg-neutral-950/40 hover:border-white/20')}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-semibold text-white">{title}</p><p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p></div>
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-full border', selected ? 'border-rink-400 bg-rink-500 text-black' : 'border-white/10 bg-neutral-900 text-neutral-600')}>{selected ? <Check className="h-4 w-4" /> : null}</span>
      </div>
    </button>
  );
}

function Notice({ tone, children }: { tone: 'warn'; children: React.ReactNode }) {
  return <div className={cn('rounded-2xl border p-4 text-sm', tone === 'warn' ? 'border-amber-500/20 bg-amber-500/10 text-amber-100' : '')}>{children}</div>;
}

function SummaryCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-[24px] border border-white/[0.08] bg-neutral-950/40 p-5">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-3 last:border-b-0 last:pb-0">
            <span className="text-sm text-neutral-500">{label}</span>
            <span className="text-right text-sm font-medium text-white">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString();
}
