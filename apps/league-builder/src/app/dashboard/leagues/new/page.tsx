import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDraft } from '@/lib/actions/league-wizard';
import { WizardContainer } from '@/components/league-wizard/wizard-container';
import { WizardStep } from '@/components/ui/wizard/wizard-steps';
import { Step1LeagueInfo } from '@/components/league-wizard/steps/step-1-league-info';
import { Step2SeasonSettings } from '@/components/league-wizard/steps/step-2-season-settings';
import { Step3Teams } from '@/components/league-wizard/steps/step-3-teams';
import { Step4RegistrationFees } from '@/components/league-wizard/steps/step-4-registration-fees';
import { Step5PaymentSetup } from '@/components/league-wizard/steps/step-5-payment-setup';
import { Step6WebsiteBranding } from '@/components/league-wizard/steps/step-6-website-branding';
import { Step7Review } from '@/components/league-wizard/steps/step-7-review';

export const metadata = {
  title: 'Create New League | HockeyLifeHL',
  description: 'Create a new hockey league with our easy step-by-step wizard',
};

interface PageProps {
  searchParams: Promise<{
    step?: string;
  }>;
}

export default async function NewLeaguePage({ searchParams }: PageProps) {
  // Await searchParams as required in Next.js 16
  const resolvedSearchParams = await searchParams;
  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login?redirect=/dashboard/leagues/new');
  }

  // Check if user has an organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_user_id', user.id)
    .single();

  if (orgError || !org) {
    // Redirect to organization setup if they don't have one
    // For now, we'll show an error (you can create an org setup page later)
    redirect('/dashboard?error=no-organization');
  }

  // Load draft data if exists
  const draftResult = await getDraft();
  const draftData = draftResult.success ? draftResult.data : null;

  // Get current step from URL (default to 1)
  const currentStepParam = resolvedSearchParams.step;
  const currentStep = currentStepParam ? parseInt(currentStepParam, 10) : 1;

  return (
    <div className="min-h-screen bg-background">
      <WizardContainer initialData={draftData}>
        <WizardStep step={1} isActive={currentStep === 1}>
          <Step1LeagueInfo />
        </WizardStep>

        <WizardStep step={2} isActive={currentStep === 2}>
          <Step2SeasonSettings />
        </WizardStep>

        <WizardStep step={3} isActive={currentStep === 3}>
          <Step3Teams />
        </WizardStep>

        <WizardStep step={4} isActive={currentStep === 4}>
          <Step4RegistrationFees />
        </WizardStep>

        <WizardStep step={5} isActive={currentStep === 5}>
          <Step5PaymentSetup />
        </WizardStep>

        <WizardStep step={6} isActive={currentStep === 6}>
          <Step6WebsiteBranding />
        </WizardStep>

        <WizardStep step={7} isActive={currentStep === 7}>
          <Step7Review />
        </WizardStep>
      </WizardContainer>
    </div>
  );
}
