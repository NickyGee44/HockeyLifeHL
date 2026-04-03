import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getLeagueShellOnboardingContext } from '@/lib/actions/league-shell-onboarding';
import { LeagueShellOnboarding } from '@/components/onboarding/LeagueShellOnboarding';

export const metadata = {
  title: 'Create League | Beer League Hockey',
  description: 'Create the league shell, then move directly into first-season setup.',
};

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NewLeaguePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/login?redirect=/${locale}/dashboard/leagues/new`);
  }

  const context = await getLeagueShellOnboardingContext();
  if (!context.success) {
    redirect(`/${locale}/setup-organization`);
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <LeagueShellOnboarding
        locale={locale}
        organization={context.data.organization}
        defaultContactEmail={context.data.defaultContactEmail}
      />
    </div>
  );
}
