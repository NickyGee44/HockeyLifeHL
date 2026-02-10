'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Building2,
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
  ArrowRight,
  ClipboardList,
  LayoutGrid,
  BarChart3,
  Newspaper,
} from 'lucide-react';
import { Card, CardContent, cn } from '@hockey-life/ui';
import { WizardStepContainer } from '../../ui/wizard/wizard-steps';
import type { WizardFormData } from '@/lib/schemas/league-wizard';
import { useTranslations } from 'next-intl';

// Helper function to convert cents to dollars for display
function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Pricing constants
const PLATFORM_BASE_PRICE = 299.99;
const ADDON_INDIVIDUAL_PRICE = 14.99;
const ADDON_BUNDLE_PRICE = 29.99;

export function Step8Review() {
  const { watch } = useFormContext<WizardFormData>();
  const t = useTranslations('wizard.reviewStep');

  const formData = watch();

  // Separate items into "ready" and "needs attention"
  const checklistItems = getChecklistItems(formData, t);
  const readyItems = checklistItems.filter((item) => item.status === 'complete');
  const optionalItems = checklistItems.filter((item) => item.status === 'optional');
  const attentionItems = checklistItems.filter((item) => item.status === 'incomplete');

  // Check for warnings
  const warnings = getWarnings(formData, t);
  const hasWarnings = warnings.length > 0;

  // Check if payment setup needs attention
  const needsPaymentSetup =
    formData.enablePaidRegistration &&
    formData.registrationFee &&
    formData.stripeAccountStatus !== 'active';

  // Calculate monthly total
  const bothAddons = formData.enableAdvancedStats && formData.enableAiNews;
  const addonsTotal = bothAddons
    ? ADDON_BUNDLE_PRICE
    : (formData.enableAdvancedStats ? ADDON_INDIVIDUAL_PRICE : 0) +
      (formData.enableAiNews ? ADDON_INDIVIDUAL_PRICE : 0);
  const monthlyTotal = PLATFORM_BASE_PRICE + addonsTotal;

  return (
    <WizardStepContainer
      title={t('title')}
      description={t('description')}
    >
      <div className="space-y-4">
        {/* Ready to Launch Section */}
        {readyItems.length > 0 && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-lg text-green-800 dark:text-green-200">
                  {t('readyToLaunch')}
                </h3>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                {t('readyToLaunchDescription')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {readyItems.map((item, index) => (
                  <ChecklistItem
                    key={index}
                    label={item.label}
                    status={item.status}
                    detail={item.detail}
                  />
                ))}
                {optionalItems.map((item, index) => (
                  <ChecklistItem
                    key={`opt-${index}`}
                    label={item.label}
                    status={item.status}
                    detail={item.detail}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Needs Attention After Launch Section */}
        {(attentionItems.length > 0 || needsPaymentSetup) && (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg text-blue-800 dark:text-blue-200">
                  {t('needsAttention')}
                </h3>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                {t('needsAttentionDescription')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attentionItems.map((item, index) => (
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
        )}

        {/* Warnings */}
        {hasWarnings && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h3 className="font-semibold text-lg text-yellow-800 dark:text-yellow-200">
                  {t('warningsTitle')}
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
                {t('warningsDescription')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Organization Info */}
        {formData.orgBusinessName && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Organization</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReviewItem label="Business Name" value={formData.orgBusinessName} />
                {formData.orgBusinessEmail && (
                  <ReviewItem label="Email" value={formData.orgBusinessEmail} />
                )}
                {formData.orgBusinessPhone && (
                  <ReviewItem label="Phone" value={formData.orgBusinessPhone} />
                )}
                {formData.orgBusinessCity && (
                  <ReviewItem
                    label="Location"
                    value={`${formData.orgBusinessCity}${formData.orgBusinessState ? `, ${formData.orgBusinessState}` : ''}`}
                  />
                )}
              </div>
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
          </CardContent>
        </Card>

        {/* Season Settings */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">{t('seasonSettings')}</h3>
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
              <ReviewItem
                label="Game Settings"
                value={`${formData.game_duration_minutes || 60} minutes, ${formData.period_count || 3} periods`}
              />
              <ReviewItem
                icon={<ClipboardList className="h-4 w-4" />}
                label="Scorekeeping Mode"
                value={formData.scorekeeping_mode === 'standard' ? 'Standard (assigned scorekeepers)' : 'Self Scorekeeping (team captains)'}
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

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-md border-2"
                    style={{ backgroundColor: formData.primary_color }}
                  />
                  <div>
                    <p className="text-sm font-medium">Primary Color</p>
                    <p className="text-xs text-muted-foreground">{formData.primary_color}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-md border-2"
                    style={{ backgroundColor: formData.secondary_color }}
                  />
                  <div>
                    <p className="text-sm font-medium">Secondary Color</p>
                    <p className="text-xs text-muted-foreground">{formData.secondary_color}</p>
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
                  {t('teams')} ({formData.teams.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formData.teams.map((team, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div
                      className="w-8 h-8 rounded-full border-2"
                      style={{ backgroundColor: team.color || '#1E40AF' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{team.name}</p>
                      {team.short_name && (
                        <p className="text-xs text-muted-foreground">{team.short_name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Website & Pages */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">{t('websiteSettings')}</h3>
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
              {formData.visiblePages && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Visible Pages</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(formData.visiblePages)
                      .filter(([, enabled]) => enabled)
                      .map(([page]) => (
                        <span key={page} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full capitalize">
                          {page}
                        </span>
                      ))}
                  </div>
                </div>
              )}
              {formData.wantCustomDomain && formData.customDomainName && (
                <ReviewItem label="Custom Domain" value={formData.customDomainName} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add-ons & Pricing */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Features & Pricing</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Platform Base (Hosting & Maintenance)</span>
                <span className="font-semibold">${PLATFORM_BASE_PRICE.toFixed(2)}/mo</span>
              </div>

              {formData.enableAdvancedStats && (
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Advanced Stats Tracking</span>
                  </div>
                  <span className="font-semibold">
                    {bothAddons ? 'Bundled' : `$${ADDON_INDIVIDUAL_PRICE.toFixed(2)}/mo`}
                  </span>
                </div>
              )}

              {formData.enableAiNews && (
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2">
                    <Newspaper className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">AI News & Summaries</span>
                  </div>
                  <span className="font-semibold">
                    {bothAddons ? 'Bundled' : `$${ADDON_INDIVIDUAL_PRICE.toFixed(2)}/mo`}
                  </span>
                </div>
              )}

              {bothAddons && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-green-500 text-sm">Add-ons Bundle</span>
                  <span className="font-semibold text-green-500">${ADDON_BUNDLE_PRICE.toFixed(2)}/mo</span>
                </div>
              )}

              <div className="flex items-center justify-between py-2 pt-3">
                <span className="font-semibold text-lg">Total Monthly</span>
                <span className="font-bold text-xl text-primary">${monthlyTotal.toFixed(2)}/mo</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration & Fees */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">{t('registrationFees')}</h3>
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
                {formData.lateRegistrationFee?.enabled && (
                  <ReviewItem
                    label="Late Registration Fee"
                    value={`+$${centsToDollars(formData.lateRegistrationFee.amount)}`}
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>{t('freeRegistration')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Final confirmation */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-lg p-6">
          <div className="flex gap-4">
            <div className="bg-primary rounded-full p-3 h-fit">
              <Rocket className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">{t('readyToLaunchCta')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('readyToLaunchInfo')}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {t('ctaInvitePlayers')}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {t('ctaGenerateSchedule')}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {t('ctaAcceptRegistrations')}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {t('ctaManageLeague')}
                </li>
              </ul>

              {needsPaymentSetup && (
                <div className="mt-4 pt-4 border-t border-primary/20">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      {t('paymentSetupReminder')}
                    </p>
                  </div>
                </div>
              )}
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
          status === 'incomplete' && 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
          status === 'optional' && 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
        )}
      >
        {status === 'complete' && <Check className="h-4 w-4" />}
        {status === 'incomplete' && <ArrowRight className="h-3 w-3" />}
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
    case 'open': return 'Open Registration';
    case 'approval_required': return 'Approval Required';
    case 'invite_only': return 'Invite Only';
    default: return type;
  }
}

function formatTheme(theme: string | undefined): string {
  if (!theme) return 'Dark (default)';
  switch (theme) {
    case 'dark': return 'Dark';
    case 'light': return 'Light';
    case 'custom': return 'Custom';
    default: return theme;
  }
}

function getChecklistItems(
  formData: WizardFormData,
  t: (key: string, values?: Record<string, string | number>) => string
): { label: string; status: 'complete' | 'incomplete' | 'optional'; detail?: string }[] {
  const items: { label: string; status: 'complete' | 'incomplete' | 'optional'; detail?: string }[] = [];

  // Organization
  items.push({
    label: 'Organization',
    status: formData.orgBusinessName ? 'complete' : 'optional',
    detail: formData.orgBusinessName || 'Optional',
  });

  // League Info
  items.push({
    label: t('leagueInfo'),
    status: formData.name && formData.city ? 'complete' : 'incomplete',
    detail: formData.name || 'Required',
  });

  // Season Settings
  items.push({
    label: t('seasonSettings'),
    status: formData.season_name && formData.season_start_date ? 'complete' : 'incomplete',
    detail: formData.season_name || 'Required',
  });

  // Teams
  items.push({
    label: t('teams'),
    status: formData.teams && formData.teams.length > 0 ? 'complete' : 'optional',
    detail: formData.teams && formData.teams.length > 0
      ? t('teamsConfigured', { count: formData.teams.length })
      : t('canBeAddedLater'),
  });

  // Website
  items.push({
    label: t('websiteSettings'),
    status: formData.isPublic !== undefined ? 'complete' : 'optional',
    detail: formData.isPublic ? t('publicEnabled') : t('privateWebsite'),
  });

  // Registration Fees
  items.push({
    label: t('registrationFees'),
    status: formData.enablePaidRegistration !== undefined ? 'complete' : 'optional',
    detail: formData.enablePaidRegistration && formData.registrationFee
      ? `$${centsToDollars(formData.registrationFee)}`
      : t('freeRegistration'),
  });

  // Payment Processing
  const needsPayment = formData.enablePaidRegistration && formData.registrationFee;
  items.push({
    label: t('paymentProcessing'),
    status: formData.stripeAccountStatus === 'active'
      ? 'complete'
      : needsPayment
        ? 'incomplete'
        : 'optional',
    detail: formData.stripeAccountStatus === 'active'
      ? t('stripeConnected')
      : needsPayment
        ? formData.skipPaymentSetup
          ? t('stripeSkipped')
          : t('stripeNotConnected')
        : t('notNeeded'),
  });

  return items;
}

function getWarnings(
  formData: WizardFormData,
  t: (key: string) => string
): string[] {
  const warnings: string[] = [];

  if (!formData.teams || formData.teams.length === 0) {
    warnings.push(t('warningNoTeams'));
  }

  if (formData.enablePaidRegistration && formData.registrationFee && formData.stripeAccountStatus !== 'active') {
    warnings.push(t('warningStripeNotConnected'));
  }

  if (!formData.contact_email && !formData.contact_phone) {
    warnings.push(t('warningNoContact'));
  }

  if (!formData.logo_url) {
    warnings.push(t('warningNoLogo'));
  }

  return warnings;
}
