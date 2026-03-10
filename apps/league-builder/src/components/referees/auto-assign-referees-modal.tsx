'use client';

import { useState, useTransition } from 'react';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { autoAssignReferees } from '@/lib/actions/referee-management';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Shield,
  Wand2,
} from 'lucide-react';

interface AutoAssignRefereesModalProps {
  leagueId: string;
  seasons: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AutoAssignRefereesModal({
  leagueId,
  seasons,
  open,
  onOpenChange,
  onSuccess,
}: AutoAssignRefereesModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    gamesProcessed: number;
    gamesAssigned: number;
    gamesSkipped: number;
    assignments: Array<{ gameId: string; refereeId: string; refereeName: string; role: string }>;
    skipped: Array<{ gameId: string; reason: string }>;
  } | null>(null);
  const [options, setOptions] = useState({
    seasonId: '',
    dateFrom: '',
    dateTo: '',
    strategy: 'round_robin' as 'round_robin' | 'least_assigned' | 'availability_based',
    overwriteExisting: false,
    officialsPerGame: '2',
  });

  const handleAutoAssign = () => {
    setError(null);
    setResult(null);

    startTransition(async () => {
      const assignResult = await autoAssignReferees({
        leagueId,
        seasonId: options.seasonId || undefined,
        dateFrom: options.dateFrom || undefined,
        dateTo: options.dateTo || undefined,
        overwriteExisting: options.overwriteExisting,
        officialsPerGame: Number(options.officialsPerGame),
        strategy: options.strategy,
      });

      if (!assignResult.success || !assignResult.data) {
        setError(assignResult.error || 'Failed to auto-assign referees.');
        return;
      }

      setResult(assignResult.data);
      if (assignResult.data.assignments.length > 0) {
        onSuccess();
      }
    });
  };

  const handleClose = () => {
    setError(null);
    setResult(null);
    onOpenChange(false);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
      return;
    }

    setError(null);
    setResult(null);
    onOpenChange(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-blue-400" />
            Auto-Assign Referees
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Fill upcoming games from each referee&apos;s weekly availability, workload limits, and role eligibility.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div
              className={cn(
                'rounded-lg border p-4',
                result.assignments.length > 0
                  ? 'border-green-500/30 bg-green-500/10'
                  : 'border-yellow-500/30 bg-yellow-500/10'
              )}
            >
              <div
                className={cn(
                  'mb-3 flex items-center gap-2 font-medium',
                  result.assignments.length > 0 ? 'text-green-400' : 'text-yellow-400'
                )}
              >
                {result.assignments.length > 0 ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                Auto-Assignment Complete
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-white/5 p-3">
                  <p className="text-neutral-400">Games processed</p>
                  <p className="text-xl font-bold text-white">{result.gamesProcessed}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <p className="text-neutral-400">Assignments created</p>
                  <p className="text-xl font-bold text-green-400">{result.assignments.length}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <p className="text-neutral-400">Games with officials added</p>
                  <p className="text-xl font-bold text-blue-400">{result.gamesAssigned}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <p className="text-neutral-400">Games skipped</p>
                  <p className="text-xl font-bold text-yellow-400">{result.gamesSkipped}</p>
                </div>
              </div>

              {result.skipped.length > 0 && (
                <div className="mt-3 text-sm">
                  <p className="mb-1 text-neutral-400">Skipped reasons</p>
                  <ul className="max-h-24 space-y-1 overflow-y-auto text-xs text-neutral-500">
                    {result.skipped.slice(0, 5).map((skip, index) => (
                      <li key={`${skip.gameId}-${index}`}>{skip.reason}</li>
                    ))}
                    {result.skipped.length > 5 && (
                      <li>...and {result.skipped.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!result && (
            <>
              <div className="space-y-2">
                <Label>Season</Label>
                <Select
                  value={options.seasonId || 'all'}
                  onValueChange={(value) =>
                    setOptions((previous) => ({
                      ...previous,
                      seasonId: value === 'all' ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger className="bg-neutral-800 border-white/10 text-white">
                    <SelectValue placeholder="All seasons" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-white/10">
                    <SelectItem value="all" className="text-white">
                      All seasons
                    </SelectItem>
                    {seasons.map((season) => (
                      <SelectItem key={season.id} value={season.id} className="text-white">
                        {season.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referee-date-from">From date</Label>
                  <Input
                    id="referee-date-from"
                    type="date"
                    value={options.dateFrom}
                    onChange={(event) =>
                      setOptions((previous) => ({ ...previous, dateFrom: event.target.value }))
                    }
                    className="bg-neutral-800 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referee-date-to">To date</Label>
                  <Input
                    id="referee-date-to"
                    type="date"
                    value={options.dateTo}
                    onChange={(event) =>
                      setOptions((previous) => ({ ...previous, dateTo: event.target.value }))
                    }
                    className="bg-neutral-800 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Assignment strategy</Label>
                  <Select
                    value={options.strategy}
                    onValueChange={(value: 'round_robin' | 'least_assigned' | 'availability_based') =>
                      setOptions((previous) => ({ ...previous, strategy: value }))
                    }
                  >
                    <SelectTrigger className="bg-neutral-800 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-white/10">
                      <SelectItem value="round_robin" className="text-white">
                        Round robin
                      </SelectItem>
                      <SelectItem value="least_assigned" className="text-white">
                        Least assigned first
                      </SelectItem>
                      <SelectItem value="availability_based" className="text-white">
                        Availability first
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Officials per game</Label>
                  <Select
                    value={options.officialsPerGame}
                    onValueChange={(value) =>
                      setOptions((previous) => ({ ...previous, officialsPerGame: value }))
                    }
                  >
                    <SelectTrigger className="bg-neutral-800 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-white/10">
                      <SelectItem value="1" className="text-white">
                        1 official
                      </SelectItem>
                      <SelectItem value="2" className="text-white">
                        2 officials
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="overwrite-existing-referees" className="text-white">
                    Overwrite existing assignments
                  </Label>
                  <p className="text-xs text-neutral-500">
                    Replace any referee assignments that are already on the game.
                  </p>
                </div>
                <Switch
                  id="overwrite-existing-referees"
                  checked={options.overwriteExisting}
                  onCheckedChange={(checked) =>
                    setOptions((previous) => ({ ...previous, overwriteExisting: checked }))
                  }
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-400">
                <Shield className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">How assignments are chosen</p>
                  <p className="text-xs text-yellow-300/80">
                    The scheduler respects weekly availability, max games per week, existing same-night assignments,
                    and whether a staff member can work as a referee or linesman.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="border-white/10 text-neutral-300 hover:bg-neutral-800"
          >
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              type="button"
              onClick={handleAutoAssign}
              disabled={isPending}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Auto-Assign
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
