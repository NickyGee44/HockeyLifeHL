import { getScorekeeperSession, getSessionGames } from '@/lib/actions/scorekeeper';
import { TokenEntryPage } from '@/components/scorekeeper/TokenEntryPage';
import { GameSelector } from '@/components/scorekeeper/GameSelector';
import { redirect } from 'next/navigation';

interface ScorekeeperPageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function ScorekeeperPage({
  params,
  searchParams,
}: ScorekeeperPageProps) {
  const { leagueSlug } = await params;
  const { token } = await searchParams;

  // Check for existing session
  const sessionResult = await getScorekeeperSession();

  if (sessionResult.success && sessionResult.session) {
    const session = sessionResult.session;

    if (session.sessionType === 'multi') {
      // Multi-game session: show game selector
      const gamesResult = await getSessionGames();
      if (gamesResult.success && gamesResult.games) {
        return (
          <GameSelector
            games={gamesResult.games}
            leagueSlug={leagueSlug}
          />
        );
      }
    }

    // Single-game session: redirect to game
    redirect(`/${leagueSlug}/scorekeeper/game/${session.gameId}`);
  }

  // No valid session: show token entry
  return <TokenEntryPage leagueSlug={leagueSlug} initialToken={token} />;
}
