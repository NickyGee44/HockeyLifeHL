'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Calendar, Clock, Info, ClipboardList, Users2, Shuffle, Shield } from 'lucide-react';
import {
  Input,
  FormField,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@hockey-life/ui';
import { Switch } from '@/components/ui/switch';
import { WizardStepContainer } from '../../ui/wizard/wizard-steps';
import type { WizardFormData } from '@/lib/schemas/league-wizard';

const REGISTRATION_TYPES = [
  {
    value: 'approval_required',
    label: 'Approval Required',
    description: 'Players can register, but need admin approval',
  },
  {
    value: 'open',
    label: 'Open Registration',
    description: 'Anyone can register and join immediately',
  },
  {
    value: 'invite_only',
    label: 'Invite Only',
    description: 'Players must be invited by admins',
  },
  {
    value: 'draft',
    label: 'Draft League',
    description: 'Players register individually, then teams draft from the player pool',
  },
];

const SCOREKEEPING_MODES = [
  {
    value: 'standard' as const,
    label: 'Standard Scorekeeping',
    description: 'Assigned scorekeepers enter stats during or after each game. Stats are submitted immediately.',
    icon: ClipboardList,
  },
  {
    value: 'self_scorekeeping' as const,
    label: 'Self Scorekeeping',
    description: 'Team captains enter their own game stats after each game. Great for beer leagues without dedicated scorekeepers.',
    icon: Users2,
  },
];

export function Step3SeasonScorekeeping() {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<WizardFormData>();

  const registrationType = watch('registration_type');
  const scorekeepingMode = watch('scorekeeping_mode') || 'self_scorekeeping';
  const eligibilityEnabled = watch('playoff_eligibility_enabled');

  return (
    <WizardStepContainer
      title="Season & Scorekeeping"
      description="Configure your league's season details, registration settings, game parameters, and how stats are tracked."
    >
      {/* Season Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Season Information
        </h3>

        <FormField
          label="Season Name"
          error={errors.season_name?.message}
          required
          htmlFor="season_name"
        >
          <Input
            {...register('season_name')}
            id="season_name"
            placeholder="e.g., Winter 2026 Season"
            error={!!errors.season_name}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Season Start Date"
            error={errors.season_start_date?.message}
            required
            htmlFor="season_start_date"
          >
            <Input
              {...register('season_start_date')}
              id="season_start_date"
              type="datetime-local"
              error={!!errors.season_start_date}
            />
          </FormField>

          <FormField
            label="Season End Date"
            error={errors.season_end_date?.message}
            required
            htmlFor="season_end_date"
          >
            <Input
              {...register('season_end_date')}
              id="season_end_date"
              type="datetime-local"
              error={!!errors.season_end_date}
            />
          </FormField>
        </div>
      </div>

      {/* Registration Settings */}
      <div className="space-y-4 pt-6">
        <h3 className="text-lg font-semibold">Registration Settings</h3>

        <FormField
          label="Registration Type"
          error={errors.registration_type?.message}
          required
          htmlFor="registration_type"
        >
          <Select
            value={registrationType}
            onValueChange={(value: any) => setValue('registration_type', value)}
          >
            <SelectTrigger error={!!errors.registration_type}>
              <SelectValue placeholder="Select registration type" />
            </SelectTrigger>
            <SelectContent>
              {REGISTRATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{type.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {type.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex gap-2">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Registration Type Guidelines:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Approval Required (Recommended)</strong>: Best for
                  competitive leagues where you want to review players
                </li>
                <li>
                  <strong>Open Registration</strong>: Great for recreational
                  leagues welcoming all skill levels
                </li>
                <li>
                  <strong>Invite Only</strong>: Perfect for private or
                  invite-based leagues
                </li>
                <li>
                  <strong>Draft League</strong>: Players sign up individually,
                  then team captains draft from the player pool in a live draft
                </li>
              </ul>
            </div>
          </div>
        </div>

        {registrationType === 'draft' && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
            <div className="flex gap-2">
              <Shuffle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Draft League Mode</p>
                <p>
                  In a draft league, players register individually and are placed
                  into a player pool. Team captains then pick players in a live
                  draft event. You&apos;ll need at least 2 teams to run a draft.
                  Players are rated from A to D based on skill level.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Registration Opens"
            error={errors.registration_opens?.message}
            htmlFor="registration_opens"
            hint="Optional. When can players start registering?"
          >
            <Input
              {...register('registration_opens')}
              id="registration_opens"
              type="datetime-local"
              error={!!errors.registration_opens}
            />
          </FormField>

          <FormField
            label="Registration Closes"
            error={errors.registration_closes?.message}
            htmlFor="registration_closes"
            hint="Optional. Last day to register"
          >
            <Input
              {...register('registration_closes')}
              id="registration_closes"
              type="datetime-local"
              error={!!errors.registration_closes}
            />
          </FormField>
        </div>
      </div>

      {/* Game Settings */}
      <div className="space-y-4 pt-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Game Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Game Duration (minutes)"
            error={errors.game_duration_minutes?.message}
            required
            htmlFor="game_duration_minutes"
            hint="Total game time in minutes"
          >
            <Input
              {...register('game_duration_minutes', {
                valueAsNumber: true,
              })}
              id="game_duration_minutes"
              type="number"
              min={30}
              max={180}
              step={5}
              placeholder="60"
              error={!!errors.game_duration_minutes}
            />
          </FormField>

          <FormField
            label="Number of Periods"
            error={errors.period_count?.message}
            required
            htmlFor="period_count"
            hint="How many periods per game?"
          >
            <Input
              {...register('period_count', {
                valueAsNumber: true,
              })}
              id="period_count"
              type="number"
              min={1}
              max={5}
              step={1}
              placeholder="3"
              error={!!errors.period_count}
            />
          </FormField>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-2">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Standard hockey games are 60 minutes with 3 periods (20 minutes
            each). You can adjust these settings to match your league&apos;s format.
          </p>
        </div>
      </div>

      {/* Scorekeeping Mode */}
      <div className="space-y-4 pt-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Scorekeeping Mode
        </h3>

        <p className="text-sm text-muted-foreground">
          Choose how game stats are recorded in your league.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCOREKEEPING_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = scorekeepingMode === mode.value;

            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => setValue('scorekeeping_mode', mode.value)}
                className={`relative p-5 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected ? 'bg-primary/10' : 'bg-muted/50'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{mode.label}</h4>
                    <p className="text-sm text-muted-foreground">
                      {mode.description}
                    </p>
                  </div>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Card className="bg-muted/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                {scorekeepingMode === 'standard'
                  ? 'Standard mode requires assigning scorekeepers to each game. They can enter stats in real-time using the scorekeeper app.'
                  : 'Self scorekeeping is the most popular choice for beer leagues. Team captains submit their game stats after each game, keeping things simple and flexible.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Playoff Eligibility */}
      <div className="space-y-4 pt-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Playoff Eligibility
        </h3>

        <p className="text-sm text-muted-foreground">
          Set minimum game requirements for players to be eligible for playoffs.
        </p>

        <div className="flex items-center gap-3">
          <Switch
            id="playoff_eligibility_enabled"
            checked={eligibilityEnabled}
            onCheckedChange={(checked: boolean) =>
              setValue('playoff_eligibility_enabled', checked)
            }
          />
          <Label htmlFor="playoff_eligibility_enabled" className="text-sm font-medium">
            Require minimum games for playoff eligibility
          </Label>
        </div>

        {eligibilityEnabled && (
          <div className="max-w-xs pt-2">
            <FormField
              label="Minimum Games Played (%)"
              error={errors.playoff_eligibility_min_games_pct?.message}
              htmlFor="playoff_eligibility_min_games_pct"
              hint="Percentage of team's total games a player must play"
            >
              <Input
                {...register('playoff_eligibility_min_games_pct', {
                  valueAsNumber: true,
                })}
                id="playoff_eligibility_min_games_pct"
                type="number"
                min={0}
                max={100}
                step={5}
                placeholder="60"
                error={!!errors.playoff_eligibility_min_games_pct}
              />
            </FormField>
          </div>
        )}

        <Card className="bg-muted/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                {eligibilityEnabled
                  ? 'Players who don\'t meet the minimum games requirement will be flagged as ineligible for playoffs. Captains can see eligibility status on their roster.'
                  : 'All rostered players will be eligible for playoffs regardless of games played. You can enable eligibility rules later from your season settings.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </WizardStepContainer>
  );
}
