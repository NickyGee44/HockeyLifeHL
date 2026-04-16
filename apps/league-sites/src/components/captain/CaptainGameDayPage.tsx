'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  CircleHelp,
  ClipboardList,
  Loader2,
  Shield,
  SquarePen,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { HomepageWeeklyGames } from '@/components/home/HomepageWeeklyGames';
import { CaptainLineupModalEditor } from '@/components/captain/CaptainLineupModalEditor';
import { SubInviteModal } from '@/components/captain/SubInviteModal';
import { TeamLineupView } from '@/components/team/TeamLineupView';
import {
  getCaptainGameDayData,
  updateCaptainGameAttendanceStatus,
  type CaptainAttendanceStatus,
  type CaptainGameDayData,
  type GameDayAttendancePlayer,
} from '@/lib/actions/game-day';
import { getOrCreateCaptainScorekeeperSession } from '@/lib/actions/scorekeeper';

type CaptainGameDayPageProps = {
  leagueSlug: string;
  requestedGameId: string;
  teamId: string;
  canManage: boolean;
};

export function CaptainGameDayPage({
  leagueSlug,
  requestedGameId,
  teamId,
  canManage,
}: CaptainGameDayPageProps) {
  const router = useRouter();
  const [data, setData] = useState<CaptainGameDayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLineupEditor, setShowLineupEditor] = useState(false);
  const [showAttendanceEditor, setShowAttendanceEditor] = useState(false);
  const [showSubInvite, setShowSubInvite] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [startingScore, startScoreTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadGameDay() {
      if (!canManage) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const result = await getCaptainGameDayData(teamId, requestedGameId);
      if (cancelled) return;

      if (!result.success) {
        setError(result.error);
        setData(null);
        setIsLoading(false);
        return;
      }

      setData(result.data);
      setIsLoading(false);

      if (result.data?.resolvedGameId && result.data.resolvedGameId !== requestedGameId) {
        router.replace(`/${leagueSlug}/captain/lineups/${result.data.resolvedGameId}`);
      }
    }

    loadGameDay();
    return () => {
      cancelled = true;
    };
  }, [canManage, leagueSlug, requestedGameId, router, teamId, refreshToken]);

  const placedIds = useMemo(
    () => new Set(data?.lineup.layout.placedPlayers.map((player) => player.playerId) ?? []),
    [data?.lineup.layout.placedPlayers],
  );

  const lineupPlayers = useMemo(
    () => (data?.lineup.layout.roster ?? []).filter((player) => placedIds.has(player.playerId)),
    [data?.lineup.layout.roster, placedIds],
  );

  const skaters = lineupPlayers
    .filter((player) => !isGoalie(player.position))
    .map((player) => ({
      playerId: player.playerId,
      name: player.fullName ?? 'Player',
      jerseyNumber: player.jerseyNumber,
      position: player.position,
    }));

  const goalies = lineupPlayers
    .filter((player) => isGoalie(player.position))
    .map((player) => ({
      playerId: player.playerId,
      name: player.fullName ?? 'Player',
      jerseyNumber: player.jerseyNumber,
      position: player.position,
    }));

  const availabilityMap = Object.fromEntries(
    (data?.lineup.layout.roster ?? [])
      .filter((player) => player.availability === 'confirmed' || player.availability === 'tentative' || player.availability === 'out')
      .map((player) => [player.playerId, player.availability]),
  ) as Record<string, 'confirmed' | 'tentative' | 'out'>;

  const refreshData = () => setRefreshToken((current) => current + 1);

  const handleStartScoring = () => {
    if (!data?.resolvedGameId || !data.scoreSelfEnabled) return;

    startScoreTransition(async () => {
      const result = await getOrCreateCaptainScorekeeperSession(data.resolvedGameId!, teamId);
      if (result.success && result.token) {
        window.location.href = `/${result.leagueSlug ?? leagueSlug}/scorekeeper?token=${result.token}`;
        return;
      }

      window.alert(result.error || 'Failed to start scoring session.');
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading Game Day...</p>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
        <CaptainMessage
          leagueSlug={leagueSlug}
          icon={<Shield className="mx-auto h-10 w-10 text-amber-300" />}
        title="Captain access required"
        body="Only captains and alternate captains can manage Game Day."
      />
    );
  }

  if (error) {
    return (
        <CaptainMessage
          leagueSlug={leagueSlug}
          icon={<AlertCircle className="mx-auto h-10 w-10 text-amber-300" />}
        title="Could not load Game Day"
        body={error}
      />
    );
  }

  if (!data || !data.game) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href={`/${leagueSlug}/captain`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Captain dashboard
        </Link>

        <div className="mt-6 rounded-[30px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-[0_30px_80px_-48px_rgba(0,0,0,0.75)]">
          <CalendarDays className="mx-auto h-12 w-12 text-[var(--league-primary)]" />
          <h1 className="mt-4 text-3xl font-black tracking-tight text-[var(--color-text-primary)]">
            Game Day
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            No active or upcoming game is available for this team right now.
          </p>
        </div>
      </div>
    );
  }

  const currentData = data;
  const currentGame = currentData.game!;
  const teamPrimaryColor =
    currentGame.home_team?.id === teamId
      ? (currentGame.home_team?.colors ?? '#0f172a')
      : (currentGame.away_team?.colors ?? '#0f172a');
  const teamSecondaryColor = '#f8fafc';

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link
          href={`/${leagueSlug}/captain`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Captain dashboard
        </Link>

        <div className="mt-4 space-y-8">
          <section>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[var(--league-primary)]/12 p-3 text-[var(--league-primary)]">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Captain Control
                </p>
                <h1 className="text-3xl font-black tracking-tight text-[var(--color-text-primary)] md:text-4xl">
                  Game Day
                </h1>
              </div>
            </div>
          </section>

          <section>
            <HomepageWeeklyGames
              games={[currentGame]}
              leagueSlug={leagueSlug}
              timezone={currentData.leagueTimezone}
              backgroundPreset="weekly-games"
              title="Game Card"
              emptyTitle=""
              emptyDescription=""
              showViewToggle={false}
              variant="team"
              teamActions={<GameDayCountTiles counts={currentData.counts} />}
            />
          </section>

          <section className="relative z-40 space-y-4">
            <SectionHeading
              icon={<ClipboardList className="h-5 w-5 text-[var(--league-primary)]" />}
              title="Action Tiles"
              description="Everything important for the current game, without the old studio on the main page."
            />
            <div className="relative z-40 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ActionTile
                icon={<SquarePen className="h-5 w-5" />}
                title="Set Lineup"
                description="Open the lineup editor in a focused overlay."
                onClick={() => setShowLineupEditor(true)}
              />
              <ActionTile
                icon={<Users className="h-5 w-5" />}
                title="Edit Attendance"
                description="Update every player to In, Out, Unsure, or No Response."
                onClick={() => setShowAttendanceEditor(true)}
              />
              <ActionTile
                icon={<UserPlus className="h-5 w-5" />}
                title="Invite Sub"
                description="Search league subs and send a game invite."
                onClick={() => setShowSubInvite(true)}
              />
              <ActionTile
                icon={<Trophy className="h-5 w-5" />}
                title="Score Game"
                description={currentData.scoreDisabledReason ?? 'Launch the scorekeeper session for this game.'}
                onClick={() => setShowScoreModal(true)}
                disabled={Boolean(currentData.scoreDisabledReason)}
              />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading
              icon={<SquarePen className="h-5 w-5 text-[var(--league-primary)]" />}
              title="Live Snapshot"
              description={`${currentData.lineup.status === 'published' ? 'Published' : 'Draft'} lineup preview. Use the action tiles to edit lineup or attendance in modals.`}
            />
            <div className="rounded-[30px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_28px_70px_-46px_rgba(0,0,0,0.8)] md:p-7">
              <TeamLineupView
                skaters={skaters}
                goalies={goalies}
                primaryColor={teamPrimaryColor}
                secondaryColor={teamSecondaryColor}
                availabilityMap={availabilityMap}
              />
            </div>
          </section>
        </div>
      </div>

      <Overlay
        open={showLineupEditor}
        onClose={() => {
          setShowLineupEditor(false);
          refreshData();
        }}
        title="Set Lineup"
      >
        <CaptainLineupModalEditor
          leagueSlug={leagueSlug}
          gameId={currentData.resolvedGameId!}
          teamId={teamId}
          initialLayout={currentData.lineup.layout}
          initialStatus={currentData.lineup.status}
          primaryColor={teamPrimaryColor}
          secondaryColor={teamSecondaryColor}
        />
      </Overlay>

      <AttendanceEditorModal
        open={showAttendanceEditor}
        onClose={() => {
          setShowAttendanceEditor(false);
          refreshData();
        }}
        leagueSlug={leagueSlug}
        gameId={currentData.resolvedGameId!}
        teamId={teamId}
        players={currentData.attendance}
      />

      <SubInviteModal
        isOpen={showSubInvite}
        onClose={() => {
          setShowSubInvite(false);
          refreshData();
        }}
        gameId={currentData.resolvedGameId!}
        teamId={teamId}
        leagueId={currentData.leagueId}
        roster={currentData.rosterPlayerIds.map((playerId) => ({
          id: playerId,
          player_id: playerId,
          jersey_number: null,
          position: null,
          leadership_role: null,
          player_type: 'regular' as const,
          profile: null,
        }))}
      />

      <Overlay
        open={showScoreModal}
        onClose={() => setShowScoreModal(false)}
        title="Score Game"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Start scorekeeping for {currentData.teamName} vs {currentData.opponentName}. This uses the same captain self-scoring flow as the rest of the site.
          </p>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]/70 p-4">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {currentData.scoreDisabledReason ?? 'Captain self-scoring is enabled for this league.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartScoring}
            disabled={Boolean(currentData.scoreDisabledReason) || startingScore}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--league-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-accent-text)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          >
            {startingScore ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
            Start Scoring
          </button>
        </div>
      </Overlay>
    </>
  );
}

