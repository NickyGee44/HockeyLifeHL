import { getScorekeeperSession, getScorekeeperGameData, getGameEvents, getScorekeeperCheckins } from '@/lib/actions/scorekeeper';
import { ScoringInterface } from '@/components/scorekeeper/ScoringInterface';
import { CaptainFlowStepper } from '@/components/scorekeeper/CaptainFlowStepper';
import { deriveGameFlowStep } from '@/lib/scorekeeper/game-flow';
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

  // Captain self-scoring is a single linear workflow — show the progress header
  // so the captain always knows where they are (Attendance → Score → Verify → Complete).
  const flowStep =
    sessionResult.session.sessionOrigin === 'captain_self_score'
      ? deriveGameFlowStep(gameResult.game.status)
      : null;

  return (
    <>
      {flowStep && <CaptainFlowStepper current={flowStep} />}
      <ScoringInterface
        game={gameResult.game}
        events={eventsResult.events || []}
        leagueSlug={leagueSlug}
        session={sessionResult.session}
        checkins={checkinsResult?.checkins}
      />
    </>
  );
}
