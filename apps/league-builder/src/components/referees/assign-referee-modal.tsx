'use client';

import { useState, useTransition, useEffect } from 'react';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LeagueReferee } from '@/lib/actions/referee-management';
import { bulkAssignRefereeToGames } from '@/lib/actions/referee-management';
import { Loader2, CheckCircle2, Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface GameForAssignment {
  id: string;
  scheduled_at: string;
  status: string;
  location: string | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
}

interface AssignRefereeModalProps {
  leagueId: string;
  referees: LeagueReferee[];
  selectedReferee?: LeagueReferee;
  games: GameForAssignment[];
  seasons: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignRefereeModal({
  leagueId,
  referees,
  selectedReferee,
  games,
  open,
  onOpenChange,
  onSuccess,
}: AssignRefereeModalProps) {
  const [isPending, startTransition] = useTransition();
  const [chosenRefereeId, setChosenRefereeId] = useState(selectedReferee?.id || '');
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('scheduled');
  const [result, setResult] = useState<{ assigned: number; skipped: number } | null>(null);

  useEffect(() => {
    if (selectedReferee) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChosenRefereeId(selectedReferee.id);
    }
  }, [selectedReferee]);

  const chosenReferee = referees.find((r) => r.id === chosenRefereeId);

  const filteredGames = games.filter((g) => {
    if (filterStatus && filterStatus !== 'all') {
      return g.status === filterStatus;
    }
    return true;
  });

  const toggleGame = (gameId: string) => {
    setSelectedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedGameIds.size === filteredGames.length) {
      setSelectedGameIds(new Set());
    } else {
      setSelectedGameIds(new Set(filteredGames.map((g) => g.id)));
    }
  };

  const handleAssign = () => {
    if (!chosenReferee || selectedGameIds.size === 0) return;

    startTransition(async () => {
      const res = await bulkAssignRefereeToGames({
        leagueId,
        refereeName: chosenReferee.name,
        leagueRefereeId: chosenReferee.league_referee_id || undefined,
        gameIds: Array.from(selectedGameIds),
        role: 'referee',
      });

      if (res.success) {
        setResult({ assigned: res.assigned, skipped: res.skipped });
        onSuccess();
      }
    });
  };

  const handleClose = () => {
    setResult(null);
    setSelectedGameIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-neutral-900 border-white/10 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Referee to Games</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Select a referee and choose games to assign them to.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Assignment Complete</h3>
            <p className="text-neutral-400">
              {result.assigned} game{result.assigned !== 1 ? 's' : ''} assigned
              {result.skipped > 0 && `, ${result.skipped} skipped (already assigned)`}
            </p>
            <Button onClick={handleClose} className="mt-4">
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* Referee selector */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-300">Referee</label>
              <Select value={chosenRefereeId} onValueChange={setChosenRefereeId}>
                <SelectTrigger className="bg-neutral-800 border-white/10 text-white">
                  <SelectValue placeholder="Select a referee" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-white/10">
                  {referees.filter((r) => r.is_active).map((referee) => (
                    <SelectItem key={referee.id} value={referee.id} className="text-white">
                      {referee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-neutral-400" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 bg-neutral-800 border-white/10 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-white/10">
                  <SelectItem value="all" className="text-white">All Games</SelectItem>
                  <SelectItem value="scheduled" className="text-white">Scheduled</SelectItem>
                  <SelectItem value="in_progress" className="text-white">In Progress</SelectItem>
                  <SelectItem value="completed" className="text-white">Completed</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1" />

              <Button variant="ghost" size="sm" onClick={selectAll} className="text-neutral-400 hover:text-white text-xs">
                {selectedGameIds.size === filteredGames.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {/* Games list */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0 max-h-[40vh]">
              {filteredGames.length === 0 ? (
                <p className="text-neutral-500 text-center py-8">No games match the filter.</p>
              ) : (
                filteredGames.map((game) => (
                  <label
                    key={game.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      selectedGameIds.has(game.id)
                        ? 'border-blue-500/50 bg-blue-500/5'
                        : 'border-white/10 hover:border-white/20'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGameIds.has(game.id)}
                      onChange={() => toggleGame(game.id)}
                      className="w-4 h-4 rounded border-blue-500/30 bg-neutral-800 text-blue-500 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {game.home_team?.name || 'TBD'} vs {game.away_team?.name || 'TBD'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(game.scheduled_at), 'MMM d, yyyy h:mm a')}
                        {game.location && (
                          <>
                            <span>-</span>
                            <span className="truncate">{game.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} className="border-white/10 text-neutral-300">
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={isPending || !chosenRefereeId || selectedGameIds.size === 0}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold"
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Assign to {selectedGameIds.size} Game{selectedGameIds.size !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
