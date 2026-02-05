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
  DollarSign,
  CreditCard,
  Globe,
  AlertTriangle,
  Rocket,
  Info,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent, cn } from '@hockey-life/ui';
import { WizardStepContainer } from '../../ui/wizard/wizard-steps';
import type { WizardFormData } from '@/lib/schemas/league-wizard';

// Helper function to convert cents to dollars for display
function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function Step7Review() {
  const { watch } = useFormContext<WizardFormData>();

  const formData = watch();

  // Check for incomplete optional items
  const warnings = getWarnings(formData);
  const hasWarnings = warnings.length > 0;

  // Generate checklist status
  const checklistItems = getChecklistItems(formData);

  return (
    <WizardStepContainer
      title="Review & Launch"
      description="Review your league configuration before launching. You can go back to edit any information."
    >
      <div className="space-y-4">
        {/* Configuration Checklist Summary */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Configuration Checklist</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {checklistItems.map((item, index) => (
                <ChecklistItem
                  key={index}
                  label={item.label}
                  status={item.status}
                  detail={item.detail}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Warnings for incomplete optional items */}
        {hasWarnings && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h3 className="font-semibold text-lg text-yellow-800 dark:text-yellow-200">
                  Optional Items Not Configured
                </h3>
              </div>

              <div className="space-y-2">
                {warnings.map((warning, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <Info className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                    <span className="text-yellow-800 dark:text-yellow-200">{warning}</span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-yellow-700 dark:text-yellow-300">
                These items are optional and can be configured later from your dashboard.
              </p>
            </CardContent>
          </Card>
        )}

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

            <div className="flex items-start gap-6">
              {/* Logo Preview */}
              {formData.logo_url ? (
                <div className="shrink-0">
                  <p className="text-xs text-muted-foreground mb-2">Logo</p>
                  <div className="w-20 h-20 rounded-xl border-2 border-primary/20 bg-neutral-800/50 overflow-hidden">
                    <img
                      src={formData.logo_url}
                      alt="League logo"
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="shrink-0">
                  <p className="text-xs text-muted-foreground mb-2">Logo</p>
                  <div
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    <span className="text-xl font-bold text-white">
                      {(formData.name || 'HL').substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              {/* Colors */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-md border-2"
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
                    className="w-10 h-10 rounded-md border-2"
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
            </div>
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

        {/* Registration & Fees */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Registration & Fees</h3>
            </div>

            {formData.enablePaidRegistration ? (
              <div className="space-y-3">
                <ReviewItem
                  label="Registration Fee"
                  value={`$${centsToDollars(formData.registrationFee || 0)}`}
                />

                {formData.earlyBirdDiscount?.enabled && (
                  <ReviewItem
                    label="Early Bird Discount"
                    value={
                      formData.earlyBirdDiscount.isPercentage
                        ? `${formData.earlyBirdDiscount.amount}% off`
                        : `$${centsToDollars(formData.earlyBirdDiscount.amount)} off`
                    }
                  />
                )}

                {formData.earlyBirdDiscount?.enabled &&
                  formData.earlyBirdDiscount.deadline && (
                    <ReviewItem
                      label="Early Bird Deadline"
                      value={formatDate(formData.earlyBirdDiscount.deadline)}
                    />
                  )}

                {formData.lateRegistrationFee?.enabled && (
                  <ReviewItem
                    label="Late Registration Fee"
                    value={`+$${centsToDollars(formData.lateRegistrationFee.amount)}`}
                  />
                )}

                {formData.lateRegistrationFee?.enabled &&
                  formData.lateRegistrationFee.startsAt && (
                    <ReviewItem
                      label="Late Fees Start"
                      value={formatDate(formData.lateRegistrationFee.startsAt)}
                    />
                  )}

                {formData.paymentInstructions && (
                  <div className="pt-2 border-t mt-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      Payment Instructions
                    </p>
                    <p className="text-sm">{formData.paymentInstructions}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Free registration - no fees required</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Setup Status */}
        {formData.enablePaidRegistration && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Payment Setup</h3>
              </div>

              <div className="space-y-3">
                <ReviewItem
                  label="Stripe Status"
                  value={formatStripeStatus(formData.stripeAccountStatus)}
                />
                {formData.skipPaymentSetup && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800">
                    You've chosen to skip Stripe setup. You can complete this
                    later in your league settings.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Website Settings */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Website Settings</h3>
            </div>

            <div className="space-y-3">
              <ReviewItem
                label="Public Website"
                value={formData.isPublic ? 'Enabled' : 'Disabled'}
              />
              <ReviewItem
                label="Theme"
                value={formatTheme(formData.themePreset)}
              />
              {formData.bannerUrl && (
                <ReviewItem label="Banner URL" value={formData.bannerUrl} />
              )}
              {(formData.socialFacebook ||
                formData.socialInstagram ||
                formData.socialTwitter) && (
                <div className="pt-2 border-t mt-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Social Links
                  </p>
                  {formData.socialFacebook && (
                    <ReviewItem label="Facebook" value={formData.socialFacebook} />
                  )}
                  {formData.socialInstagram && (
                    <ReviewItem label="Instagram" value={formData.socialInstagram} />
                  )}
                  {formData.socialTwitter && (
                    <ReviewItem label="Twitter" value={formData.socialTwitter} />
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Final confirmation message with Launch button callout */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-lg p-6">
          <div className="flex gap-4">
            <div className="bg-primary rounded-full p-3 h-fit">
              <Rocket className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Ready to Launch Your League!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Once launched, your league will be active and you can start:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Inviting players and team captains
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Generating your game schedule
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Accepting player registrations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Managing your league from the dashboard
                </li>
              </ul>
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

interface ChecklistItemProps {
  label: string;
  status: 'complete' | 'incomplete' | 'optional';
  detail?: string;
}

function ChecklistItem({ label, status, detail }: ChecklistItemProps) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
          status === 'complete' && 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
          status === 'incomplete' && 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
          status === 'optional' && 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
        )}
      >
        {status === 'complete' && <Check className="h-4 w-4" />}
        {status === 'incomplete' && <X className="h-4 w-4" />}
        {status === 'optional' && <Info className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {detail && (
          <p className="text-xs text-muted-foreground truncate">{detail}</p>
        )}
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

function formatStripeStatus(status: string | undefined): string {
  if (!status) return 'Not connected';
  switch (status) {
    case 'not_connected':
      return 'Not connected';
    case 'pending':
      return 'Pending verification';
    case 'active':
      return 'Connected and active';
    default:
      return status;
  }
}

function formatTheme(theme: string | undefined): string {
  if (!theme) return 'Dark (default)';
  switch (theme) {
    case 'dark':
      return 'Dark';
    case 'light':
      return 'Light';
    case 'custom':
      return 'Custom';
    default:
      return theme;
  }
}

function getChecklistItems(formData: WizardFormData): { label: string; status: 'complete' | 'incomplete' | 'optional'; detail?: string }[] {
  const items: { label: string; status: 'complete' | 'incomplete' | 'optional'; detail?: string }[] = [];

  // League Info
  items.push({
    label: 'League Information',
    status: formData.name && formData.city ? 'complete' : 'incomplete',
    detail: formData.name || 'Required',
  });

  // Season Settings
  items.push({
    label: 'Season Settings',
    status: formData.season_name && formData.season_start_date ? 'complete' : 'incomplete',
    detail: formData.season_name || 'Required',
  });

  // Teams
  items.push({
    label: 'Teams',
    status: formData.teams && formData.teams.length > 0 ? 'complete' : 'optional',
    detail: formData.teams && formData.teams.length > 0
      ? `${formData.teams.length} teams configured`
      : 'Can be added later',
  });

  // Registration Fees
  items.push({
    label: 'Registration Fees',
    status: formData.enablePaidRegistration !== undefined ? 'complete' : 'optional',
    detail: formData.enablePaidRegistration && formData.registrationFee
      ? `$${centsToDollars(formData.registrationFee)}`
      : 'Free registration',
  });

  // Payment Settings
  const needsPayment = formData.enablePaidRegistration && formData.registrationFee;
  items.push({
    label: 'Payment Processing',
    status: formData.stripeAccountStatus === 'active'
      ? 'complete'
      : needsPayment && !formData.skipPaymentSetup
        ? 'incomplete'
        : 'optional',
    detail: formData.stripeAccountStatus === 'active'
      ? 'Stripe connected'
      : needsPayment
        ? formData.skipPaymentSetup ? 'Skipped - can configure later' : 'Required for fees'
        : 'Not needed',
  });

  // Website Settings
  items.push({
    label: 'Website Settings',
    status: formData.isPublic !== undefined ? 'complete' : 'optional',
    detail: formData.isPublic ? 'Public website enabled' : 'Website is private',
  });

  return items;
}

function getWarnings(formData: WizardFormData): string[] {
  const warnings: string[] = [];

  // Check for incomplete optional items that might be important
  if (!formData.teams || formData.teams.length === 0) {
    warnings.push('No teams have been added. You can add teams later from your dashboard.');
  }

  if (formData.enablePaidRegistration && formData.registrationFee && formData.stripeAccountStatus !== 'active' && !formData.skipPaymentSetup) {
    warnings.push('Registration fees are configured but Stripe is not connected. Players will not be able to pay online.');
  }

  if (!formData.contact_email && !formData.contact_phone) {
    warnings.push('No contact information provided. Consider adding an email or phone number so players can reach you.');
  }

  if (!formData.logo_url) {
    warnings.push('No logo uploaded. Adding a logo helps establish your league\'s brand identity.');
  }

  return warnings;
}
