'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Users, User, UserPlus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@hockey-life/ui/lib/utils';
import { useRegistrationContext } from '../registration-wizard-container';
import type { RegistrationFormData } from '@/lib/schemas/player-registration';

const REGISTRATION_TYPES = [
  {
    id: 'team_registration',
    title: 'Join a Team',
    description: 'Register as part of an existing team roster',
    icon: Users,
  },
  {
    id: 'free_agent',
    title: 'Free Agent',
    description: 'Available to be drafted or assigned to a team',
    icon: UserPlus,
  },
  {
    id: 'individual',
    title: 'Individual Player',
    description: 'Register without team affiliation',
    icon: User,
  },
] as const;

export function Step1RegistrationType() {
  const { teams, leagueName } = useRegistrationContext();
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<RegistrationFormData>();

  const selectedType = watch('registration_type');
  const selectedTeamId = watch('team_id');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          How would you like to register?
        </h2>
        <p className="text-neutral-400">
          Choose your registration type for {leagueName}
        </p>
      </div>

      {/* Registration Type Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {REGISTRATION_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;
          const isDisabled = type.id === 'team_registration' && teams.length === 0;

          return (
            <button
              key={type.id}
              type="button"
              onClick={() => {
                if (!isDisabled) {
                  setValue('registration_type', type.id, { shouldValidate: true });
                  // Clear team selection if not team registration
                  if (type.id !== 'team_registration') {
                    setValue('team_id', null);
                  }
                }
              }}
              disabled={isDisabled}
              className={cn(
                'relative flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-rink-500 focus:ring-offset-2 focus:ring-offset-neutral-900',
                isSelected
                  ? 'border-rink-500 bg-rink-500/10'
                  : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-rink-500" />
              )}

              <div
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center mb-4',
                  isSelected
                    ? 'bg-rink-500/20 text-rink-500'
                    : 'bg-neutral-700 text-neutral-400'
                )}
              >
                <Icon className="w-7 h-7" />
              </div>

              <h3 className={cn(
                'text-lg font-semibold mb-2',
                isSelected ? 'text-rink-500' : 'text-white'
              )}>
                {type.title}
              </h3>

              <p className="text-sm text-neutral-400 text-center">
                {type.description}
              </p>

              {isDisabled && (
                <p className="text-xs text-amber-500 mt-2">
                  No teams available
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Error message */}
      {errors.registration_type && (
        <p className="text-sm text-red-400">
          {errors.registration_type.message}
        </p>
      )}

      {/* Team Selection (only show if team_registration is selected) */}
      {selectedType === 'team_registration' && teams.length > 0 && (
        <div className="space-y-3 p-6 rounded-xl border border-neutral-700 bg-neutral-800/30">
          <Label htmlFor="team_id" className="text-white">
            Select Your Team <span className="text-red-400">*</span>
          </Label>

          <Select
            value={selectedTeamId || ''}
            onValueChange={(value) => setValue('team_id', value, { shouldValidate: true })}
          >
            <SelectTrigger id="team_id" className="bg-neutral-800 border-neutral-700">
              <SelectValue placeholder="Choose a team..." />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {errors.team_id && (
            <p className="text-sm text-red-400">
              {errors.team_id.message}
            </p>
          )}

          <p className="text-xs text-neutral-500">
            Your registration will require approval from the team captain
          </p>
        </div>
      )}

      {/* Info boxes */}
      <div className="grid gap-4 md:grid-cols-2">
        {selectedType === 'free_agent' && (
          <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
            <h4 className="font-medium text-blue-400 mb-1">Free Agent Info</h4>
            <p className="text-sm text-neutral-300">
              As a free agent, you'll be available for team captains to draft
              or for league admins to assign you to a team during the draft process.
            </p>
          </div>
        )}

        {selectedType === 'individual' && (
          <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
            <h4 className="font-medium text-amber-400 mb-1">Individual Registration</h4>
            <p className="text-sm text-neutral-300">
              You'll be registered as an individual player. This is ideal for
              drop-in games or leagues without formal team structures.
            </p>
          </div>
        )}
      </div>

      {/* Hidden inputs for required fields */}
      <input type="hidden" {...register('league_id')} />
      <input type="hidden" {...register('season_id')} />
    </div>
  );
}
