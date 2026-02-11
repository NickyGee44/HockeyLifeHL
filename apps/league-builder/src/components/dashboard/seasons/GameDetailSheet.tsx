'use client';

/**
 * Game Detail Sheet
 *
 * Slide-over panel that shows game details and allows editing scores,
 * changing status, and rescheduling games. Uses Dialog styled as a
 * right-side sheet since sheet.tsx is not available.
 */

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  MapPin,
  Calendar,
  Clock,
  Hash,
  Play,
  CheckCircle2,
  CloudOff,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  updateGame,
  rescheduleGame,
  cancelGame,
  postponeGame,
  type GameStatus,
} from '@/lib/actions/games';
import type { ScheduledGame, Team } from '@/lib/schedule/types';

// ============================================================================
// TYPES
// ============================================================================

interface GameDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: ScheduledGame | null;
  teams: Team[];
  onGameUpdated: () => void;
}

// ============================================================================
// STATUS CONFIG (mirrors SchedulePageClient.tsx)
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-500/10 text-green-400 border-green-500/30',
  },
  postponed: {
    label: 'Postponed',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function formatGameDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatGameTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDatetimeLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GameDetailSheet({
  open,
  onOpenChange,
  game,
  teams,
  onGameUpdated,
}: GameDetailSheetProps) {
  const t = useTranslations('schedule');

  const teamsById = useMemo(
    () => Object.fromEntries(teams.map((team) => [team.id, team])),
    [teams]
  );

  // Form state
  const [homeScore, setHomeScore] = useState<string>('');
  const [awayScore, setAwayScore] = useState<string>('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleLocation, setRescheduleLocation] = useState('');
  const [actionReason, setActionReason] = useState('');

  // Loading states
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // UI state
  const [showReschedule, setShowReschedule] = useState(false);
  const [showReasonInput, setShowReasonInput] = useState<'postpone' | 'cancel' | null>(null);

  // Reset form when game changes
  useEffect(() => {
    if (game) {
      setHomeScore(game.homeScore != null ? String(game.homeScore) : '');
      setAwayScore(game.awayScore != null ? String(game.awayScore) : '');
      setRescheduleDate(toDatetimeLocal(game.scheduledAt));
      setRescheduleLocation(game.location || '');
      setActionReason('');
      setShowReschedule(false);
      setShowReasonInput(null);
    }
  }, [game]);

  if (!game) return null;

  const status = game.status ?? 'scheduled';
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.scheduled;
  const homeTeam = teamsById[game.homeTeamId];
  const awayTeam = teamsById[game.awayTeamId];
  const isEditable = status === 'scheduled' || status === 'in_progress';

  // ------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------

  const handleSaveScore = async () => {
    if (!game.id) return;

    const home = homeScore !== '' ? parseInt(homeScore, 10) : undefined;
    const away = awayScore !== '' ? parseInt(awayScore, 10) : undefined;

    if (home !== undefined && (isNaN(home) || home < 0 || home > 99)) {
      toast.error('Home score must be between 0 and 99');
      return;
    }
    if (away !== undefined && (isNaN(away) || away < 0 || away > 99)) {
      toast.error('Away score must be between 0 and 99');
      return;
    }

    setIsSavingScore(true);
    try {
      const result = await updateGame(game.id, {
        home_score: home,
        away_score: away,
      });

      if (result.success) {
        toast.success(t('scoreUpdated'));
        onGameUpdated();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to update score');
    } finally {
      setIsSavingScore(false);
    }
  };

  const handleStatusChange = async (newStatus: 'in_progress' | 'completed') => {
    if (!game.id) return;

    setIsChangingStatus(true);
    try {
      const updates: { status: GameStatus; home_score?: number; away_score?: number } = {
        status: newStatus,
      };

      // When completing, include current scores
      if (newStatus === 'completed') {
        const home = homeScore !== '' ? parseInt(homeScore, 10) : 0;
        const away = awayScore !== '' ? parseInt(awayScore, 10) : 0;
        updates.home_score = home;
        updates.away_score = away;
      }

      const result = await updateGame(game.id, updates);

      if (result.success) {
        const label = newStatus === 'in_progress' ? 'started' : 'completed';
        toast.success(t('gameStatusChanged', { status: label }));
        onGameUpdated();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to update game status');
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handlePostpone = async () => {
    if (!game.id || !actionReason.trim()) return;

    setIsChangingStatus(true);
    try {
      const result = await postponeGame(game.id, actionReason.trim());

      if (result.success) {
        toast.success(t('gamePostponed'));
        setShowReasonInput(null);
        setActionReason('');
        onGameUpdated();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to postpone game');
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleCancel = async () => {
    if (!game.id || !actionReason.trim()) return;

    setIsChangingStatus(true);
    try {
      const result = await cancelGame(game.id, actionReason.trim());

      if (result.success) {
        toast.success(t('gameCancelled'));
        setShowReasonInput(null);
        setActionReason('');
        onGameUpdated();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to cancel game');
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleReschedule = async () => {
    if (!game.id || !rescheduleDate) return;

    setIsRescheduling(true);
    try {
      const newDateTime = new Date(rescheduleDate).toISOString();
      const newLocation = rescheduleLocation.trim() || undefined;

      const result = await rescheduleGame(game.id, newDateTime, newLocation);

      if (result.success) {
        toast.success(t('gameRescheduled'));
        setShowReschedule(false);
        onGameUpdated();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to reschedule game');
    } finally {
      setIsRescheduling(false);
    }
  };

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'bg-neutral-900 border-white/10 p-0',
          // Override default center positioning to slide in from right
          'fixed right-0 top-0 left-auto h-full max-h-full w-full max-w-md',
          'translate-x-0 translate-y-0 rounded-none sm:rounded-l-xl',
          'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          // Remove the default centering transforms
          '!left-auto !top-0 !translate-x-0 !translate-y-0'
        )}
      >
        <div className="flex flex-col h-full max-h-screen overflow-y-auto">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
            <DialogTitle className="text-white text-lg font-bold">
              {t('gameDetails')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              View and manage game details, scores, and status
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* ============================================================ */}
            {/* MATCHUP HEADER */}
            {/* ============================================================ */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-3">
                <div className="text-right flex-1">
                  <p className="text-white font-bold text-base truncate">
                    {homeTeam?.name ?? 'Unknown'}
                  </p>
                  <p className="text-neutral-500 text-xs uppercase tracking-wider">
                    {t('home')}
                  </p>
                </div>
                <span className="text-neutral-600 text-sm font-medium px-2">vs</span>
                <div className="text-left flex-1">
                  <p className="text-white font-bold text-base truncate">
                    {awayTeam?.name ?? 'Unknown'}
                  </p>
                  <p className="text-neutral-500 text-xs uppercase tracking-wider">
                    {t('away')}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                  statusConfig.className
                )}
              >
                {statusConfig.label}
              </span>
            </div>

            {/* ============================================================ */}
            {/* GAME INFO */}
            {/* ============================================================ */}
            <div className="space-y-3 bg-neutral-800/50 rounded-lg border border-white/[0.06] p-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-neutral-500 shrink-0" />
                <span className="text-white">{formatGameDate(game.scheduledAt)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-neutral-500 shrink-0" />
                <span className="text-white">{formatGameTime(game.scheduledAt)}</span>
              </div>
              {game.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-neutral-500 shrink-0" />
                  <span className="text-white">{game.location}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Hash className="w-4 h-4 text-neutral-500 shrink-0" />
                <span className="text-neutral-400">
                  Round {game.roundNumber}
                  {game.gameNumber != null && ` / Game #${game.gameNumber}`}
                </span>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SCORE ENTRY */}
            {/* ============================================================ */}
            {isEditable && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  {t('scoreEntry')}
                </h3>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label className="text-neutral-400 text-xs mb-1 block">
                      {homeTeam?.shortName || homeTeam?.name || t('home')}
                    </Label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={homeScore}
                      onChange={(e) => setHomeScore(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-white text-center text-lg font-bold tabular-nums focus:ring-rink-500 focus:border-rink-500"
                    />
                  </div>
                  <span className="text-neutral-600 text-sm font-medium pb-2.5">-</span>
                  <div className="flex-1">
                    <Label className="text-neutral-400 text-xs mb-1 block">
                      {awayTeam?.shortName || awayTeam?.name || t('away')}
                    </Label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={awayScore}
                      onChange={(e) => setAwayScore(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-white text-center text-lg font-bold tabular-nums focus:ring-rink-500 focus:border-rink-500"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveScore}
                  disabled={isSavingScore || (homeScore === '' && awayScore === '')}
                  size="sm"
                  className="w-full bg-rink-500 hover:bg-rink-600 text-black font-medium"
                >
                  {isSavingScore && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('saveScore')}
                </Button>
              </div>
            )}

            {/* Completed game score display */}
            {status === 'completed' && game.homeScore != null && game.awayScore != null && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  {t('finalScore')}
                </h3>
                <div className="flex items-center justify-center gap-4 bg-neutral-800/50 rounded-lg border border-white/[0.06] p-4">
                  <div className="text-center">
                    <p className="text-neutral-400 text-xs mb-1">
                      {homeTeam?.shortName || homeTeam?.name || t('home')}
                    </p>
                    <p className="text-white text-3xl font-bold tabular-nums">{game.homeScore}</p>
                  </div>
                  <span className="text-neutral-600 text-lg font-bold">-</span>
                  <div className="text-center">
                    <p className="text-neutral-400 text-xs mb-1">
                      {awayTeam?.shortName || awayTeam?.name || t('away')}
                    </p>
                    <p className="text-white text-3xl font-bold tabular-nums">{game.awayScore}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* STATUS ACTIONS */}
            {/* ============================================================ */}
            {isEditable && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  {t('actions')}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {/* Start Game */}
                  {status === 'scheduled' && (
                    <Button
                      onClick={() => handleStatusChange('in_progress')}
                      disabled={isChangingStatus}
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      {isChangingStatus ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-1.5" />
                      )}
                      {t('startGame')}
                    </Button>
                  )}

                  {/* Complete Game */}
                  {(status === 'scheduled' || status === 'in_progress') && (
                    <Button
                      onClick={() => handleStatusChange('completed')}
                      disabled={isChangingStatus}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isChangingStatus ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      )}
                      {t('completeGame')}
                    </Button>
                  )}

                  {/* Postpone */}
                  {status === 'scheduled' && (
                    <Button
                      onClick={() => setShowReasonInput('postpone')}
                      disabled={isChangingStatus}
                      size="sm"
                      variant="outline"
                      className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      <CloudOff className="w-4 h-4 mr-1.5" />
                      {t('postpone')}
                    </Button>
                  )}

                  {/* Cancel */}
                  <Button
                    onClick={() => setShowReasonInput('cancel')}
                    disabled={isChangingStatus}
                    size="sm"
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    {t('cancelGame')}
                  </Button>
                </div>

                {/* Reason input for postpone/cancel */}
                {showReasonInput && (
                  <div className="space-y-2 p-3 rounded-lg bg-neutral-800/50 border border-white/[0.06]">
                    <Label className="text-neutral-300 text-xs">
                      {showReasonInput === 'postpone'
                        ? t('postponeReason')
                        : t('cancelReason')}
                    </Label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder={t('enterReason')}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:ring-rink-500 focus:border-rink-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={showReasonInput === 'postpone' ? handlePostpone : handleCancel}
                        disabled={!actionReason.trim() || isChangingStatus}
                        size="sm"
                        className={cn(
                          'flex-1',
                          showReasonInput === 'postpone'
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        )}
                      >
                        {isChangingStatus && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                        {showReasonInput === 'postpone' ? t('confirmPostpone') : t('confirmCancel')}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowReasonInput(null);
                          setActionReason('');
                        }}
                        size="sm"
                        variant="outline"
                        className="border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                      >
                        {t('back')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* RESCHEDULE */}
            {/* ============================================================ */}
            {(status === 'scheduled' || status === 'postponed') && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowReschedule(!showReschedule)}
                  className="text-xs font-semibold text-blue-400 uppercase tracking-wider hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {t('reschedule')}
                </button>

                {showReschedule && (
                  <div className="space-y-3 p-3 rounded-lg bg-neutral-800/50 border border-white/[0.06]">
                    <div>
                      <Label className="text-neutral-400 text-xs mb-1 block">
                        {t('newDateTime')}
                      </Label>
                      <input
                        type="datetime-local"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm focus:ring-rink-500 focus:border-rink-500"
                      />
                    </div>
                    <div>
                      <Label className="text-neutral-400 text-xs mb-1 block">
                        {t('location')}
                      </Label>
                      <input
                        type="text"
                        value={rescheduleLocation}
                        onChange={(e) => setRescheduleLocation(e.target.value)}
                        placeholder={game.location || t('sameLocation')}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:ring-rink-500 focus:border-rink-500"
                      />
                    </div>
                    <Button
                      onClick={handleReschedule}
                      disabled={!rescheduleDate || isRescheduling}
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isRescheduling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {t('confirmReschedule')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
