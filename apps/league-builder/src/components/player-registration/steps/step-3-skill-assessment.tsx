'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Trophy, Target, Hash, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@hockey-life/ui/lib/utils';
import type { RegistrationFormData } from '@/lib/schemas/player-registration';
import {
  SKILL_LEVELS,
  PLAYER_POSITIONS,
  formatSkillLevel,
  formatPosition,
} from '@/lib/schemas/player-registration';

const SKILL_LEVEL_INFO = {
  beginner: {
    description: 'New to hockey or very limited experience',
    examples: 'Learning basic skating, stick handling, and rules',
  },
  intermediate: {
    description: 'Comfortable with fundamentals, developing skills',
    examples: 'Can skate confidently, basic passing and shooting',
  },
  advanced: {
    description: 'Strong player with solid all-around skills',
    examples: 'Good positioning, can read the play, effective shooter',
  },
  expert: {
    description: 'Highly skilled player with extensive experience',
    examples: 'Played at competitive levels, excellent in all areas',
  },
};

export function Step3SkillAssessment() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<RegistrationFormData>();

  const skillLevel = watch('skill_level');
  const primaryPosition = watch('primary_position');
  const secondaryPosition = watch('secondary_position');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Skill Assessment
        </h2>
        <p className="text-neutral-400">
          Help us understand your playing experience for better team balancing
        </p>
      </div>

      {/* Skill Level Section */}
      <div className="space-y-6 p-6 rounded-xl border border-neutral-700 bg-neutral-800/30">
        <div className="flex items-center gap-2 text-white mb-4">
          <Trophy className="w-5 h-5 text-gold-500" />
          <h3 className="font-semibold">Skill Level</h3>
          <span className="text-xs text-red-400 ml-2">*Required</span>
        </div>

        {/* Skill Level Cards */}
        <div className="grid gap-3 md:grid-cols-2">
          {SKILL_LEVELS.map((level) => {
            const isSelected = skillLevel === level;
            const info = SKILL_LEVEL_INFO[level];

            return (
              <button
                key={level}
                type="button"
                onClick={() => setValue('skill_level', level, { shouldValidate: true })}
                className={cn(
                  'flex flex-col text-left p-4 rounded-lg border-2 transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-neutral-900',
                  isSelected
                    ? 'border-gold-500 bg-gold-500/10'
                    : 'border-neutral-700 hover:border-neutral-600'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      'font-semibold',
                      isSelected ? 'text-gold-500' : 'text-white'
                    )}
                  >
                    {formatSkillLevel(level)}
                  </span>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-gold-500" />
                  )}
                </div>
                <p className="text-sm text-neutral-400 mb-1">{info.description}</p>
                <p className="text-xs text-neutral-500">{info.examples}</p>
              </button>
            );
          })}
        </div>

        {errors.skill_level && (
          <p className="text-sm text-red-400">{errors.skill_level.message}</p>
        )}
      </div>

      {/* Position Selection */}
      <div className="space-y-6 p-6 rounded-xl border border-neutral-700 bg-neutral-800/30">
        <div className="flex items-center gap-2 text-white mb-4">
          <Target className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Playing Position</h3>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Primary Position */}
          <div className="space-y-2">
            <Label htmlFor="primary_position" className="text-white">
              Primary Position <span className="text-red-400">*</span>
            </Label>
            <Select
              value={primaryPosition || ''}
              onValueChange={(value) =>
                setValue('primary_position', value as any, { shouldValidate: true })
              }
            >
              <SelectTrigger
                id="primary_position"
                className={cn(
                  'bg-neutral-800 border-neutral-700',
                  errors.primary_position && 'border-red-500'
                )}
              >
                <SelectValue placeholder="Select position..." />
              </SelectTrigger>
              <SelectContent>
                {PLAYER_POSITIONS.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {formatPosition(pos)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.primary_position && (
              <p className="text-sm text-red-400">
                {errors.primary_position.message}
              </p>
            )}
          </div>

          {/* Secondary Position */}
          <div className="space-y-2">
            <Label htmlFor="secondary_position" className="text-white">
              Secondary Position <span className="text-neutral-500">(Optional)</span>
            </Label>
            <Select
              value={secondaryPosition || ''}
              onValueChange={(value) =>
                setValue('secondary_position', value ? (value as any) : null, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger
                id="secondary_position"
                className="bg-neutral-800 border-neutral-700"
              >
                <SelectValue placeholder="Select position..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {PLAYER_POSITIONS.filter((pos) => pos !== primaryPosition).map(
                  (pos) => (
                    <SelectItem key={pos} value={pos}>
                      {formatPosition(pos)}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-neutral-500">
              Willing to play another position if needed?
            </p>
          </div>
        </div>

        {/* Jersey Number Preference */}
        <div className="space-y-2 pt-4 border-t border-neutral-700">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-neutral-400" />
            <Label htmlFor="preferred_jersey_number" className="text-white">
              Preferred Jersey Number <span className="text-neutral-500">(Optional)</span>
            </Label>
          </div>
          <div className="flex items-center gap-4">
            <Input
              id="preferred_jersey_number"
              type="number"
              min={1}
              max={99}
              placeholder="99"
              {...register('preferred_jersey_number', {
                setValueAs: (v) => (v === '' ? null : parseInt(v, 10)),
              })}
              className={cn(
                'w-24 bg-neutral-800 border-neutral-700',
                errors.preferred_jersey_number && 'border-red-500'
              )}
            />
            <span className="text-sm text-neutral-500">
              Numbers 1-99 available (subject to availability)
            </span>
          </div>
          {errors.preferred_jersey_number && (
            <p className="text-sm text-red-400">
              {errors.preferred_jersey_number.message}
            </p>
          )}
        </div>
      </div>

      {/* Experience Section */}
      <div className="space-y-6 p-6 rounded-xl border border-neutral-700 bg-neutral-800/30">
        <div className="flex items-center gap-2 text-white mb-4">
          <History className="w-5 h-5 text-green-400" />
          <h3 className="font-semibold">Experience</h3>
          <span className="text-xs text-neutral-500 ml-2">(Optional)</span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Years of Experience */}
          <div className="space-y-2">
            <Label htmlFor="years_experience" className="text-white">
              Years Playing Hockey
            </Label>
            <Input
              id="years_experience"
              type="number"
              min={0}
              max={80}
              placeholder="5"
              {...register('years_experience', {
                setValueAs: (v) => (v === '' ? null : parseInt(v, 10)),
              })}
              className={cn(
                'bg-neutral-800 border-neutral-700',
                errors.years_experience && 'border-red-500'
              )}
            />
            {errors.years_experience && (
              <p className="text-sm text-red-400">
                {errors.years_experience.message}
              </p>
            )}
          </div>
        </div>

        {/* Previous Leagues */}
        <div className="space-y-2">
          <Label htmlFor="previous_leagues" className="text-white">
            Previous Leagues or Teams
          </Label>
          <Textarea
            id="previous_leagues"
            placeholder="List any previous leagues, teams, or organizations you've played with..."
            rows={3}
            {...register('previous_leagues')}
            className={cn(
              'bg-neutral-800 border-neutral-700 resize-none',
              errors.previous_leagues && 'border-red-500'
            )}
          />
          {errors.previous_leagues && (
            <p className="text-sm text-red-400">
              {errors.previous_leagues.message}
            </p>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
        <h4 className="font-medium text-blue-400 mb-1">Why we ask this</h4>
        <p className="text-sm text-neutral-300">
          Skill assessment helps ensure fair team balancing and appropriate division
          placement. Be honest - we want everyone to have competitive, fun games!
        </p>
      </div>
    </div>
  );
}
