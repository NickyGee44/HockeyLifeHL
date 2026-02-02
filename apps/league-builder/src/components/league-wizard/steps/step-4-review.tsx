'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  MapPin,
  Calendar,
  Users,
  Palette,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@hockey-life/ui';
import { WizardStepContainer } from '../../ui/wizard/wizard-steps';
import type { WizardFormData } from '@/lib/schemas/league-wizard';

export function Step4Review() {
  const { watch } = useFormContext<WizardFormData>();

  const formData = watch();

  return (
    <WizardStepContainer
      title="Review & Create"
      description="Please review your league details before creating. You can go back to edit any information."
    >
      <div className="space-y-4">
        {/* League Information */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-primary/10 p-2 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">
                  {formData.name || 'Untitled League'}
                </h3>
                {formData.description && (
                  <p className="text-sm text-muted-foreground">
                    {formData.description}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <ReviewItem
                icon={<MapPin className="h-4 w-4" />}
                label="Location"
                value={`${formData.city}, ${formData.state_province}, ${formData.country}`}
              />
              <ReviewItem
                icon={<Clock className="h-4 w-4" />}
                label="Timezone"
                value={formData.timezone || 'Not set'}
              />
            </div>

            {(formData.contact_email ||
              formData.contact_phone ||
              formData.website_url) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                {formData.contact_email && (
                  <ReviewItem label="Email" value={formData.contact_email} />
                )}
                {formData.contact_phone && (
                  <ReviewItem label="Phone" value={formData.contact_phone} />
                )}
                {formData.website_url && (
                  <ReviewItem label="Website" value={formData.website_url} />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Season Settings */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Season Settings</h3>
            </div>

            <div className="space-y-3">
              <ReviewItem
                label="Season Name"
                value={formData.season_name || 'Not set'}
              />
              <ReviewItem
                label="Season Dates"
                value={`${formatDate(formData.season_start_date)} - ${formatDate(formData.season_end_date)}`}
              />
              <ReviewItem
                label="Registration Type"
                value={formatRegistrationType(formData.registration_type)}
              />
              {formData.registration_opens && formData.registration_closes && (
                <ReviewItem
                  label="Registration Period"
                  value={`${formatDate(formData.registration_opens)} - ${formatDate(formData.registration_closes)}`}
                />
              )}
              <ReviewItem
                label="Game Settings"
                value={`${formData.game_duration_minutes || 60} minutes, ${formData.period_count || 3} periods`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Branding</h3>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-12 h-12 rounded-md border-2"
                  style={{ backgroundColor: formData.primary_color }}
                />
                <div>
                  <p className="text-sm font-medium">Primary Color</p>
                  <p className="text-xs text-muted-foreground">
                    {formData.primary_color}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-12 h-12 rounded-md border-2"
                  style={{ backgroundColor: formData.secondary_color }}
                />
                <div>
                  <p className="text-sm font-medium">Secondary Color</p>
                  <p className="text-xs text-muted-foreground">
                    {formData.secondary_color}
                  </p>
                </div>
              </div>
            </div>

            {formData.logo_url && (
              <div className="mt-4 pt-4 border-t">
                <ReviewItem label="Logo URL" value={formData.logo_url} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teams */}
        {formData.teams && formData.teams.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">
                  Teams ({formData.teams.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formData.teams.map((team, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2"
                      style={{ backgroundColor: team.color || '#1E40AF' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{team.name}</p>
                      {team.short_name && (
                        <p className="text-xs text-muted-foreground">
                          {team.short_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Final confirmation message */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Ready to create your league?</p>
              <p className="text-muted-foreground">
                Once created, your league will be active and you can start
                inviting players, scheduling games, and managing your season.
              </p>
            </div>
          </div>
        </div>
      </div>
    </WizardStepContainer>
  );
}

// Helper Components
interface ReviewItemProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
}

function ReviewItem({ icon, label, value }: ReviewItemProps) {
  return (
    <div className="flex items-start gap-2">
      {icon && <div className="text-muted-foreground mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

// Helper Functions
function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Not set';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function formatRegistrationType(type: string | undefined): string {
  if (!type) return 'Not set';
  switch (type) {
    case 'open':
      return 'Open Registration';
    case 'approval_required':
      return 'Approval Required';
    case 'invite_only':
      return 'Invite Only';
    default:
      return type;
  }
}
