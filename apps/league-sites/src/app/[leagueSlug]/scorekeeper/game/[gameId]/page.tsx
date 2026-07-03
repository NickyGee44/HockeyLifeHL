import { getScorekeeperSession, getScorekeeperGameData, getGameEvents, getScorekeeperCheckins } from '@/lib/actions/scorekeeper';
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

  // Load game data and events in parallel
  const [gameResult, eventsResult] = await Promise.all([
    getScorekeeperGameData(gameId),
    getGameEvents(gameId),
  ]);

  if (!gameResult.success || !gameResult.game) {
    redirect(`/${leagueSlug}/scorekeeper`);
  }

  // Load checkins only when a scheduled game still needs the pre-game attendance step.
  const shouldShowPreGameCheckin =
    gameResult.game.status === 'scheduled' &&
    !(sessionResult.session.sessionOrigin === 'captain_self_score' && sessionResult.session.attendanceLocked);

  const checkinsResult = shouldShowPreGameCheckin
    ? await getScorekeeperCheckins(gameId)
    : null;

  return (
    <ScoringInterface
      game={gameResult.game}
      events={eventsResult.events || []}
      leagueSlug={leagueSlug}
      session={sessionResult.session}
      checkins={checkinsResult?.checkins}
    />
  );
}
