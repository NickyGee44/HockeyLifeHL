'use client';

import { MapPin, Calendar, Users, MessageSquare } from 'lucide-react';
import type { RegistrationDraftData, LeagueFormConfig } from '@/lib/actions/registration';

interface StepLeaguePreferencesProps {
  formData: RegistrationDraftData;
  leagueFormConfig: LeagueFormConfig;
  onUpdate: (updates: Partial<RegistrationDraftData>) => void;
}

const inputClass =
  'w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50';

const selectClass =
  'w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50';

const yesNoOptions = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

function YesNoToggle({
  value,
  onChange,
  label,
  required = false,
}: {
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
  label: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="flex gap-2">
        {yesNoOptions.map((opt) => {
          const isSelected = opt.value === 'true' ? value === true : value === false;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value === 'true')}
              className={`px-5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                isSelected
                  ? 'border-[var(--league-primary)] bg-[var(--league-primary)]/10 text-[var(--league-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-emphasis)]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StepLeaguePreferences({
  formData,
  leagueFormConfig,
  onUpdate,
}: StepLeaguePreferencesProps) {
  const fields = leagueFormConfig.enabled_fields ?? {};
  const levels = leagueFormConfig.levels ?? [];
  const locations = leagueFormConfig.locations ?? [];
  const nights = leagueFormConfig.nights ?? [];

  const showLevel = (fields.level !== false) && levels.length > 0;
  const showLocation = (fields.location_preference !== false) && locations.length > 0;
  const showNight = (fields.preferred_night !== false) && nights.length > 0;
  const showReferral = fields.referral_source !== false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--league-primary)]" />
          League Preferences
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Help us place you in the right spot. All fields help the league organize the season.
        </p>
      </div>

      {/* Prior season */}
      <YesNoToggle
        label="Did you play last season?"
        value={formData.played_last_season}
        onChange={(v) =>
          onUpdate({
            played_last_season: v,
            prior_organization: v ? formData.prior_organization : '',
            team_last_season: v ? formData.team_last_season : '',
          })
        }
      />

      {formData.played_last_season === true && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-1 border-l-2 border-[var(--league-primary)]/30 ml-1">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Which organization?
            </label>
            <input
              type="text"
              value={formData.prior_organization || ''}
              onChange={(e) => onUpdate({ prior_organization: e.target.value })}
              placeholder="e.g. BMHL, City Rec League"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Team name last season
            </label>
            <input
              type="text"
              value={formData.team_last_season || ''}
              onChange={(e) => onUpdate({ team_last_season: e.target.value })}
              placeholder="e.g. The Pucks"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Division / Level */}
      {showLevel && (
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[var(--league-primary)]" />
            Division / Level
          </label>
          <select
            value={formData.level || ''}
            onChange={(e) => onUpdate({ level: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">Select a division...</option>
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Location preference */}
      {showLocation && (
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[var(--league-primary)]" />
            Location Preference
          </label>
          <select
            value={formData.location_preference || ''}
            onChange={(e) => onUpdate({ location_preference: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">No preference</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Preferred / Alternate night */}
      {showNight && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--league-primary)]" />
              Preferred Night
            </label>
            <select
              value={formData.preferred_night || ''}
              onChange={(e) => onUpdate({ preferred_night: e.target.value || undefined })}
              className={selectClass}
            >
              <option value="">No preference</option>
              {nights.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Alternate Night{' '}
              <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
            </label>
            <select
              value={formData.alternate_night || ''}
              onChange={(e) => onUpdate({ alternate_night: e.target.value || undefined })}
              className={selectClass}
            >
              <option value="">None</option>
              {nights
                .filter((n) => n !== formData.preferred_night)
                .map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Comments */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-[var(--league-primary)]" />
          Comments{' '}
          <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
        </label>
        <textarea
          value={formData.comments || ''}
          onChange={(e) => onUpdate({ comments: e.target.value })}
          rows={3}
          placeholder="Any additional information for the league..."
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Referral source */}
      {showReferral && (
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            How did you hear about us?{' '}
            <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.referral_source || ''}
            onChange={(e) => onUpdate({ referral_source: e.target.value })}
            placeholder="Friend, social media, Google..."
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
}
