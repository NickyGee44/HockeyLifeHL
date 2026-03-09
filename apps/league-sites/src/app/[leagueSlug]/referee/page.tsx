import { TokenEntryPage } from '@/components/referee/TokenEntryPage';

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

  // TODO: Check for existing referee session (ref_session cookie)
  // When referee session logic is wired up, check session and redirect:
  // const sessionResult = await getRefereeSession();
  // if (sessionResult.success && sessionResult.session) {
  //   redirect(`/${leagueSlug}/referee/dashboard`);
  // }

  // No valid session: show token entry
  return <TokenEntryPage leagueSlug={leagueSlug} initialToken={token} />;
}
