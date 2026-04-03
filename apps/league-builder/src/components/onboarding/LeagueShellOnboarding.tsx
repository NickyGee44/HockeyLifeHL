'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@hockey-life/ui';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Globe,
  Loader2,
  Palette,
  Sparkles,
} from 'lucide-react';
import { createLeagueShell } from '@/lib/actions/league-shell-onboarding';
import type { LeagueShellSetup, OrganizationOnboarding } from '@/lib/onboarding/types';

const LEAGUE_SHELL_STEPS = [
  {
    id: 'organization',
    title: 'Organization',
    description: 'Confirm the organization this league will live under.',
  },
  {
    id: 'league',
    title: 'League shell',
    description: 'Create the league profile, location, and brand basics.',
  },
  {
    id: 'connections',
    title: 'Connections',
    description: 'Choose which launch tasks should be queued up next.',
  },
] as const;

const TIMEZONE_OPTIONS = [
  'America/Toronto',
  'America/Vancouver',
  'America/Edmonton',
  'America/Winnipeg',
  'America/Halifax',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
] as const;

interface LeagueShellOnboardingProps {
  locale: string;
  organization: OrganizationOnboarding;
  defaultContactEmail: string;
}

export function LeagueShellOnboarding({
  locale,
  organization,
  defaultContactEmail,
}: LeagueShellOnboardingProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [formState, setFormState] = useState<LeagueShellSetup>({
    leagueName: '',
    description: '',
    city: '',
    stateProvince: '',
    country: 'CA',
    timezone: 'America/Toronto',
    primaryColor: '#1E40AF',
    secondaryColor: '#3B82F6',
    logoUrl: '',
    contactEmail: defaultContactEmail,
    contactPhone: '',
    websiteUrl: '',
    enableOnlinePayments: false,
    enablePublicWebsite: true,
    wantCustomDomain: false,
    customDomainName: '',
  });

  const currentStep = LEAGUE_SHELL_STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === LEAGUE_SHELL_STEPS.length - 1;

  const canProceed = (() => {
    if (currentStep.id === 'organization') {
      return true;
    }

    if (currentStep.id === 'league') {
      return (
        formState.leagueName.trim().length >= 3 &&
        formState.city.trim().length >= 2 &&
        formState.stateProvince.trim().length >= 2 &&
        formState.timezone.trim().length > 0
      );
    }

    if (currentStep.id === 'connections') {
      return !formState.wantCustomDomain || (formState.customDomainName || '').trim().length > 0;
    }

    return false;
  })();

  function updateField<K extends keyof LeagueShellSetup>(key: K, value: LeagueShellSetup[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function handleNext() {
    if (!canProceed || isLastStep) {
      return;
    }

    setStepIndex((current) => current + 1);
  }

  function handleBack() {
    if (isFirstStep) {
      router.push(`/${locale}/dashboard`);
      return;
    }

    setStepIndex((current) => current - 1);
  }

  function handleSubmit() {
    if (!canProceed || isPending) {
      return;
    }

    setIsPending(true);

    void (async () => {
      const result = await createLeagueShell(formState);

      if (!result.success) {
        toast.error(result.error);
        setIsPending(false);
        return;
      }

      toast.success('League shell created. Next up: your first season.');
      router.push(`/${locale}/dashboard/leagues/${result.data.leagueId}/seasons/new?onboarding=1`);
    })();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[24px] border border-white/[0.08] bg-neutral-950/70 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rink-300/80">
              Phase 1
            </p>
            <h1 className="mt-3 text-2xl font-black text-white">
              Create the league shell.
            </h1>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Keep this pass focused: create the league, queue the first launch connections,
              then move directly into the first-season setup wizard.
            </p>

            <div className="mt-6 space-y-3">
              {LEAGUE_SHELL_STEPS.map((step, index) => {
                const isActive = index === stepIndex;
                const isComplete = index < stepIndex;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      'rounded-2xl border px-4 py-3 transition-colors',
                      isActive
                        ? 'border-rink-400/40 bg-rink-500/10'
                        : isComplete
                          ? 'border-emerald-400/30 bg-emerald-500/10'
                          : 'border-white/[0.06] bg-white/[0.02]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold',
                          isActive
                            ? 'bg-rink-400 text-black'
                            : isComplete
                              ? 'bg-emerald-400 text-black'
                              : 'bg-neutral-800 text-neutral-400'
                        )}
                      >
                        {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{step.title}</p>
                        <p className="text-xs text-neutral-500">{step.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">
              QuickBooks and social media are intentionally deferred. Those move into the
              league hub after the league shell and first season exist.
            </div>
          </aside>

          <section className="flex flex-col">
            <div className="mb-6 border-b border-white/[0.08] pb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                {currentStep.title}
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">{currentStep.description}</h2>
            </div>

            <div className="min-h-[420px]">
              {currentStep.id === 'organization' ? (
                <OrganizationStep
                  organization={organization}
                  contactEmail={formState.contactEmail || ''}
                  contactPhone={formState.contactPhone || ''}
                  onContactEmailChange={(value) => updateField('contactEmail', value)}
                  onContactPhoneChange={(value) => updateField('contactPhone', value)}
                />
              ) : null}

              {currentStep.id === 'league' ? (
                <LeagueStep formState={formState} onChange={updateField} />
              ) : null}

              {currentStep.id === 'connections' ? (
                <ConnectionsStep formState={formState} onChange={updateField} />
              ) : null}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-white/[0.08] pt-5">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-neutral-400 transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                {isFirstStep ? 'Back to dashboard' : 'Back'}
              </button>

              {isLastStep ? (
                <button
                  type="button"
                  disabled={!canProceed || isPending}
                  onClick={handleSubmit}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors',
                    !canProceed || isPending
                      ? 'cursor-not-allowed bg-neutral-800 text-neutral-500'
                      : 'bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20'
                  )}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Create league shell
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canProceed}
                  onClick={handleNext}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors',
                    !canProceed
                      ? 'cursor-not-allowed bg-neutral-800 text-neutral-500'
                      : 'bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20'
                  )}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function OrganizationStep({
  organization,
  contactEmail,
  contactPhone,
  onContactEmailChange,
  onContactPhoneChange,
}: {
  organization: OrganizationOnboarding;
  contactEmail: string;
  contactPhone: string;
  onContactEmailChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-white/[0.08] bg-neutral-950/40 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rink-500/10 text-rink-300">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{organization.organizationName}</p>
            <p className="text-xs text-neutral-500">Organization slug: {organization.organizationSlug}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-neutral-400">
          The organization already exists, so this flow does not ask for it again. The next
          league will attach to this organization and inherit its account-level settings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Primary contact email"
          hint="Used for league-level billing and launch follow-up."
        >
          <input
            type="email"
            value={contactEmail}
            onChange={(event) => onContactEmailChange(event.target.value)}
            className={INPUT_CLASSNAMES}
            placeholder="owner@example.com"
          />
        </FormField>

        <FormField
          label="Primary contact phone"
          hint="Optional, but useful for launch and operations."
        >
          <input
            type="tel"
            value={contactPhone}
            onChange={(event) => onContactPhoneChange(event.target.value)}
            className={INPUT_CLASSNAMES}
            placeholder="(555) 555-5555"
          />
        </FormField>
      </div>
    </div>
  );
}

function LeagueStep({
  formState,
  onChange,
}: {
  formState: LeagueShellSetup;
  onChange: <K extends keyof LeagueShellSetup>(key: K, value: LeagueShellSetup[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="League name" hint="This is the name owners, players, and the public site will see.">
          <input
            type="text"
            value={formState.leagueName}
            onChange={(event) => onChange('leagueName', event.target.value)}
            className={INPUT_CLASSNAMES}
            placeholder="Downtown Winter League"
          />
        </FormField>

        <FormField label="Timezone" hint="Season scheduling and registration windows will use this zone.">
          <select
            value={formState.timezone}
            onChange={(event) => onChange('timezone', event.target.value)}
            className={INPUT_CLASSNAMES}
          >
            {TIMEZONE_OPTIONS.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Short description" hint="Optional context for the league hub and public website.">
        <textarea
          value={formState.description || ''}
          onChange={(event) => onChange('description', event.target.value)}
          className={cn(INPUT_CLASSNAMES, 'min-h-[120px]')}
          placeholder="Adult recreational hockey league focused on weeknight play."
        />
      </FormField>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FormField label="City">
          <input
            type="text"
            value={formState.city}
            onChange={(event) => onChange('city', event.target.value)}
            className={INPUT_CLASSNAMES}
            placeholder="Toronto"
          />
        </FormField>
        <FormField label="Province / state">
          <input
            type="text"
            value={formState.stateProvince}
            onChange={(event) => onChange('stateProvince', event.target.value)}
            className={INPUT_CLASSNAMES}
            placeholder="Ontario"
          />
        </FormField>
        <FormField label="Country">
          <input
            type="text"
            value={formState.country}
            onChange={(event) => onChange('country', event.target.value)}
            className={INPUT_CLASSNAMES}
            placeholder="CA"
          />
        </FormField>
        <FormField label="Website URL">
          <input
            type="url"
            value={formState.websiteUrl || ''}
            onChange={(event) => onChange('websiteUrl', event.target.value)}
            className={INPUT_CLASSNAMES}
            placeholder="https://example.com"
          />
        </FormField>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Primary color">
            <input
              type="color"
              value={formState.primaryColor}
              onChange={(event) => onChange('primaryColor', event.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-neutral-900 p-2"
            />
          </FormField>
          <FormField label="Secondary color">
            <input
              type="color"
              value={formState.secondaryColor}
              onChange={(event) => onChange('secondaryColor', event.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-neutral-900 p-2"
            />
          </FormField>
          <FormField label="Logo URL" hint="Optional. Add now or later in the league hub.">
            <input
              type="url"
              value={formState.logoUrl || ''}
              onChange={(event) => onChange('logoUrl', event.target.value)}
              className={INPUT_CLASSNAMES}
              placeholder="https://cdn.example.com/logo.png"
            />
          </FormField>
        </div>

        <div className="rounded-[24px] border border-white/[0.08] bg-neutral-950/40 p-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: formState.primaryColor }}
            >
              <Palette className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {formState.leagueName || 'Your league shell'}
              </p>
              <p className="text-xs text-neutral-500">
                {formState.city || 'City'}, {formState.stateProvince || 'Province'}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-neutral-400">
            This step is intentionally light. The full operational setup shifts into the
            first-season wizard so owners are not asked to solve everything at once.
          </p>
        </div>
      </div>
    </div>
  );
}

function ConnectionsStep({
  formState,
  onChange,
}: {
  formState: LeagueShellSetup;
  onChange: <K extends keyof LeagueShellSetup>(key: K, value: LeagueShellSetup[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <ToggleCard
          icon={<CreditCard className="h-5 w-5" />}
          title="Online payments"
          description="Queue Stripe onboarding so season fees can be collected online when you are ready."
          checked={formState.enableOnlinePayments}
          onChange={(checked) => onChange('enableOnlinePayments', checked)}
        />
        <ToggleCard
          icon={<Globe className="h-5 w-5" />}
          title="Public website"
          description="Keep the public site in the launch checklist so branding and pages can be reviewed right away."
          checked={formState.enablePublicWebsite}
          onChange={(checked) => onChange('enablePublicWebsite', checked)}
        />
      </div>

      <div className="rounded-[24px] border border-white/[0.08] bg-neutral-950/40 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Custom domain</p>
            <p className="text-sm leading-6 text-neutral-400">
              Keep domain launch on the checklist if this league should use a branded URL.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange('wantCustomDomain', !formState.wantCustomDomain)}
            className={cn(
              'relative h-7 w-14 rounded-full transition-colors',
              formState.wantCustomDomain ? 'bg-rink-500' : 'bg-neutral-700'
            )}
          >
            <span
              className={cn(
                'absolute top-1 h-5 w-5 rounded-full bg-white transition-transform',
                formState.wantCustomDomain ? 'translate-x-8' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {formState.wantCustomDomain ? (
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <FormField
              label="Requested custom domain"
              hint="This becomes a follow-up task in the league hub after the shell is created."
            >
              <input
                type="text"
                value={formState.customDomainName || ''}
                onChange={(event) => onChange('customDomainName', event.target.value)}
                className={INPUT_CLASSNAMES}
                placeholder="hockey.example.com"
              />
            </FormField>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">
              Email/domain setup stays in the onboarding checklist. QuickBooks remains a later
              finance task inside the league hub.
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-[24px] border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-neutral-500">
          What happens next
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <OutcomeCard
            title="League hub"
            description="Finance, website, settings, and integrations stay grouped at the league level."
          />
          <OutcomeCard
            title="Season workspace"
            description="After this, the first-season wizard becomes the main operational setup path."
          />
          <OutcomeCard
            title="Migration center"
            description="Teams, players, schedules, and history imports stay discoverable in one guided place."
          />
        </div>
      </div>
    </div>
  );
}

function ToggleCard({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'rounded-[24px] border p-5 text-left transition-colors',
        checked
          ? 'border-rink-400/30 bg-rink-500/10'
          : 'border-white/[0.08] bg-neutral-950/40 hover:border-white/20'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-2xl',
              checked ? 'bg-rink-500 text-black' : 'bg-white/[0.05] text-neutral-300'
            )}
          >
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-1 text-sm leading-6 text-neutral-400">{description}</p>
          </div>
        </div>
        <div
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full border',
            checked
              ? 'border-rink-400 bg-rink-500 text-black'
              : 'border-white/10 bg-neutral-900 text-neutral-600'
          )}
        >
          {checked ? <CheckCircle2 className="h-4 w-4" /> : null}
        </div>
      </div>
    </button>
  );
}

function OutcomeCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-neutral-950/40 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-200">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-xs leading-5 text-neutral-500">{hint}</span> : null}
    </label>
  );
}

const INPUT_CLASSNAMES = cn(
  'w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500',
  'outline-none transition-colors focus:border-rink-400'
);
