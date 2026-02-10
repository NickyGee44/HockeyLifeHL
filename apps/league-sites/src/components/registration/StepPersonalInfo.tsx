'use client';

import type { RegistrationDraftData } from '@/lib/actions/registration';

interface StepPersonalInfoProps {
  formData: RegistrationDraftData;
  teams: { id: string; name: string }[];
  onUpdate: (updates: Partial<RegistrationDraftData>) => void;
}

export function StepPersonalInfo({ formData, teams, onUpdate }: StepPersonalInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
          Personal Information
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Tell us about yourself so we can set up your player profile.
        </p>
      </div>

      {/* Registration Type */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Registration Type
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { value: 'free_agent', label: 'Free Agent', desc: 'Looking for a team' },
            { value: 'team_registration', label: 'Join a Team', desc: 'I know which team' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdate({
                registration_type: opt.value as RegistrationDraftData['registration_type'],
                team_id: opt.value === 'free_agent' ? null : formData.team_id,
              })}
              className={`p-4 rounded-xl border text-left transition-all ${
                formData.registration_type === opt.value
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

      {/* Team Selection (only for team_registration) */}
      {formData.registration_type === 'team_registration' && teams.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            Select Team
          </label>
          <select
            value={formData.team_id || ''}
            onChange={(e) => onUpdate({ team_id: e.target.value || null })}
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
      )}

      {/* Name */}
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

      {/* Phone */}
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

      {/* Emergency Contact */}
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

      {/* Medical Notes */}
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
