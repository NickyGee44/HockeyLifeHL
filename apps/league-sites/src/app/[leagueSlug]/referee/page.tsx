import { redirect } from 'next/navigation';
import { TokenEntryPage } from '@/components/referee/TokenEntryPage';
import { getRefereeSession } from '@/lib/actions/referee';

interface RefereePageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function RefereePage({
  params,
  searchParams,
}: RefereePageProps) {
  const { leagueSlug } = await params;
  const { token } = await searchParams;

  // Check for existing referee session — redirect if already authenticated
  const sessionResult = await getRefereeSession();
  if (sessionResult.success && sessionResult.session) {
    redirect(`/${leagueSlug}/referee/dashboard`);
  }

  // No valid session: show token entry
  return <TokenEntryPage leagueSlug={leagueSlug} initialToken={token} />;
}
