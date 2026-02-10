'use client';

import type { RegistrationDraftData } from '@/lib/actions/registration';

interface StepSkillPositionProps {
  formData: RegistrationDraftData;
  onUpdate: (updates: Partial<RegistrationDraftData>) => void;
}

const POSITIONS = [
  { value: 'C', label: 'Center' },
  { value: 'LW', label: 'Left Wing' },
  { value: 'RW', label: 'Right Wing' },
  { value: 'D', label: 'Defense' },
  { value: 'G', label: 'Goalie' },
];

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'New to hockey or very limited experience' },
  { value: 'novice', label: 'Novice', desc: 'Basic skating and stick handling' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Comfortable with game play' },
  { value: 'advanced', label: 'Advanced', desc: 'Strong skills and game awareness' },
  { value: 'expert', label: 'Expert', desc: 'Competitive / travel league experience' },
];

export function StepSkillPosition({ formData, onUpdate }: StepSkillPositionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
          Skill & Position
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Help us place you in the right division and position.
        </p>
      </div>

      {/* Primary Position */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Primary Position *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {POSITIONS.map((pos) => (
            <button
              key={pos.value}
              type="button"
              onClick={() => onUpdate({ primary_position: pos.value })}
              className={`px-3 py-2.5 rounded-lg border text-center text-sm font-medium transition-all ${
                formData.primary_position === pos.value
                  ? 'border-[var(--league-primary)] bg-[var(--league-primary)]/10 text-[var(--league-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-emphasis)]'
              }`}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Position */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Secondary Position (optional)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {POSITIONS.filter((p) => p.value !== formData.primary_position).map((pos) => (
            <button
              key={pos.value}
              type="button"
              onClick={() =>
                onUpdate({
                  secondary_position: formData.secondary_position === pos.value ? '' : pos.value,
                })
              }
              className={`px-3 py-2.5 rounded-lg border text-center text-sm font-medium transition-all ${
                formData.secondary_position === pos.value
                  ? 'border-[var(--league-primary)] bg-[var(--league-primary)]/10 text-[var(--league-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-emphasis)]'
              }`}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preferred Jersey Number */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
          Preferred Jersey Number (optional)
        </label>
        <input
          type="number"
          min={0}
          max={99}
          value={formData.preferred_jersey_number ?? ''}
          onChange={(e) =>
            onUpdate({
              preferred_jersey_number: e.target.value ? parseInt(e.target.value, 10) : null,
            })
          }
          placeholder="e.g. 99"
          className="w-24 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
        />
      </div>

      {/* Skill Level */}
      <div className="border-t border-[var(--color-border)] pt-6">
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">
          Self-Assessed Skill Level *
        </label>
        <div className="space-y-2">
          {SKILL_LEVELS.map((skill) => (
            <button
              key={skill.value}
              type="button"
              onClick={() => onUpdate({ skill_level: skill.value })}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                formData.skill_level === skill.value
                  ? 'border-[var(--league-primary)] bg-[var(--league-primary)]/10'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border-emphasis)]'
              }`}
            >
              <p className="font-medium text-sm text-[var(--color-text-primary)]">
                {skill.label}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">{skill.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Years Experience */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            Years of Hockey Experience
          </label>
          <input
            type="number"
            min={0}
            max={50}
            value={formData.years_experience ?? ''}
            onChange={(e) =>
              onUpdate({
                years_experience: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            placeholder="0"
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            Previous Leagues (optional)
          </label>
          <input
            type="text"
            value={formData.previous_leagues || ''}
            onChange={(e) => onUpdate({ previous_leagues: e.target.value })}
            placeholder="List any previous leagues..."
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
          />
        </div>
      </div>
    </div>
  );
}
