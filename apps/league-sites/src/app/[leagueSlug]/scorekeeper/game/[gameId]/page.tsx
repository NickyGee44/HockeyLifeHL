import { getScorekeeperSession, getScorekeeperGameData, getGameEvents, getScorekeeperCheckins } from '@/lib/actions/scorekeeper';
import { ScoringInterface } from '@/components/scorekeeper/ScoringInterface';
import { CaptainFlowStepper } from '@/components/scorekeeper/CaptainFlowStepper';
import { CaptainFlowStatusPanel } from '@/components/scorekeeper/CaptainFlowStatusPanel';
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
  const isCaptainSelfScore = sessionResult.session.sessionOrigin === 'captain_self_score';
  const flowStep = isCaptainSelfScore ? deriveGameFlowStep(gameResult.game.status) : null;

  // Once a captain has submitted (or the game is complete), returning to this URL
  // should show a status panel — not the live-scoring controls.
  const showStatusPanel =
    isCaptainSelfScore &&
    (gameResult.game.status === 'pending_verification' || gameResult.game.status === 'completed');

  return (
    <>
      {flowStep && <CaptainFlowStepper current={flowStep} />}
      {showStatusPanel ? (
        <CaptainFlowStatusPanel
          game={gameResult.game}
          session={sessionResult.session}
          leagueSlug={leagueSlug}
        />
      ) : (
        <ScoringInterface
          game={gameResult.game}
          events={eventsResult.events || []}
          leagueSlug={leagueSlug}
          session={sessionResult.session}
          checkins={checkinsResult?.checkins}
        />
      )}
    </>
  );
}
