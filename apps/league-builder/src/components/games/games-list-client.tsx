'use client';

import { useState, useCallback, useTransition, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { Game, GameFilters as GameFiltersType } from '@/lib/actions/games';
import { adminFinalizeStuckGame, getGames, updateGame } from '@/lib/actions/games';
import { regenerateGameRecap } from '@/lib/actions/ai-articles';
import { GameCardCompact } from './game-card';
import { GameFilters } from './game-filters';
import { BulkActionsBar } from './bulk-actions-bar';
import { GameEditModal } from './game-edit-modal';
import { CancelGameModal } from './cancel-game-modal';
import { AssignScorekeeperModal } from './assign-scorekeeper-modal';
import { Loader2, RefreshCw, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface GamesListClientProps {
  leagueId: string;
  initialGames: Game[];
  initialTeams: Array<{ id: string; name: string; short_name: string | null }>;
  initialSeasons: Array<{ id: string; name: string }>;
}

export function GamesListClient({
  leagueId,
  initialGames,
  initialTeams,
  initialSeasons,
}: GamesListClientProps) {
  const router = useRouter();
  const t = useTranslations('schedule');
  const [isPending, startTransition] = useTransition();

  const [games, setGames] = useState<Game[]>(initialGames);
  const [teams] = useState(initialTeams);
  const [seasons] = useState(initialSeasons);
  const [filters, setFilters] = useState<GameFiltersType>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [cancelGame, setCancelGame] = useState<Game | null>(null);
  const [assignScorekeeperGame, setAssignScorekeeperGame] = useState<Game | null>(null);
  const [activeGameAction, setActiveGameAction] = useState<string | null>(null);

  // Refresh games from server
  const refreshGames = useCallback(() => {
    startTransition(async () => {
      const result = await getGames(leagueId, filters);
      if (result.success) {
        setGames(result.data.games);
      }
    });
  }, [leagueId, filters]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: GameFiltersType) => {
    setFilters(newFilters);
    startTransition(async () => {
      const result = await getGames(leagueId, newFilters);
      if (result.success) {
        setGames(result.data.games);
      }
    });
  }, [leagueId]);

  // Selection handlers
  const handleSelectGame = useCallback((gameId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(gameId);
      } else {
        next.delete(gameId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === games.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(games.map((g) => g.id)));
    }
  }, [games, selectedIds.size]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Edit/Cancel success handlers
  const handleEditSuccess = useCallback((updatedGame: Game) => {
    setGames((prev) =>
      prev.map((g) => (g.id === updatedGame.id ? updatedGame : g))
    );
    setEditGame(null);
    router.refresh();
  }, [router]);

  const handleCancelSuccess = useCallback((updatedGame: Game) => {
    setGames((prev) =>
      prev.map((g) => (g.id === updatedGame.id ? updatedGame : g))
    );
    setCancelGame(null);
    router.refresh();
  }, [router]);

  const handleBulkSuccess = useCallback(() => {
    refreshGames();
  }, [refreshGames]);

  const handleAssignScorekeeperSuccess = useCallback(() => {
    setAssignScorekeeperGame(null);
    refreshGames();
  }, [refreshGames]);

  const handleCompleteGame = useCallback((game: Game) => {
    if (!window.confirm(t('completeGameConfirm'))) {
      return;
    }

    const actionKey = `${game.id}:complete`;
    setActiveGameAction(actionKey);
    startTransition(async () => {
      try {
        const result = game.status === 'scheduled'
          ? await updateGame(game.id, { status: 'completed' })
          : await adminFinalizeStuckGame(game.id);
        if (!result.success) {
          toast.error(result.error || t('completeGameFailed'));
          return;
        }
        toast.success(t('completeGameSuccess'));
        refreshGames();
        router.refresh();
      } finally {
        setActiveGameAction(null);
      }
    });
  }, [refreshGames, router, t]);

  const handleGenerateGameRecap = useCallback((game: Game) => {
    if (!window.confirm(t('generateGameRecapConfirm'))) {
      return;
    }

    const actionKey = `${game.id}:recap`;
    setActiveGameAction(actionKey);
    startTransition(async () => {
      try {
        const result = await regenerateGameRecap(game.id, leagueId);
        if (!result.success) {
          toast.error(result.error || t('generateGameRecapFailed'));
          return;
        }
        toast.success(t('generateGameRecapSuccess'));
        router.refresh();
      } finally {
        setActiveGameAction(null);
      }
    });
  }, [leagueId, router, t]);

  // Group games by date
  const gamesByDate = useMemo(() => {
    const grouped = new Map<string, Game[]>();
    games.forEach((game) => {
      const dateKey = new Date(game.scheduled_at).toISOString().split('T')[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(game);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [games]);

  const isAllSelected = games.length > 0 && selectedIds.size === games.length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <GameFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        teams={teams}
        seasons={seasons}
      />

      {/* List Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {games.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-rink-500/30 bg-neutral-800 text-rink-500 focus:ring-rink-500 focus:ring-offset-neutral-900"
              />
              <span className="text-sm text-neutral-400">
                {isAllSelected ? 'Deselect all' : 'Select all'}
              </span>
            </label>
          )}
          <span className="text-sm text-neutral-500">
            {games.length} game{games.length !== 1 ? 's' : ''}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={refreshGames}
          disabled={isPending}
          className="gap-2 border-white/10 text-neutral-300 hover:bg-neutral-800"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Games List */}
      {games.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
          <Calendar className="w-16 h-16 text-rink-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Games Found</h3>
          <p className="text-neutral-400 mb-6 max-w-md mx-auto">
            {Object.keys(filters).length > 0
              ? 'No games match your current filters. Try adjusting your filters or clearing them.'
              : 'This league doesn\'t have any games scheduled yet. Create a season and schedule games to get started.'}
          </p>
          {Object.keys(filters).length > 0 && (
            <Button
              variant="outline"
              onClick={() => handleFiltersChange({})}
              className="border-rink-500/30 text-rink-500 hover:bg-rink-500/10"
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {gamesByDate.map(([dateKey, dateGames]) => (
            <div key={dateKey} className="space-y-3">
              <h3 className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(dateKey).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                <span className="text-neutral-600">({dateGames.length})</span>
              </h3>
              <div className="space-y-2">
                {dateGames.map((game) => (
                  <GameCardCompact
                    key={game.id}
                    game={game}
                    selected={selectedIds.has(game.id)}
                    onSelect={(selected) => handleSelectGame(game.id, selected)}
                    onEdit={() => setEditGame(game)}
                    onCancel={() => setCancelGame(game)}
                    onAssignScorekeeper={() => setAssignScorekeeperGame(game)}
                    onComplete={() => handleCompleteGame(game)}
                    onGenerateRecap={() => handleGenerateGameRecap(game)}
                    isCompleting={activeGameAction === `${game.id}:complete`}
                    isGeneratingRecap={activeGameAction === `${game.id}:recap`}
                    onClick={() => router.push(`/dashboard/leagues/${leagueId}/games/${game.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        onClearSelection={handleClearSelection}
        onSuccess={handleBulkSuccess}
      />

      {/* Edit Modal */}
      {editGame && (
        <GameEditModal
          game={editGame}
          open={!!editGame}
          onOpenChange={(open) => !open && setEditGame(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Cancel Modal */}
      {cancelGame && (
        <CancelGameModal
          game={cancelGame}
          open={!!cancelGame}
          onOpenChange={(open) => !open && setCancelGame(null)}
          onSuccess={handleCancelSuccess}
        />
      )}

      {/* Assign Scorekeeper Modal */}
      {assignScorekeeperGame && (
        <AssignScorekeeperModal
          game={assignScorekeeperGame}
          open={!!assignScorekeeperGame}
          onOpenChange={(open) => !open && setAssignScorekeeperGame(null)}
          onSuccess={handleAssignScorekeeperSuccess}
        />
      )}
    </div>
  );
}
