'use client';

import { useState, useTransition } from 'react';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createGame } from '@/lib/actions/games';
import { Loader2, AlertCircle, AlertTriangle, CheckCircle, CalendarPlus } from 'lucide-react';

interface TeamOption {
  id: string;
  name: string;
}

interface VenueOption {
  id: string;
  name: string;
}

interface AddGameModalProps {
  leagueId: string;
  seasonId: string;
  teams: TeamOption[];
  venues: VenueOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const selectClass = cn(
  'w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white',
  'focus:border-rink-500 focus:outline-none focus:ring-1 focus:ring-rink-500',
);

const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1.5';

export function AddGameModal({
  leagueId,
  seasonId,
  teams,
  venues,
  open,
  onOpenChange,
  onSuccess,
}: AddGameModalProps) {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [location, setLocation] = useState('');
  const [gameType, setGameType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[] | null>(null);

  function reset() {
    setDate('');
    setTime('19:00');
    setHomeTeamId('');
    setAwayTeamId('');
    setLocation('');
    setGameType('');
    setError(null);
    setWarnings(null);
  }

  function handleClose(next: boolean) {
    if (isPending) return;
    if (!next) reset();
    onOpenChange(next);
  }

  function handleDone() {
    reset();
    onSuccess();
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!date || !time) {
      setError('Please choose a date and time.');
      return;
    }
    if (!homeTeamId || !awayTeamId) {
      setError('Please choose both teams.');
      return;
    }
    if (homeTeamId === awayTeamId) {
      setError('Home and away team cannot be the same.');
      return;
    }

    startTransition(async () => {
      const result = await createGame(leagueId, {
        seasonId,
        homeTeamId,
        awayTeamId,
        scheduledAt: `${date}T${time}:00`,
        location: location || null,
        gameType: gameType || null,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (result.data.warnings.length > 0) {
        // Game was created, but surface conflicts before closing.
        setWarnings(result.data.warnings);
        return;
      }

      handleDone();
    });
  }

  // Success-with-warnings state
  if (warnings) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Game added
            </DialogTitle>
            <DialogDescription>
              The game was added to the schedule, but we noticed a possible conflict:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
            <p className="text-xs text-neutral-500">
              You can reschedule or remove the game from the schedule if this isn&apos;t right.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleDone}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-rink-500" />
            Add game
          </DialogTitle>
          <DialogDescription>
            Add a single game to this season&apos;s schedule. Manually added games are kept when
            the schedule is regenerated.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="add-game-date">Date</label>
              <input
                id="add-game-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={selectClass}
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="add-game-time">Time</label>
              <input
                id="add-game-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={selectClass}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="add-game-home">Home team</label>
              <select
                id="add-game-home"
                value={homeTeamId}
                onChange={(e) => setHomeTeamId(e.target.value)}
                className={selectClass}
                required
              >
                <option value="">Select…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === awayTeamId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="add-game-away">Away team</label>
              <select
                id="add-game-away"
                value={awayTeamId}
                onChange={(e) => setAwayTeamId(e.target.value)}
                className={selectClass}
                required
              >
                <option value="">Select…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === homeTeamId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="add-game-venue">Venue</label>
              <select
                id="add-game-venue"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={selectClass}
              >
                <option value="">— None —</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="add-game-type">Type</label>
              <select
                id="add-game-type"
                value={gameType}
                onChange={(e) => setGameType(e.target.value)}
                className={selectClass}
              >
                <option value="">Regular season</option>
                <option value="playoff">Playoff</option>
                <option value="exhibition">Exhibition</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding…
                </>
              ) : (
                'Add game'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
