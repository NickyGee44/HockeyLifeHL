'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import {
  ArrowRightLeft,
  Check,
  Loader2,
  Sparkles,
  AlertTriangle,
  X,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  DivisionHealth,
  TeamStats,
  ProposedMove,
  SwapSuggestion,
  ScheduleAdjustment,
} from '@/lib/actions/division-shuffle';
import {
  executeDivisionMoves,
  getAffectedFutureGames,
  suggestSwaps,
} from '@/lib/actions/division-shuffle';

// ==============================================================================
// TYPES
// ==============================================================================

interface DivisionShuffleToolProps {
  leagueId: string;
  divisions: DivisionHealth[];
  onComplete: () => void;
}

interface PendingMove {
  team: TeamStats;
  fromDivisionId: string;
  fromDivisionName: string;
  toDivisionId: string;
  toDivisionName: string;
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export function DivisionShuffleTool({
  leagueId,
  divisions,
  onComplete,
}: DivisionShuffleToolProps) {
  const t = useTranslations('divisions.shuffle');

  const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [affectedGamesCount, setAffectedGamesCount] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoadingAffected, setIsLoadingAffected] = useState(false);
  const [scheduleAction, setScheduleAction] = useState<ScheduleAdjustment>('keep');
  const [error, setError] = useState<string | null>(null);
  const [openDropdownTeamId, setOpenDropdownTeamId] = useState<string | null>(null);

  // Compute "virtual" divisions reflecting pending moves
  const getVirtualDivisions = useCallback((): DivisionHealth[] => {
    if (pendingMoves.length === 0) return divisions;

    return divisions.map((div) => {
      let teams = [...div.teams];

      // Remove teams being moved away
      const movingAway = pendingMoves
        .filter((m) => m.fromDivisionId === div.divisionId)
        .map((m) => m.team.teamId);
      teams = teams.filter((t) => !movingAway.includes(t.teamId));

      // Add teams being moved in
      const movingIn = pendingMoves
        .filter((m) => m.toDivisionId === div.divisionId)
        .map((m) => m.team);
      teams = [...teams, ...movingIn];

      const goalDiffs = teams.map((t) => t.goalDiff);
      const avg = goalDiffs.length > 0 ? goalDiffs.reduce((s, v) => s + v, 0) / goalDiffs.length : 0;

      return {
        ...div,
        teamCount: teams.length,
        avgGoalDiff: Math.round(avg * 10) / 10,
        teams,
      };
    });
  }, [divisions, pendingMoves]);

  const suggestions = suggestSwaps(divisions);
  const virtualDivisions = getVirtualDivisions();

  const addMove = (team: TeamStats, fromDiv: DivisionHealth, toDivId: string) => {
    const toDiv = divisions.find((d) => d.divisionId === toDivId);
    if (!toDiv || !team.divisionId) return;

    // Remove any existing move for this team
    const filtered = pendingMoves.filter((m) => m.team.teamId !== team.teamId);

    // Don't add a move back to original division
    if (team.divisionId === toDivId) {
      setPendingMoves(filtered);
    } else {
      setPendingMoves([
        ...filtered,
        {
          team,
          fromDivisionId: team.divisionId,
          fromDivisionName: fromDiv.divisionName,
          toDivisionId: toDivId,
          toDivisionName: toDiv.divisionName,
        },
      ]);
    }
    setOpenDropdownTeamId(null);
  };

  const removeMove = (teamId: string) => {
    setPendingMoves((prev) => prev.filter((m) => m.team.teamId !== teamId));
  };

  const applySuggestion = (suggestion: SwapSuggestion) => {
    const divA = divisions.find((d) => d.divisionId === suggestion.divisionA.id);
    const divB = divisions.find((d) => d.divisionId === suggestion.divisionB.id);
    if (!divA || !divB) return;

    // Remove existing moves for both teams
    const filtered = pendingMoves.filter(
      (m) => m.team.teamId !== suggestion.teamA.teamId && m.team.teamId !== suggestion.teamB.teamId
    );

    setPendingMoves([
      ...filtered,
      {
        team: suggestion.teamA,
        fromDivisionId: suggestion.divisionA.id,
        fromDivisionName: suggestion.divisionA.name,
        toDivisionId: suggestion.divisionB.id,
        toDivisionName: suggestion.divisionB.name,
      },
      {
        team: suggestion.teamB,
        fromDivisionId: suggestion.divisionB.id,
        fromDivisionName: suggestion.divisionB.name,
        toDivisionId: suggestion.divisionA.id,
        toDivisionName: suggestion.divisionA.name,
      },
    ]);
  };

