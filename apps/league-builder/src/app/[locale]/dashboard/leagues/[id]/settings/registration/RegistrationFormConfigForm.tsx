'use client';

import { useState } from 'react';
import { Save, Loader2, Plus, X, Info, ClipboardList } from 'lucide-react';
import { Button } from '@hockey-life/ui';
import { toast } from 'sonner';
import {
  updateRegistrationFormConfig,
  type RegistrationFormConfig,
} from '@/lib/actions/league-settings';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

interface RegistrationFormConfigFormProps {
  leagueId: string;
  initialConfig: RegistrationFormConfig;
  suggestedDivisions?: string[];
  suggestedVenues?: string[];
}

function TagInput({
  label,
  hint,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  hint?: string;
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput('');
  };

  const remove = (val: string) => {
    onChange(values.filter((v) => v !== val));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-300 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-neutral-500 mb-2">{hint}</p>}
      <div className="flex flex-wrap gap-2 mb-2 min-h-[2rem]">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rink-500/15 text-rink-400 text-sm border border-rink-500/30"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(v)}
              className="ml-1 hover:text-red-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {values.length === 0 && (
          <span className="text-xs text-neutral-600 italic">None configured yet</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800/50 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          className="px-3 py-2 rounded-lg bg-rink-500/20 text-rink-400 border border-rink-500/30 hover:bg-rink-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SuggestionChips({
  suggestions,
  existing,
  onAdd,
}: {
  suggestions: string[];
  existing: string[];
  onAdd: (val: string) => void;
}) {
  const unused = suggestions.filter((s) => !existing.includes(s));
  if (unused.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <span className="text-xs text-neutral-500 self-center">From your setup:</span>
      {unused.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onAdd(s)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-dashed border-neutral-600 text-neutral-400 hover:border-rink-500/50 hover:text-rink-400 transition-colors"
        >
          <Plus className="w-3 h-3" />
          {s}
        </button>
      ))}
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start justify-between gap-4 py-3 border-b border-white/5 last:border-0 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-neutral-600 text-rink-500 focus:ring-rink-500 focus:ring-offset-neutral-900 disabled:cursor-not-allowed"
        />
      </div>
    </label>
  );
}

export function RegistrationFormConfigForm({
  leagueId,
  initialConfig,
  suggestedDivisions = [],
  suggestedVenues = [],
}: RegistrationFormConfigFormProps) {
  const [levels, setLevels] = useState<string[]>(initialConfig.levels ?? []);
  const [locations, setLocations] = useState<string[]>(initialConfig.locations ?? []);
  const [nights, setNights] = useState<string[]>(initialConfig.nights ?? []);
  const [enabledFields, setEnabledFields] = useState({
    played_last_season: initialConfig.enabled_fields?.played_last_season ?? true,
    level: initialConfig.enabled_fields?.level ?? true,
    location_preference: initialConfig.enabled_fields?.location_preference ?? true,
    preferred_night: initialConfig.enabled_fields?.preferred_night ?? true,
    referral_source: initialConfig.enabled_fields?.referral_source ?? true,
    paid_team_rep: initialConfig.enabled_fields?.paid_team_rep ?? true,
  });
  const [autoApprove, setAutoApprove] = useState(initialConfig.auto_approve ?? false);
  const [saving, setSaving] = useState(false);

  const toggleNight = (night: string) => {
    setNights((prev) =>
      prev.includes(night) ? prev.filter((n) => n !== night) : [...prev, night]
    );
  };

  const setField = (key: keyof typeof enabledFields, value: boolean) => {
    setEnabledFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateRegistrationFormConfig(leagueId, {
        levels,
        locations,
        nights,
        auto_approve: autoApprove,
        enabled_fields: enabledFields,
      });

      if (result.success) {
        toast.success('Registration form configuration saved.');
      } else {
        toast.error(result.error ?? 'Failed to save configuration.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-rink-500/5 border border-rink-500/20">
        <Info className="w-4 h-4 text-rink-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-neutral-400">
          These settings control what fields appear on your league&apos;s player and team registration
          forms. Options you configure here (levels, locations, nights) appear as dropdown choices
          for registrants.
        </p>
      </div>

      {/* Divisions / Levels */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Divisions &amp; Levels</h2>
        <TagInput
          label="Divisions"
          hint="Add the divisions or levels in your league. Registrants will choose from this list."
          values={levels}
          placeholder="e.g. A Division, B Division, Recreational..."
          onChange={setLevels}
        />
        <SuggestionChips
          suggestions={suggestedDivisions}
          existing={levels}
          onAdd={(v) => setLevels((prev) => (prev.includes(v) ? prev : [...prev, v]))}
        />
      </div>

      {/* Locations */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Locations &amp; Arenas</h2>
        <TagInput
          label="Locations"
          hint="Add the arenas or rinks your league uses. Registrants can indicate a preference."
          values={locations}
          placeholder="e.g. Memorial Arena, Barrie Molson Centre..."
          onChange={setLocations}
        />
        <SuggestionChips
          suggestions={suggestedVenues}
          existing={locations}
          onAdd={(v) => setLocations((prev) => (prev.includes(v) ? prev : [...prev, v]))}
        />
      </div>

      {/* Game Nights */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Game Nights</h2>
        <p className="text-xs text-neutral-500 mb-4">
          Select the nights your league plays. Registrants will choose preferred and alternate
          nights from this list.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const selected = nights.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleNight(day)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  selected
                    ? 'border-rink-500 bg-rink-500/15 text-rink-400'
                    : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Optional Field Toggles */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-1">Optional Fields</h2>
        <p className="text-xs text-neutral-500 mb-5">
          Toggle which optional fields appear on the registration form. Platform-required fields
          (name, emergency contact, waiver) are always shown.
        </p>
        <div>
          <ToggleField
            label="Prior Season"
            description='Show "Did you play last season?" with organization and team name fields'
            checked={enabledFields.played_last_season}
            onChange={(v) => setField('played_last_season', v)}
          />
          <ToggleField
            label="Division / Level Selection"
            description="Show a division dropdown. Only applies when divisions are configured above."
            checked={enabledFields.level}
            onChange={(v) => setField('level', v)}
            disabled={levels.length === 0}
          />
          <ToggleField
            label="Location Preference"
            description="Show a location/arena preference dropdown. Only applies when locations are configured above."
            checked={enabledFields.location_preference}
            onChange={(v) => setField('location_preference', v)}
            disabled={locations.length === 0}
          />
          <ToggleField
            label="Preferred Night"
            description="Show preferred and alternate game night dropdowns. Only applies when nights are configured above."
            checked={enabledFields.preferred_night}
            onChange={(v) => setField('preferred_night', v)}
            disabled={nights.length === 0}
          />
          <ToggleField
            label="Referral Source"
            description='Show "How did you hear about us?" field'
            checked={enabledFields.referral_source}
            onChange={(v) => setField('referral_source', v)}
          />
          <ToggleField
            label="Team Rep Payment Confirmation"
            description='Show "Have you paid your Team Rep?" for players registering with a team'
            checked={enabledFields.paid_team_rep}
            onChange={(v) => setField('paid_team_rep', v)}
          />
        </div>
      </div>

      {/* Approval */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Approval</h3>
        <div className="bg-neutral-900 rounded-lg p-4 border border-white/5">
          <ToggleField
            label="Auto-Approve Registrations"
            description="Automatically approve player registrations when submitted. When off, registrations require manual approval."
            checked={autoApprove}
            onChange={setAutoApprove}
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-rink-500 to-arena-500 text-black font-medium"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
