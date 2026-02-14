'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getGamesForScorekeeperAssignment,
  bulkAssignScorekepers,
  bulkUnassignScorekepers,
  type GameWithScorekeeper,
  type LeagueScorekeeper,
} from '@/lib/actions/scorekeeper-management';
import { Loader2, AlertCircle, Calendar, CheckCircle, Search } from 'lucide-react';

interface BulkAssignGamesModalProps {
  leagueId: string;
  scorekeepers: LeagueScorekeeper[];
  selectedScorekeeper?: LeagueScorekeeper;
  seasons: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkAssignGamesModal({
  leagueId,
  scorekeepers,
  selectedScorekeeper,
  seasons,
  open,
  onOpenChange,
  onSuccess,
}: BulkAssignGamesModalProps) {
  const t = useTranslations('scorekeepers.bulkAssign');
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [games, setGames] = useState<GameWithScorekeeper[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const [filters, setFilters] = useState({
    seasonId: '',
    dateFrom: '',
    dateTo: '',
    unassignedOnly: true,
  });

  const [assignToScorekeeper, setAssignToScorekeeper] = useState(
    selectedScorekeeper?.scorekeeper_id || ''
  );

  const loadGames = async () => {
    setIsLoading(true);
    setError(null);

    const result = await getGamesForScorekeeperAssignment({
      leagueId,
      seasonId: filters.seasonId || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      unassignedOnly: filters.unassignedOnly,
    });

    if (result.success) {
      setGames(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  // Load games when modal opens or filters change
  useEffect(() => {
    if (open) {
      loadGames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadGames is a data-fetching function that depends on leagueId and filters; only runs when modal is open
  }, [open, filters]);

  // Set default scorekeeper when provided
  useEffect(() => {
    if (selectedScorekeeper) {
      setAssignToScorekeeper(selectedScorekeeper.scorekeeper_id); // eslint-disable-line -- sync state from prop
    }
  }, [selectedScorekeeper]);

  // Filter games by search
  const filteredGames = useMemo(() => {
    if (!searchQuery) return games;
    const query = searchQuery.toLowerCase();
    return games.filter((game) => {
      const homeTeam = (game.home_team?.name || 'Home').toLowerCase();
      const awayTeam = (game.away_team?.name || 'Away').toLowerCase();
      return homeTeam.includes(query) || awayTeam.includes(query);
    });
  }, [games, searchQuery]);

  const handleSelectGame = (gameId: string, selected: boolean) => {
    setSelectedGameIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(gameId);
      } else {
        next.delete(gameId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedGameIds.size === filteredGames.length) {
      setSelectedGameIds(new Set());
    } else {
      setSelectedGameIds(new Set(filteredGames.map((g) => g.id)));
    }
  };

  const handleAssign = () => {
    if (selectedGameIds.size === 0 || !assignToScorekeeper) return;

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const assignments = Array.from(selectedGameIds).map((gameId) => ({
        gameId,
        scorekeeperId: assignToScorekeeper,
      }));

      const result = await bulkAssignScorekepers({
        leagueId,
        assignments,
      });

      if (result.success) {
        setSuccessMessage(
          `Successfully assigned ${result.data.assigned} game(s).${
            result.data.failed.length > 0 ? ` ${result.data.failed.length} failed.` : ''
          }`
        );
        setSelectedGameIds(new Set());
        loadGames();
        onSuccess();
      } else {
        setError(result.error);
      }
    });
  };

  const handleUnassign = () => {
    if (selectedGameIds.size === 0) return;

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await bulkUnassignScorekepers({
        leagueId,
        gameIds: Array.from(selectedGameIds),
      });

      if (result.success) {
        setSuccessMessage(
          `Successfully unassigned ${result.data.unassigned} game(s).`
        );
        setSelectedGameIds(new Set());
        loadGames();
        onSuccess();
      } else {
        setError(result.error);
      }
    });
  };

  const handleClose = () => {
    setSelectedGameIds(new Set());
    setSuccessMessage(null);
    setError(null);
    onOpenChange(false);
  };

  const isAllSelected = filteredGames.length > 0 && selectedGameIds.size === filteredGames.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className="text-neutral-400">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <Select
                value={filters.seasonId}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, seasonId: value }))}
              >
                <SelectTrigger className="bg-neutral-800 border-white/10 text-white h-9 text-sm">
                  <SelectValue placeholder={t('allSeasons')} />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-white/10">
                  <SelectItem value="" className="text-white">{t('allSeasons')}</SelectItem>
                  {seasons.map((season) => (
                    <SelectItem key={season.id} value={season.id} className="text-white">
                      {season.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="w-36 bg-neutral-800 border-white/10 text-white h-9 text-sm"
              placeholder="From"
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="w-36 bg-neutral-800 border-white/10 text-white h-9 text-sm"
              placeholder="To"
            />
            <label className="flex items-center gap-2 text-sm text-neutral-400">
              <input
                type="checkbox"
                checked={filters.unassignedOnly}
                onChange={(e) => setFilters((prev) => ({ ...prev, unassignedOnly: e.target.checked }))}
                className="w-4 h-4 rounded border-white/30 bg-neutral-800"
              />
              {t('unassignedOnly')}
            </label>
          </div>

          {/* Assign to */}
          <div className="flex items-center gap-3">
            <Label className="text-sm whitespace-nowrap">{t('assignTo')}</Label>
            <Select
              value={assignToScorekeeper}
              onValueChange={setAssignToScorekeeper}
            >
              <SelectTrigger className="bg-neutral-800 border-white/10 text-white flex-1">
                <SelectValue placeholder={t('selectScorekeeper')} />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-white/10">
                {scorekeepers
                  .filter((sk) => sk.status === 'active')
                  .map((sk) => (
                    <SelectItem key={sk.id} value={sk.scorekeeper_id} className="text-white">
                      {sk.display_name || sk.profile?.full_name || sk.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search and select all */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <Input
                placeholder={t('searchGames')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-neutral-800 border-white/10 text-white placeholder:text-neutral-500 h-9"
              />
            </div>
            {filteredGames.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-white/30 bg-neutral-800"
                />
                <span className="text-neutral-400">{t('selectAll')}</span>
              </label>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-500 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {successMessage}
            </div>
          )}

          {/* Games list */}
          <div className="flex-1 overflow-y-auto border border-white/10 rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-rink-500" />
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Calendar className="w-12 h-12 text-neutral-600 mb-3" />
                <p className="text-neutral-400">{t('noGamesFound')}</p>
                <p className="text-sm text-neutral-500">{t('adjustFilters')}</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredGames.map((game) => (
                  <div
                    key={game.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors',
                      selectedGameIds.has(game.id) && 'bg-rink-500/10'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGameIds.has(game.id)}
                      onChange={(e) => handleSelectGame(game.id, e.target.checked)}
                      className="w-4 h-4 rounded border-white/30 bg-neutral-800"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">
                          {game.home_team?.name || 'Home'}
                        </span>
                        <span className="text-neutral-500">vs</span>
                        <span className="font-medium text-white truncate">
                          {game.away_team?.name || 'Away'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(game.scheduled_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    {game.scorekeeper_assignment && (
                      <div className="text-xs text-neutral-400 bg-neutral-800 px-2 py-1 rounded">
                        {game.scorekeeper_assignment.scorekeeper_name || 'Assigned'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selection count */}
          <p className="text-sm text-neutral-500">
            {t('gamesSelected', { count: selectedGameIds.size })}
          </p>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="border-white/10 text-neutral-300 hover:bg-neutral-800"
          >
            {t('close')}
          </Button>
          {!filters.unassignedOnly && selectedGameIds.size > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleUnassign}
              disabled={isPending}
              className="border-red-500/30 text-red-500 hover:bg-red-500/10"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('unassignSelected')}
            </Button>
          )}
          <Button
            type="button"
            onClick={handleAssign}
            disabled={isPending || selectedGameIds.size === 0 || !assignToScorekeeper}
            className={cn(
              'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold',
              'hover:shadow-lg hover:shadow-rink-500/20'
            )}
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('assignSelected')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