  const handleConfirm = async () => {
    setIsLoadingAffected(true);

    // Count affected future games for all moves
    let totalAffected = 0;
    for (const move of pendingMoves) {
      const result = await getAffectedFutureGames(move.team.teamId, move.fromDivisionId);
      if (result.success) totalAffected += result.data;
    }

    setAffectedGamesCount(totalAffected);
    setIsLoadingAffected(false);
    setShowConfirmDialog(true);
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    const proposedMoves: ProposedMove[] = pendingMoves.map((m) => ({
      teamId: m.team.teamId,
      teamName: m.team.teamName,
      fromDivisionId: m.fromDivisionId,
      fromDivisionName: m.fromDivisionName,
      toDivisionId: m.toDivisionId,
      toDivisionName: m.toDivisionName,
    }));

    const result = await executeDivisionMoves(leagueId, proposedMoves, scheduleAction);

    if (result.success) {
      setShowConfirmDialog(false);
      setPendingMoves([]);
      onComplete();
    } else {
      setError(result.error);
    }
    setIsExecuting(false);
  };

  return (
    <div className="space-y-6">
      {/* Suggested Swaps */}
      {suggestions.length > 0 && (
        <div className="bg-white/[0.04] border border-rink-500/30 backdrop-blur-xl rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-rink-500" />
            <h3 className="font-semibold text-white">{t('suggestedSwaps')}</h3>
          </div>
          <div className="space-y-3">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-neutral-800/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white font-medium truncate">
                      {suggestion.teamA.teamName}
                    </span>
                    <ArrowRightLeft className="w-4 h-4 text-rink-500 flex-shrink-0" />
                    <span className="text-white font-medium truncate">
                      {suggestion.teamB.teamName}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">{suggestion.reason}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applySuggestion(suggestion)}
                  className="border-rink-500/30 text-rink-500 hover:bg-rink-500/10 flex-shrink-0"
                >
                  {t('applySwap')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Division Team Lists - Side by Side */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {virtualDivisions.map((div) => (
          <div
            key={div.divisionId}
            className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl overflow-hidden"
          >
            {/* Division Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white">{div.divisionName}</h4>
                <p className="text-xs text-neutral-400">
                  {t('teamCount', { count: div.teams.length })} · {t('avgDiff')}: {div.avgGoalDiff > 0 ? '+' : ''}{div.avgGoalDiff}
                </p>
              </div>
            </div>

            {/* Team List */}
            <div className="divide-y divide-white/5">
              {div.teams.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-neutral-500">
                  {t('noTeams')}
                </div>
              ) : (
                div.teams.map((team) => {
                  const isPending = pendingMoves.some((m) => m.team.teamId === team.teamId);
                  const isMovedIn = pendingMoves.some(
                    (m) => m.team.teamId === team.teamId && m.toDivisionId === div.divisionId
                  );
                  const isDropdownOpen = openDropdownTeamId === team.teamId;
                  const otherDivisions = divisions.filter(
                    (d) => d.divisionId !== (team.divisionId || div.divisionId)
                  );

                  return (
                    <div
                      key={team.teamId}
                      className={cn(
                        'px-4 py-2.5 flex items-center gap-3 transition-colors',
                        isMovedIn && 'bg-rink-500/10',
                        isPending && !isMovedIn && 'opacity-50'
                      )}
                    >
                      {/* Team Color */}
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: '#22D3EE' }}
                      >
                        {team.shortName?.substring(0, 2).toUpperCase()}
                      </div>

                      {/* Team Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {team.teamName}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          {team.wins}W-{team.losses}L-{team.ties}T · GD: {team.goalDiff > 0 ? '+' : ''}{team.goalDiff}
                        </p>
                      </div>

                      {/* Move Actions */}
                      {isMovedIn ? (
                        <button
                          onClick={() => removeMove(team.teamId)}
                          className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                          title={t('undoMove')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdownTeamId(isDropdownOpen ? null : team.teamId)}
                            className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                            title={t('moveTo')}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          {isDropdownOpen && otherDivisions.length > 0 && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenDropdownTeamId(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-neutral-800 border border-white/10 rounded-lg shadow-xl py-1">
                                <div className="px-3 py-1.5 text-[10px] text-neutral-500 uppercase tracking-wider">
                                  {t('moveTo')}
                                </div>
                                {otherDivisions.map((otherDiv) => (
                                  <button
                                    key={otherDiv.divisionId}
                                    onClick={() => addMove(team, div, otherDiv.divisionId)}
                                    className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
                                  >
                                    {otherDiv.divisionName}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pending Moves Summary */}
      {pendingMoves.length > 0 && (
        <div className="bg-white/[0.04] border border-rink-500/30 backdrop-blur-xl rounded-xl p-5">
          <h4 className="font-semibold text-white mb-3">
            {t('pendingMoves', { count: pendingMoves.length })}
          </h4>
          <div className="space-y-2 mb-4">
            {pendingMoves.map((move) => (
              <div
                key={move.team.teamId}
                className="flex items-center gap-3 p-2 rounded-lg bg-neutral-800/50"
              >
                <span className="text-sm text-white font-medium truncate">
                  {move.team.teamName}
                </span>
                <span className="text-xs text-neutral-500">{move.fromDivisionName}</span>
                <ArrowRightLeft className="w-3.5 h-3.5 text-rink-500 flex-shrink-0" />
                <span className="text-xs text-rink-400">{move.toDivisionName}</span>
                <button
                  onClick={() => removeMove(move.team.teamId)}
                  className="ml-auto p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setPendingMoves([])}
              variant="ghost"
              className="text-neutral-400 hover:text-white"
            >
              {t('clearAll')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoadingAffected}
              className={cn(
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              {isLoadingAffected ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('checking')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {t('reviewMoves')}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[500px] bg-neutral-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">{t('confirmTitle')}</DialogTitle>
            <DialogDescription>{t('confirmDescription')}</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {pendingMoves.map((move) => (
              <div
                key={move.team.teamId}
                className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50"
              >
                <span className="text-sm text-white font-medium">{move.team.teamName}</span>
                <span className="text-xs text-neutral-500">{move.fromDivisionName}</span>
                <ArrowRightLeft className="w-3.5 h-3.5 text-rink-500" />
                <span className="text-xs text-rink-400">{move.toDivisionName}</span>
              </div>
            ))}

            {affectedGamesCount > 0 && (
              <>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-400">
                    {t('affectedGames', { count: affectedGamesCount })}
                  </p>
                </div>

                {/* Schedule adjustment options */}
                <div className="space-y-2 p-3 rounded-lg bg-neutral-800/50">
                  <p className="text-xs font-medium text-neutral-300 uppercase tracking-wider mb-2">
                    {t('scheduleAction')}
                  </p>
                  {[
                    { value: 'keep' as const, label: t('scheduleKeep'), desc: t('scheduleKeepDesc') },
                    { value: 'update_division' as const, label: t('scheduleUpdate'), desc: t('scheduleUpdateDesc') },
                    { value: 'cancel_regen' as const, label: t('scheduleCancel'), desc: t('scheduleCancelDesc') },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors',
                        scheduleAction === option.value
                          ? 'bg-rink-500/10 border border-rink-500/30'
                          : 'hover:bg-neutral-700/50 border border-transparent'
                      )}
                    >
                      <input
                        type="radio"
                        name="scheduleAction"
                        value={option.value}
                        checked={scheduleAction === option.value}
                        onChange={() => setScheduleAction(option.value)}
                        className="mt-0.5 accent-rink-500"
                      />
                      <div>
                        <span className="text-sm text-white font-medium">{option.label}</span>
                        <p className="text-xs text-neutral-400 mt-0.5">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isExecuting}
              className="text-neutral-400 hover:text-white"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleExecute}
              disabled={isExecuting}
              className={cn(
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('executing')}
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  {t('confirmMoves')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
