import { getScorekeeperSession, getScorekeeperGameData, getGameEvents } from '@/lib/actions/scorekeeper';
import { ScoringInterface } from '@/components/scorekeeper/ScoringInterface';
import { redirect } from 'next/navigation';

interface GameScoringPageProps {
  params: Promise<{ leagueSlug: string; gameId: string }>;
}

export default async function GameScoringPage({ params }: GameScoringPageProps) {
  const { leagueSlug, gameId } = await params;

  // Verify session
  const sessionResult = await getScorekeeperSession();
  if (!sessionResult.success || !sessionResult.session) {
    redirect(`/${leagueSlug}/scorekeeper`);
  }

  // Load game data
  const [gameResult, eventsResult] = await Promise.all([
    getScorekeeperGameData(gameId),
    getGameEvents(gameId),
  ]);

  if (!gameResult.success || !gameResult.game) {
    redirect(`/${leagueSlug}/scorekeeper`);
  }

  return (
    <ScoringInterface
      game={gameResult.game}
      events={eventsResult.events || []}
      leagueSlug={leagueSlug}
      sessionType={sessionResult.session.sessionType}
    />
  );
}
