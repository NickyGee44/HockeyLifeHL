'use client';

import { useState, useTransition, useEffect } from 'react';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { autoAssignScorekepers, type AutoAssignResult } from '@/lib/actions/scorekeeper-management';
import { Loader2, AlertCircle, CheckCircle, Wand2, AlertTriangle } from 'lucide-react';

interface AutoAssignModalProps {
  leagueId: string;
  seasons: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AutoAssignModal({
  leagueId,
  seasons,
  open,
  onOpenChange,
  onSuccess,
}: AutoAssignModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AutoAssignResult | null>(null);

  const [options, setOptions] = useState({
    seasonId: '',
    dateFrom: '',
    dateTo: '',
    strategy: 'round_robin' as 'round_robin' | 'least_assigned' | 'availability_based',
    overwriteExisting: false,
  });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setResult(null);
      setError(null);
    }
  }, [open]);

  const handleAutoAssign = () => {
    setError(null);
    setResult(null);

    startTransition(async () => {
      const assignResult = await autoAssignScorekepers({
        leagueId,
        options: {
          seasonId: options.seasonId || undefined,
          dateFrom: options.dateFrom || undefined,
          dateTo: options.dateTo || undefined,
          strategy: options.strategy,
          overwriteExisting: options.overwriteExisting,
        },
      });

      if (assignResult.success) {
        setResult(assignResult.data);
        if (assignResult.data.gamesAssigned > 0) {
          onSuccess();
        }
      } else {
        setError(assignResult.error);
      }
    });
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-rink-500" />
            Auto-Assign Scorekeepers
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Automatically assign scorekeepers to games using round-robin distribution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className={cn(
              'p-4 rounded-lg border',
              result.gamesAssigned > 0
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-yellow-500/10 border-yellow-500/30'
            )}>
              <div className={cn(
                'flex items-center gap-2 font-medium mb-3',
                result.gamesAssigned > 0 ? 'text-green-500' : 'text-yellow-500'
              )}>
                {result.gamesAssigned > 0 ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                Auto-Assignment Complete
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-neutral-400">Games Processed</p>
                  <p className="text-xl font-bold text-white">{result.gamesProcessed}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-neutral-400">Assigned</p>
                  <p className="text-xl font-bold text-green-500">{result.gamesAssigned}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-neutral-400">Skipped</p>
                  <p className="text-xl font-bold text-yellow-500">{result.gamesSkipped}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-neutral-400">Conflicts</p>
                  <p className="text-xl font-bold text-red-500">{result.conflictsDetected}</p>
                </div>
              </div>

              {result.skipped.length > 0 && (
                <div className="mt-3 text-sm">
                  <p className="text-neutral-400 mb-1">Skipped Reasons:</p>
                  <ul className="text-xs text-neutral-500 space-y-1 max-h-24 overflow-y-auto">
                    {result.skipped.slice(0, 5).map((skip, i) => (
                      <li key={i}>Game: {skip.reason}</li>
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
              {/* Season filter */}
              <div className="space-y-2">
                <Label>Season (optional)</Label>
                <Select
                  value={options.seasonId}
                  onValueChange={(value) => setOptions(prev => ({ ...prev, seasonId: value }))}
                >
                  <SelectTrigger className="bg-neutral-800 border-white/10 text-white">
                    <SelectValue placeholder="All seasons" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-white/10">
                    <SelectItem value="" className="text-white">All seasons</SelectItem>
                    {seasons.map((season) => (
                      <SelectItem key={season.id} value={season.id} className="text-white">
                        {season.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">From Date (optional)</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={options.dateFrom}
                    onChange={(e) => setOptions(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="bg-neutral-800 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo">To Date (optional)</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={options.dateTo}
                    onChange={(e) => setOptions(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="bg-neutral-800 border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Strategy */}
              <div className="space-y-2">
                <Label>Assignment Strategy</Label>
                <Select
                  value={options.strategy}
                  onValueChange={(value: 'round_robin' | 'least_assigned' | 'availability_based') =>
                    setOptions(prev => ({ ...prev, strategy: value }))
                  }
                >
                  <SelectTrigger className="bg-neutral-800 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-white/10">
                    <SelectItem value="round_robin" className="text-white">
                      Round Robin (distribute evenly)
                    </SelectItem>
                    <SelectItem value="least_assigned" className="text-white">
                      Least Assigned First
                    </SelectItem>
                    <SelectItem value="availability_based" className="text-white">
                      Availability Based
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Overwrite existing */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="overwrite" className="text-white">Overwrite Existing</Label>
                  <p className="text-xs text-neutral-500">
                    Replace games that already have scorekeepers assigned
                  </p>
                </div>
                <Switch
                  id="overwrite"
                  checked={options.overwriteExisting}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, overwriteExisting: checked }))}
                />
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Important</p>
                  <p className="text-xs text-yellow-500/80">
                    Auto-assignment will skip games that conflict with a scorekeeper&apos;s existing
                    assignments at the same time. Preferred days and max games per week limits are respected.
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
              className={cn(
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold',
                'hover:shadow-lg hover:shadow-rink-500/20'
              )}
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isPending ? 'Assigning...' : 'Start Auto-Assign'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
