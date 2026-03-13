'use client';

import type { RegistrationDraftData, LeagueFormConfig } from '@/lib/actions/registration';
import type { PreviousTeamOption } from '@/lib/registration/intents';
import {
  formatRegistrationIntent,
  formatTeamReturnStatus,
} from '@/lib/registration/intents';

interface StepPersonalInfoProps {
  formData: RegistrationDraftData;
  teams: { id: string; name: string }[];
  leagueFormConfig: LeagueFormConfig;
  previousTeams: PreviousTeamOption[];
  confirmedTeamIds: string[];
  teamReturnStatuses: Record<string, NonNullable<RegistrationDraftData['team_return_status']>>;
  onUpdate: (updates: Partial<RegistrationDraftData>) => void;
}

function resolveTeamReturnStatus(
  teamId: string | null,
  teamReturnStatuses: Record<string, NonNullable<RegistrationDraftData['team_return_status']>>
) {
  if (!teamId) return 'pending_team_return';
  return teamReturnStatuses[teamId] || 'pending_team_return';
}

export function StepPersonalInfo({
  formData,
  teams,
  leagueFormConfig,
  previousTeams,
  confirmedTeamIds: _confirmedTeamIds,
  teamReturnStatuses,
  onUpdate,
}: StepPersonalInfoProps) {
  const showPaidTeamRep = leagueFormConfig.enabled_fields?.paid_team_rep !== false;

  const updateIntent = (intent: NonNullable<RegistrationDraftData['registration_intent']>) => {
    if (intent === 'free_agent') {
      onUpdate({
        registration_intent: intent,
        registration_type: 'free_agent',
        team_id: null,
        requested_team_id: null,
        requested_team_name: '',
        team_return_status: 'not_applicable',
      });
      return;
    }

    if (intent === 'captain_application') {
      onUpdate({
        registration_intent: intent,
        registration_type: 'team_registration',
        team_id: null,
        requested_team_id: null,
        requested_team_name: formData.requested_team_name || formData.previous_team_name || '',
        team_return_status: 'new_team_request',
      });
      return;
    }

    if (intent === 'return_to_previous_team') {
      const previousTeam =
        previousTeams.find((team) => team.teamId === formData.previous_team_id) || previousTeams[0];
      const teamReturnStatus = resolveTeamReturnStatus(previousTeam?.teamId || null, teamReturnStatuses);
      onUpdate({
        registration_intent: intent,
        registration_type: 'team_registration',
        previous_team_id: previousTeam?.teamId || null,
        previous_team_name: previousTeam?.teamName || '',
        previous_season_id: previousTeam?.seasonId || null,
        previous_season_name: previousTeam?.seasonName || '',
        played_last_season: true,
        team_last_season: previousTeam?.teamName || '',
        team_id: teamReturnStatus === 'confirmed' ? previousTeam?.teamId || null : null,
        team_return_status: teamReturnStatus,
      });
      return;
    }

    onUpdate({
      registration_intent: intent,
      registration_type: 'team_registration',
      team_id: formData.requested_team_id && teamReturnStatuses[formData.requested_team_id] === 'confirmed'
        ? formData.requested_team_id
        : null,
      team_return_status: resolveTeamReturnStatus(formData.requested_team_id || null, teamReturnStatuses),
    });
  };

  const handlePreviousTeamChange = (teamId: string) => {
    const previousTeam = previousTeams.find((team) => team.teamId === teamId);
    const teamReturnStatus = resolveTeamReturnStatus(teamId, teamReturnStatuses);

    onUpdate({
      previous_team_id: previousTeam?.teamId || null,
      previous_team_name: previousTeam?.teamName || '',
      previous_season_id: previousTeam?.seasonId || null,
      previous_season_name: previousTeam?.seasonName || '',
      played_last_season: true,
      team_last_season: previousTeam?.teamName || '',
      team_id: teamReturnStatus === 'confirmed' ? teamId : null,
      team_return_status: teamReturnStatus,
      registration_intent: 'return_to_previous_team',
      registration_type: 'team_registration',
    });
  };

  const handleRequestedTeamChange = (teamId: string) => {
    const requestedTeam = teams.find((team) => team.id === teamId);
    const teamReturnStatus = resolveTeamReturnStatus(teamId || null, teamReturnStatuses);

    onUpdate({
      requested_team_id: teamId || null,
      requested_team_name: requestedTeam?.name || '',
      team_id: teamReturnStatus === 'confirmed' ? teamId : null,
      team_return_status: teamReturnStatus,
      registration_intent: 'join_team',
      registration_type: 'team_registration',
    });
  };

  const intent = formData.registration_intent || 'free_agent';

  const registrationOptions = [
    ...(previousTeams.length > 0
      ? [
          {
            value: 'return_to_previous_team' as const,
            label: 'Return to my previous team',
            desc: 'Fast path for returning players',
          },
        ]
      : []),
    {
      value: 'join_team' as const,
      label: 'Join a different team',
      desc: 'Choose a team for this season',
    },
    {
      value: 'free_agent' as const,
      label: 'I need a team',
      desc: 'Join the free agent pool',
    },
    {
      value: 'captain_application' as const,
      label: 'Bring in a team / captain',
      desc: 'Request approval to captain or enter a team',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
          Personal Information
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Start by choosing how you&apos;re joining this season, then confirm your player details.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--color-text-primary)]">
          How are you registering this season?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {registrationOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateIntent(opt.value)}
              className={`p-4 rounded-xl border text-left transition-all ${
                intent === opt.value
                  ? 'border-[var(--league-primary)] bg-[var(--league-primary)]/10'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border-emphasis)]'
              }`}
            >
              <p className="font-semibold text-[var(--color-text-primary)]">{opt.label}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {intent === 'return_to_previous_team' && previousTeams.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-[var(--league-primary)]/20 bg-[var(--league-primary)]/5 p-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Previous Team
            </label>
            <select
              value={formData.previous_team_id || previousTeams[0]?.teamId || ''}
              onChange={(e) => handlePreviousTeamChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
            >
              {previousTeams.map((team) => (
                <option key={team.teamId} value={team.teamId}>
                  {team.teamName} · {team.seasonName}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {formatRegistrationIntent(intent)}. {formatTeamReturnStatus(formData.team_return_status)}
          </p>
        </div>
      )}

      {intent === 'join_team' && teams.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Select Team *
            </label>
            <select
              value={formData.requested_team_id || ''}
              onChange={(e) => handleRequestedTeamChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
            >
              <option value="">Select a team...</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {formatTeamReturnStatus(formData.team_return_status)}
          </p>

          {showPaidTeamRep && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Have you paid your Team Rep?
              </label>
              <div className="flex gap-2">
                {[
                  { value: true, label: 'Yes, paid' },
                  { value: false, label: 'Not yet' },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => onUpdate({ paid_team_rep: opt.value })}
                    className={`px-5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      formData.paid_team_rep === opt.value
                        ? 'border-[var(--league-primary)] bg-[var(--league-primary)]/10 text-[var(--league-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-emphasis)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {intent === 'free_agent' && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            We&apos;ll put you into the free agent pool so the league can help place you on a team.
          </p>
        </div>
      )}

      {intent === 'captain_application' && (
        <div className="space-y-4 rounded-2xl border border-[var(--league-primary)]/20 bg-[var(--league-primary)]/5 p-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Team Name / Group Name *
            </label>
            <input
              type="text"
              value={formData.requested_team_name || ''}
              onChange={(e) => onUpdate({ requested_team_name: e.target.value })}
              placeholder="e.g. Wolves, Tuesday Night Crew"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
            />
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            League staff will review this captain/team request before you&apos;re placed on a roster.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
          Full Name *
        </label>
        <input
          type="text"
          value={formData.full_name || ''}
          onChange={(e) => onUpdate({ full_name: e.target.value })}
          placeholder="John Smith"
          className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            Date of Birth *
          </label>
          <input
            type="date"
            value={formData.date_of_birth || ''}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => onUpdate({ date_of_birth: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Used for league administration only. Not shown publicly on the league site.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            placeholder="(555) 123-4567"
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
          />
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] pt-6">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 uppercase tracking-wider">
          Emergency Contact
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Contact Name *
            </label>
            <input
              type="text"
              value={formData.emergency_contact_name || ''}
              onChange={(e) => onUpdate({ emergency_contact_name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Contact Phone *
              </label>
              <input
                type="tel"
                value={formData.emergency_contact_phone || ''}
                onChange={(e) => onUpdate({ emergency_contact_phone: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Relationship
              </label>
              <input
                type="text"
                value={formData.emergency_contact_relationship || ''}
                onChange={(e) => onUpdate({ emergency_contact_relationship: e.target.value })}
                placeholder="Spouse, Parent, etc."
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
          Medical Notes / Allergies (optional)
        </label>
        <textarea
          value={formData.medical_notes || ''}
          onChange={(e) => onUpdate({ medical_notes: e.target.value })}
          rows={2}
          placeholder="Any medical conditions, allergies, or special requirements..."
          className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 resize-none"
        />
      </div>
    </div>
  );
}
