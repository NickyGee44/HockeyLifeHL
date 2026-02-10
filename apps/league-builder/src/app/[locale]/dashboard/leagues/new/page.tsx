import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getDraft } from '@/lib/actions/league-wizard';
import { getPlatformFeeConfig } from '@/lib/fees/platform-fees';
import { WizardContainer } from '@/components/league-wizard/wizard-container';
import { WizardStep } from '@/components/ui/wizard/wizard-steps';
import { Step1OrgInfo } from '@/components/league-wizard/steps/step-1-org-info';
import { Step2LeagueInfo } from '@/components/league-wizard/steps/step-2-league-info';
import { Step3SeasonScorekeeping } from '@/components/league-wizard/steps/step-3-season-scorekeeping';
import { Step4Teams } from '@/components/league-wizard/steps/step-4-teams';
import { Step5WebsitePages } from '@/components/league-wizard/steps/step-5-website-pages';
import { Step6Addons } from '@/components/league-wizard/steps/step-6-addons';
import { Step7RegistrationPayments } from '@/components/league-wizard/steps/step-7-registration-payments';
import { Step8Review } from '@/components/league-wizard/steps/step-8-review';

export const metadata = {
  title: 'Create New League | Beer League Hockey',
  description: 'Create a new hockey league with our easy step-by-step wizard',
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    step?: string;
  }>;
}

export default async function NewLeaguePage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const resolvedSearchParams = await searchParams;

  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/login?redirect=/${locale}/dashboard/leagues/new`);
  }

  // Check if user has an organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_user_id', user.id)
    .single();

  if (orgError || !org) {
    redirect(`/${locale}/dashboard?error=no-organization`);
  }

  // Load draft data if exists
  const draftResult = await getDraft();
  const draftData = draftResult.success ? draftResult.data : null;

  // Load platform fee config
  const feeConfig = await getPlatformFeeConfig();

  // Get current step from URL (default to 1)
  const currentStepParam = resolvedSearchParams.step;
  const currentStep = currentStepParam ? parseInt(currentStepParam, 10) : 1;

  return (
    <div className="min-h-screen bg-background">
      <WizardContainer initialData={draftData}>
        <WizardStep step={1} isActive={currentStep === 1}>
          <Step1OrgInfo />
        </WizardStep>

        <WizardStep step={2} isActive={currentStep === 2}>
          <Step2LeagueInfo />
        </WizardStep>

        <WizardStep step={3} isActive={currentStep === 3}>
          <Step3SeasonScorekeeping />
        </WizardStep>

        <WizardStep step={4} isActive={currentStep === 4}>
          <Step4Teams />
        </WizardStep>

        <WizardStep step={5} isActive={currentStep === 5}>
          <Step5WebsitePages />
        </WizardStep>

        <WizardStep step={6} isActive={currentStep === 6}>
          <Step6Addons />
        </WizardStep>

        <WizardStep step={7} isActive={currentStep === 7}>
          <Step7RegistrationPayments platformFeePercent={feeConfig.processingFeePercent} />
        </WizardStep>

        <WizardStep step={8} isActive={currentStep === 8}>
          <Step8Review />
        </WizardStep>
      </WizardContainer>
    </div>
  );
}
