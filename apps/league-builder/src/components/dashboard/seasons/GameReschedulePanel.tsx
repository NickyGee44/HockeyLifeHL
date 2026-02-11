'use client';

/**
 * Game Reschedule Panel
 *
 * Modal for bulk-postponing scheduled games and rescheduling postponed games.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import {
  CloudOff,
  CalendarClock,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { bulkPostponeGames, rescheduleGame } from '@/lib/actions/games';
import type { ScheduledGame, Team } from '@/lib/schedule/types';

// ============================================================================
// TYPES
// ============================================================================

interface GameReschedulePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  games: ScheduledGame[];
  teams: Team[];
  onGamesUpdated: () => void;
}

type ReasonPreset = 'weather' | 'facilityIssue' | 'other';

// ============================================================================
// HELPERS
// ============================================================================

function groupGamesByDate(games: ScheduledGame[]): Record<string, ScheduledGame[]> {
  const groups: Record<string, ScheduledGame[]> = {};
  for (const game of games) {
    const dateKey = game.scheduledAt.toLocaleDateString('en-CA'); // YYYY-MM-DD
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(game);
  }
  return groups;
}

function formatDateHeading(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GameReschedulePanel({
  open,
  onOpenChange,
  games,
  teams,
  onGamesUpdated,
}: GameReschedulePanelProps) {
  const t = useTranslations('schedule');
  const router = useRouter();
  const teamsById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams]
  );

  // Postpone section state
  const [selectedPostponeIds, setSelectedPostponeIds] = useState<Set<string>>(new Set());
  const [reasonPreset, setReasonPreset] = useState<ReasonPreset | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [isPostponing, setIsPostponing] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Reschedule section state
  const [rescheduleMap, setRescheduleMap] = useState<Record<string, string>>({});
  const [shiftDays, setShiftDays] = useState<number>(7);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Derived data
  const scheduledGames = useMemo(
    () => games.filter((g) => g.status === 'scheduled').sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()),
    [games]
  );
  const postponedGames = useMemo(
    () => games.filter((g) => g.status === 'postponed').sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()),
    [games]
  );

  const scheduledByDate = useMemo(() => groupGamesByDate(scheduledGames), [scheduledGames]);
  const reason = reasonPreset === 'other' ? customReason : reasonPreset ? t(`reasons.${reasonPreset}`) : '';

  // Toggle date expansion
  const toggleDate = (dateKey: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  // Toggle single game selection
  const toggleGameSelection = (gameId: string) => {
    setSelectedPostponeIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  // Select all games on a date
  const toggleDateSelection = (dateKey: string) => {
    const dateGames = scheduledByDate[dateKey] ?? [];
    const dateGameIds = dateGames.map((g) => g.id!).filter(Boolean);
    const allSelected = dateGameIds.every((id) => selectedPostponeIds.has(id));

    setSelectedPostponeIds((prev) => {
      const next = new Set(prev);
      for (const id of dateGameIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  // Handle postpone
  const handlePostpone = async () => {
    if (selectedPostponeIds.size === 0 || !reason.trim()) return;

    setIsPostponing(true);
    try {
      const result = await bulkPostponeGames(
        Array.from(selectedPostponeIds),
        reason.trim()
      );

      if (result.success) {
        toast.success(t('postponeSuccess', { count: result.data.postponed }));
        setSelectedPostponeIds(new Set());
        setReasonPreset(null);
        setCustomReason('');
        onGamesUpdated();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to postpone games');
    } finally {
      setIsPostponing(false);
    }
  };

  // Handle reschedule
  const handleReschedule = async () => {
    const entries = Object.entries(rescheduleMap).filter(([, dt]) => dt);
    if (entries.length === 0) return;

    setIsRescheduling(true);
    let successCount = 0;

    try {
      for (const [gameId, newDateTime] of entries) {
        const result = await rescheduleGame(gameId, new Date(newDateTime).toISOString());
        if (result.success) successCount++;
      }

      if (successCount > 0) {
        toast.success(t('rescheduleSuccess', { count: successCount }));
        setRescheduleMap({});
        onGamesUpdated();
        router.refresh();
      }
    } catch {
      toast.error('Failed to reschedule games');
    } finally {
      setIsRescheduling(false);
    }
  };

  // Apply day shift to all postponed games
  const applyShift = () => {
    const newMap: Record<string, string> = {};
    for (const game of postponedGames) {
      if (!game.id) continue;
      const shifted = new Date(game.scheduledAt);
      shifted.setDate(shifted.getDate() + shiftDays);
      // Format as datetime-local value
      const y = shifted.getFullYear();
      const m = String(shifted.getMonth() + 1).padStart(2, '0');
      const d = String(shifted.getDate()).padStart(2, '0');
      const h = String(shifted.getHours()).padStart(2, '0');
      const min = String(shifted.getMinutes()).padStart(2, '0');
      newMap[game.id] = `${y}-${m}-${d}T${h}:${min}`;
    }
    setRescheduleMap(newMap);
  };

  const reasonPresets: { key: ReasonPreset; label: string }[] = [
    { key: 'weather', label: t('reasons.weather') },
    { key: 'facilityIssue', label: t('reasons.facilityIssue') },
    { key: 'other', label: t('reasons.other') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-white/10 max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <CloudOff className="w-5 h-5 text-amber-500" />
            {t('manageCancellations')}
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Postpone scheduled games or reschedule postponed ones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 mt-4">
          {/* ============================================================ */}
          {/* SECTION 1: Postpone Games */}
          {/* ============================================================ */}
          <section>
            <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CloudOff className="w-4 h-4" />
              {t('postponeGames')}
            </h3>

            {scheduledGames.length === 0 ? (
              <p className="text-neutral-500 text-sm py-4 text-center">
                {t('noScheduledGames')}
              </p>
            ) : (
              <div className="space-y-3">
                {/* Date-grouped game list */}
                <div className="space-y-2 max-h-60 overflow-y-auto rounded-lg border border-white/[0.06] bg-neutral-950/50">
                  {Object.entries(scheduledByDate).map(([dateKey, dateGames]) => {
                    const dateGameIds = dateGames.map((g) => g.id!).filter(Boolean);
                    const allSelected = dateGameIds.length > 0 && dateGameIds.every((id) => selectedPostponeIds.has(id));
                    const someSelected = dateGameIds.some((id) => selectedPostponeIds.has(id));
                    const isExpanded = expandedDates.has(dateKey);

                    return (
                      <div key={dateKey}>
                        {/* Date header */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800/50 sticky top-0">
                          <button
                            type="button"
                            onClick={() => toggleDate(dateKey)}
                            className="text-neutral-400 hover:text-white transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someSelected && !allSelected;
                            }}
                            onChange={() => toggleDateSelection(dateKey)}
                            className="rounded border-neutral-600 bg-neutral-800 text-rink-500 focus:ring-rink-500"
                          />
                          <span className="text-xs font-medium text-neutral-300">
                            {formatDateHeading(dateKey)}
                          </span>
                          <span className="text-xs text-neutral-500">
                            ({dateGames.length} game{dateGames.length !== 1 ? 's' : ''})
                          </span>
                        </div>

                        {/* Games in this date */}
                        {isExpanded &&
                          dateGames.map((game) => (
                            <label
                              key={game.id}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2 pl-10 cursor-pointer transition-colors',
                                selectedPostponeIds.has(game.id!)
                                  ? 'bg-amber-500/5'
                                  : 'hover:bg-neutral-800/30'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={selectedPostponeIds.has(game.id!)}
                                onChange={() => toggleGameSelection(game.id!)}
                                className="rounded border-neutral-600 bg-neutral-800 text-rink-500 focus:ring-rink-500"
                              />
                              <span className="text-sm text-neutral-400 w-14 shrink-0">
                                {game.scheduledAt.toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span className="text-sm text-white">
                                {teamsById[game.homeTeamId]?.shortName || teamsById[game.homeTeamId]?.name || 'TBD'}
                              </span>
                              <span className="text-xs text-neutral-500">vs</span>
                              <span className="text-sm text-white">
                                {teamsById[game.awayTeamId]?.shortName || teamsById[game.awayTeamId]?.name || 'TBD'}
                              </span>
                            </label>
                          ))}
                      </div>
                    );
                  })}
                </div>

                {/* Reason selection */}
                <div className="space-y-2">
                  <Label className="text-neutral-300 text-xs">{t('reason')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {reasonPresets.map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => setReasonPreset(preset.key)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                          reasonPreset === preset.key
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-neutral-800 text-neutral-400 border border-white/[0.06] hover:border-amber-500/30'
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {reasonPreset === 'other' && (
                  <Textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="bg-neutral-800 border-white/10 text-white text-sm min-h-[60px]"
                  />
                )}

                <Button
                  onClick={handlePostpone}
                  disabled={selectedPostponeIds.size === 0 || !reason.trim() || isPostponing}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isPostponing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isPostponing
                    ? t('postponing')
                    : `${t('postponeSelected')} (${selectedPostponeIds.size})`}
                </Button>
              </div>
            )}
          </section>

          {/* Divider */}
          <div className="border-t border-white/[0.06]" />

          {/* ============================================================ */}
          {/* SECTION 2: Reschedule Postponed Games */}
          {/* ============================================================ */}
          <section>
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CalendarClock className="w-4 h-4" />
              {t('rescheduleGames')}
            </h3>

            {postponedGames.length === 0 ? (
              <p className="text-neutral-500 text-sm py-4 text-center">
                {t('noPostponedGames')}
              </p>
            ) : (
              <div className="space-y-3">
                {/* Shift all by N days */}
                <div className="flex items-end gap-3 p-3 rounded-lg bg-neutral-800/50 border border-white/[0.06]">
                  <div className="flex-1">
                    <Label className="text-neutral-400 text-xs mb-1 block">
                      {t('shiftAllByDays')}
                    </Label>
                    <input
                      type="number"
                      value={shiftDays}
                      onChange={(e) => setShiftDays(parseInt(e.target.value) || 0)}
                      min={-365}
                      max={365}
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm focus:ring-rink-500 focus:border-rink-500"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={applyShift}
                    variant="outline"
                    size="sm"
                    className="border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                  >
                    {t('applyShift')}
                  </Button>
                </div>

                {/* Postponed games with date pickers */}
                <div className="space-y-2 max-h-60 overflow-y-auto rounded-lg border border-white/[0.06] bg-neutral-950/50">
                  {postponedGames.map((game) => (
                    <div
                      key={game.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2 border-b border-white/[0.04] last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-white font-medium truncate">
                            {teamsById[game.homeTeamId]?.shortName || teamsById[game.homeTeamId]?.name || 'TBD'}
                          </span>
                          <span className="text-neutral-500 text-xs">vs</span>
                          <span className="text-white font-medium truncate">
                            {teamsById[game.awayTeamId]?.shortName || teamsById[game.awayTeamId]?.name || 'TBD'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500">
                          Originally:{' '}
                          {game.scheduledAt.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          at{' '}
                          {game.scheduledAt.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <input
                          type="datetime-local"
                          value={rescheduleMap[game.id!] ?? ''}
                          onChange={(e) =>
                            setRescheduleMap((prev) => ({
                              ...prev,
                              [game.id!]: e.target.value,
                            }))
                          }
                          className="px-2 py-1.5 rounded-lg bg-neutral-800 border border-white/10 text-white text-xs focus:ring-rink-500 focus:border-rink-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleReschedule}
                  disabled={
                    Object.values(rescheduleMap).filter(Boolean).length === 0 || isRescheduling
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isRescheduling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isRescheduling
                    ? t('rescheduling')
                    : `${t('rescheduleSelected')} (${Object.values(rescheduleMap).filter(Boolean).length})`}
                </Button>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