function CaptainMessage({
  leagueSlug,
  icon,
  title,
  body,
}: {
  leagueSlug: string;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-[28px] border border-amber-400/20 bg-amber-400/10 p-6 text-center">
        {icon}
        <h1 className="mt-4 text-2xl font-black text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-amber-100/85">{body}</p>
        <Link
          href={`/${leagueSlug}/captain`}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to captain dashboard
        </Link>
      </div>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-full bg-[var(--league-primary)]/12 p-2.5">{icon}</div>
      <div>
        <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>
      </div>
    </div>
  );
}

function GameDayCountTiles({
  counts,
}: {
  counts: CaptainGameDayData['counts'];
}) {
  const items = [
    { label: 'In', value: counts.in, tone: 'emerald' },
    { label: 'Out', value: counts.out, tone: 'rose' },
    { label: 'Unsure', value: counts.unsure, tone: 'amber' },
    { label: 'Subs', value: counts.subs, tone: 'cyan' },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-2xl border px-3 py-3 text-center ${buildCountTone(item.tone)}`}
        >
          <p className="text-xl font-black tracking-tight">{item.value}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function buildCountTone(tone: 'emerald' | 'rose' | 'amber' | 'cyan') {
  if (tone === 'emerald') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
  if (tone === 'rose') return 'border-rose-400/20 bg-rose-400/10 text-rose-300';
  if (tone === 'amber') return 'border-amber-400/20 bg-amber-400/10 text-amber-300';
  return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300';
}

function ActionTile({
  icon,
  title,
  description,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative z-40 rounded-[26px] border p-5 text-left transition-all ${
        disabled
          ? 'cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-400'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-[0_28px_70px_-46px_rgba(0,0,0,0.8)] hover:border-[var(--league-primary)]/40 hover:bg-[var(--color-background-elevated)]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-2xl p-3 ${disabled ? 'bg-slate-800 text-slate-400' : 'bg-[var(--league-primary)]/12 text-[var(--league-primary)]'}`}>
          {icon}
        </div>
        <div>
          <p className="text-base font-black tracking-tight">{title}</p>
          <p className="mt-1 text-sm leading-5 text-inherit/80">{description}</p>
        </div>
      </div>
    </button>
  );
}

