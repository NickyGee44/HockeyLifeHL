'use client';

import * as React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Users, Info, AlertTriangle } from 'lucide-react';
import { Button, Input, FormField, ColorPicker } from '@hockey-life/ui';
import { WizardStepContainer } from '../../ui/wizard/wizard-steps';
import type { WizardFormData } from '@/lib/schemas/league-wizard';

export function Step4Teams() {
  const {
    control,
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<WizardFormData>();

  const registrationType = watch('registration_type');
  const isDraft = registrationType === 'draft';

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'teams',
  });

  const handleAddTeam = () => {
    append({
      name: '',
      short_name: '',
      color: '#1E40AF',
    });
  };

  return (
    <WizardStepContainer
      title="Add Teams"
      description={isDraft
        ? "Draft leagues require at least 2 teams. Add the teams that will participate in the draft."
        : "Optionally add teams to your league now. You can also add teams later from the league dashboard."
      }
    >
      <div className="space-y-4">
        {isDraft ? (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">Teams are required for draft leagues</p>
              <p>
                You need at least 2 teams to run a draft. Team captains will pick
                players from the player pool during the live draft event.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-2">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Teams are optional at this stage</p>
              <p>
                You can add up to 20 teams now, or skip this step and add teams
                later. Teams can be edited, added, or removed at any time from
                your league dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Teams List */}
        {fields.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first team to get started, or skip this step.
            </p>
            <Button type="button" onClick={handleAddTeam}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Team
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Team entries */}
            {fields.map((field, index) => {
              const teamErrors = errors.teams?.[index];

              return (
                <div
                  key={field.id}
                  className="p-4 border rounded-lg space-y-4 relative"
                >
                  {/* Delete button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>

                  {/* Team number badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <span className="font-medium">Team {index + 1}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label="Team Name"
                      error={teamErrors?.name?.message}
                      required
                      htmlFor={`teams.${index}.name`}
                    >
                      <Input
                        {...register(`teams.${index}.name` as const)}
                        id={`teams.${index}.name`}
                        placeholder="e.g., Ice Dragons"
                        error={!!teamErrors?.name}
                      />
                    </FormField>

                    <FormField
                      label="Short Name"
                      error={teamErrors?.short_name?.message}
                      htmlFor={`teams.${index}.short_name`}
                      hint="Optional. Used in standings (max 10 chars)"
                    >
                      <Input
                        {...register(`teams.${index}.short_name` as const)}
                        id={`teams.${index}.short_name`}
                        placeholder="e.g., DRG"
                        maxLength={10}
                        error={!!teamErrors?.short_name}
                      />
                    </FormField>
                  </div>

                  <FormField
                    label="Team Color"
                    error={teamErrors?.color?.message}
                    htmlFor={`teams.${index}.color`}
                    hint="Used for team identification"
                  >
                    <ColorPicker
                      {...register(`teams.${index}.color` as const)}
                      id={`teams.${index}.color`}
                      value={watch(`teams.${index}.color`)}
                      onColorChange={(color) =>
                        setValue(`teams.${index}.color`, color)
                      }
                      error={!!teamErrors?.color}
                    />
                  </FormField>
                </div>
              );
            })}

            {/* Add more teams button */}
            {fields.length < 20 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTeam}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another Team ({fields.length}/20)
              </Button>
            )}

            {fields.length >= 20 && (
              <div className="text-sm text-muted-foreground text-center p-2 bg-muted/50 rounded">
                Maximum of 20 teams reached. You can add more teams later from
                the dashboard.
              </div>
            )}
          </div>
        )}

        {/* Validation errors */}
        {errors.teams && typeof errors.teams.message === 'string' && (
          <p className="text-sm text-destructive" role="alert">
            {errors.teams.message}
          </p>
        )}
      </div>
    </WizardStepContainer>
  );
}
