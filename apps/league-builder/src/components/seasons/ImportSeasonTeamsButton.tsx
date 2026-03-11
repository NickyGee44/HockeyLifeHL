'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { importSeasonTeamsFromPreviousSeason } from '@/lib/actions/seasons';

interface ImportSeasonTeamsButtonProps {
  leagueId: string;
  seasonId: string;
  sourceSeasonId: string;
  sourceSeasonName: string;
  teams: Array<{
    id: string;
    name: string;
    short_name: string | null;
  }>;
}

export function ImportSeasonTeamsButton({
  leagueId,
  seasonId,
  sourceSeasonId,
  sourceSeasonName,
  teams,
}: ImportSeasonTeamsButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(teams.map((team) => team.id));
  const [isPending, startTransition] = useTransition();

  const selectedCount = selectedIds.length;
  const hasTeams = teams.length > 0;

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams]
  );

  const toggleTeam = (teamId: string) => {
    setSelectedIds((current) =>
      current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : [...current, teamId]
    );
  };

  const handleImport = () => {
    if (!hasTeams || selectedCount === 0) {
      toast.error('Select at least one team to import.');
      return;
    }

    startTransition(async () => {
      const result = await importSeasonTeamsFromPreviousSeason({
        leagueId,
        seasonId,
        sourceSeasonId,
        teamIds: selectedIds,
      });

      if ('error' in result) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Imported ${result.data?.importedCount ?? 0} team${result.data?.importedCount === 1 ? '' : 's'} from ${sourceSeasonName}.`
      );
      setOpen(false);
      router.refresh();
    });
  };

  if (!hasTeams) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
      >
        <Download className="w-4 h-4" />
        Import Teams
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Import teams from {sourceSeasonName}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Bring selected teams into this season without carrying players. Players still register and pay their fees each season.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">
                {selectedCount} of {teams.length} selected
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedIds(sortedTeams.map((team) => team.id))}
                  className="text-blue-300 hover:text-blue-200 transition-colors"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-3">
              {sortedTeams.map((team) => {
                const checked = selectedIds.includes(team.id);

                return (
                  <label
                    key={team.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2.5 hover:border-white/10"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white">{team.name}</p>
                      {team.short_name && (
                        <p className="text-xs text-neutral-500">{team.short_name}</p>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTeam(team.id)}
                      className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-rink-500 focus:ring-rink-500"
                    />
                  </label>
                );
              })}
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
              This imports team participation only. Rosters, payments, and player registrations are not copied into the new season.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-white/10 text-neutral-300 hover:bg-neutral-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={isPending || selectedCount === 0}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : (
                'Import selected teams'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