function AttendanceStatusBadge({ status }: { status: CaptainAttendanceStatus }) {
  const config =
    status === 'confirmed'
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
      : status === 'out'
        ? 'border-rose-400/20 bg-rose-400/10 text-rose-300'
        : status === 'tentative'
          ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
          : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-secondary)]';

  const label =
    status === 'confirmed' ? 'In' : status === 'out' ? 'Out' : status === 'tentative' ? 'Unsure' : 'No Response';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${config}`}>
      {label}
    </span>
  );
}

function Overlay({
  open,
  onClose,
  title,
  children,
  fullScreen = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  fullScreen?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/78 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div className="relative flex min-h-full items-center justify-center px-3 py-6 sm:px-4">
        <div className={`${fullScreen ? 'h-[min(92vh,980px)] w-full max-w-6xl' : 'w-full max-w-3xl'} relative`}>
          <div className="pointer-events-none absolute -inset-3 rounded-[38px] bg-[var(--league-primary)]/12 blur-2xl" />
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[var(--color-surface)] shadow-[0_40px_120px_-38px_rgba(0,0,0,0.95)]">
            <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-black/25 px-5 py-4 backdrop-blur-sm sm:px-6">
              <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                {title}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-black/35 p-2 text-white transition-colors hover:bg-black/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className={fullScreen ? 'max-h-[calc(92vh-72px)] overflow-y-auto bg-[var(--color-background)]' : 'max-h-[calc(92vh-72px)] overflow-y-auto bg-[var(--color-surface)] p-5 sm:p-6'}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendanceEditorModal({
  open,
  onClose,
  leagueSlug,
  gameId,
  teamId,
  players,
}: {
  open: boolean;
  onClose: () => void;
  leagueSlug: string;
  gameId: string;
  teamId: string;
  players: GameDayAttendancePlayer[];
}) {
  const [rows, setRows] = useState(players);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(players);
  }, [players]);

  if (!open) return null;

  const setStatus = async (playerId: string, status: CaptainAttendanceStatus) => {
    const previous = rows;
    setError(null);
    setSavingPlayerId(playerId);
    setRows((current) =>
      current.map((player) =>
        player.playerId === playerId ? { ...player, status } : player,
      ),
    );

    const result = await updateCaptainGameAttendanceStatus({
      gameId,
      teamId,
      playerId,
      status,
      leagueSlug,
    });

    if (!result.success) {
      setRows(previous);
      setError(result.error || 'Could not update attendance.');
    }

    setSavingPlayerId(null);
  };

  return (
    <Overlay open={open} onClose={onClose} title="Edit Attendance">
      <div className="space-y-4">
        <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
          Update attendance for the current game. Tap an icon to change each player instantly.
        </p>
        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        ) : null}
        <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          {rows.map((player) => (
            <div
              key={player.playerId}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]/60 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                      {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}
                      {player.fullName}
                    </p>
                    {player.isSub ? (
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                        Sub
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {player.position || 'Skater'}
                  </p>
                </div>
                {savingPlayerId === player.playerId ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--league-primary)]" />
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  {
                    status: 'confirmed' as CaptainAttendanceStatus,
                    label: 'In',
                    icon: Check,
                    active: 'border-emerald-400/30 bg-emerald-400/14 text-emerald-300',
                  },
                  {
                    status: 'out' as CaptainAttendanceStatus,
                    label: 'Out',
                    icon: X,
                    active: 'border-rose-400/30 bg-rose-400/14 text-rose-300',
                  },
                  {
                    status: 'tentative' as CaptainAttendanceStatus,
                    label: 'Unsure',
                    icon: CircleHelp,
                    active: 'border-amber-400/30 bg-amber-400/14 text-amber-300',
                  },
                ]).map(({ status, label, icon: Icon, active }) => (
                  <button
                    key={status}
                    type="button"
                    disabled={savingPlayerId === player.playerId}
                    onClick={() => setStatus(player.playerId, status)}
                    aria-label={label}
                    title={label}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                      player.status === status
                        ? active
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
                <button
                  type="button"
                  disabled={savingPlayerId === player.playerId}
                  onClick={() => setStatus(player.playerId, 'no_response')}
                  aria-label="No response"
                  title="No response"
                  className={`inline-flex min-w-[96px] items-center justify-center rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                    player.status === 'no_response'
                      ? 'border-slate-400/30 bg-slate-400/12 text-slate-200'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  No response
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Overlay>
  );
}

function isGoalie(position: string | null) {
  if (!position) return false;
  const normalized = position.toLowerCase();
  return normalized === 'g' || normalized === 'goalie';
}
