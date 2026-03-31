'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Download, Loader2, UserRound, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getPreviousSeasonPlayersForImport,
  getPreviousSeasonsForPlayerImport,
  importSeasonPlayersFromPreviousSeason,
  type PreviousSeasonPlayerImportCandidate,
} from '@/lib/actions/player-import';

interface SeasonOption {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
}

interface ImportPreviousSeasonPlayersButtonProps {
  leagueId: string;
  seasonId: string;
}

export function ImportPreviousSeasonPlayersButton({
  leagueId,
  seasonId,
}: ImportPreviousSeasonPlayersButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [players, setPlayers] = useState<PreviousSeasonPlayerImportCandidate[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadSeasons = async () => {
      setLoadingSeasons(true);
      setError(null);

      const result = await getPreviousSeasonsForPlayerImport(leagueId, seasonId);

      if (cancelled) {
        return;
      }

      if (!result.success) {
        setError(result.error);
        setSeasons([]);
        setSelectedSeasonId('');
        setLoadingSeasons(false);
        return;
      }

      const options = result.data.seasons;
      setSeasons(options);
      setSelectedSeasonId((current) => current || options[0]?.id || '');
      setLoadingSeasons(false);
    };

    void loadSeasons();

    return () => {
      cancelled = true;
    };
  }, [leagueId, open, seasonId]);

  useEffect(() => {
    if (!open || !selectedSeasonId) {
      return;
    }

    let cancelled = false;

    const loadPlayers = async () => {
      setLoadingPlayers(true);
      setError(null);

      const result = await getPreviousSeasonPlayersForImport({
        leagueId,
        seasonId,
        sourceSeasonId: selectedSeasonId,
      });

      if (cancelled) {
        return;
      }

      if (!result.success) {
        setError(result.error);
        setPlayers([]);
        setSelectedPlayerIds([]);
        setLoadingPlayers(false);
        return;
      }

      setPlayers(result.data.players);
      setSelectedPlayerIds(result.data.players.map((player) => player.playerId));
      setLoadingPlayers(false);
    };

    void loadPlayers();

    return () => {
      cancelled = true;
    };
  }, [leagueId, open, seasonId, selectedSeasonId]);

  const selectedCount = selectedPlayerIds.length;
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [players]
  );

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId]
    );
  };

  const handleImport = () => {
    if (selectedPlayerIds.length === 0) {
      toast.error('Select at least one player to import.');
      return;
    }

    startTransition(async () => {
      const result = await importSeasonPlayersFromPreviousSeason({
        leagueId,
        seasonId,
        sourceSeasonId: selectedSeasonId,
        playerIds: selectedPlayerIds,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Imported ${result.data.imported} player${result.data.imported === 1 ? '' : 's'} from ${result.data.sourceSeasonName}.`
      );

      if (result.data.skipped > 0) {
        toast.warning(`${result.data.skipped} player${result.data.skipped === 1 ? ' was' : 's were'} already in this season.`);
      }

      if (result.data.errors.length > 0) {
        toast.error(result.data.errors[0]);
      }

      setOpen(false);
      router.refresh();
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setError(null);
      setPlayers([]);
      setSelectedPlayerIds([]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-blue-200 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
      >
        <Download className="w-4 h-4" />
        Import Previous Season
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import players from a previous season</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Bring approved players into this season so you can manage them without waiting for new registrations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {loadingSeasons ? (
              <div className="flex items-center justify-center py-10 text-neutral-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading previous seasons…
              </div>
            ) : seasons.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-neutral-600" />
                <p className="font-medium text-white">No previous seasons available</p>
                <p className="mt-1 text-sm text-neutral-500">
                  Once this league has prior seasons, you can import their players here.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300">Source season</label>
                  <select
                    value={selectedSeasonId}
                    onChange={(event) => setSelectedSeasonId(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white focus:border-rink-500 focus:outline-none"
                  >
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name}
                      </option>
                    ))}
                  </select>
                </div>

                {loadingPlayers ? (
                  <div className="flex items-center justify-center py-10 text-neutral-400">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading players from the selected season…
                  </div>
                ) : players.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                    <UserRound className="mx-auto mb-3 h-8 w-8 text-neutral-600" />
                    <p className="font-medium text-white">No importable players found</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      Everyone from this season is already in the current season, or the source season has no approved players.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-neutral-400">
                      Players available from {seasons.find((season) => season.id === selectedSeasonId)?.name || 'the selected season'}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-400">
                        {selectedCount} of {players.length} selected
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedPlayerIds(sortedPlayers.map((player) => player.playerId))}
                          className="text-blue-300 transition-colors hover:text-blue-200"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPlayerIds([])}
                          className="text-neutral-400 transition-colors hover:text-white"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      {sortedPlayers.map((player) => {
                        const checked = selectedPlayerIds.includes(player.playerId);
                        const meta = [player.teamName, player.position, player.jerseyNumber ? `#${player.jerseyNumber}` : null]
                          .filter(Boolean)
                          .join(' • ');

                        return (
                          <label
                            key={player.playerId}
                            className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2.5 hover:border-white/10"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-white">{player.fullName}</p>
                              <p className="text-xs text-neutral-500">
                                {meta || 'Will import as unassigned'}
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePlayer(player.playerId)}
                              className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-rink-500 focus:ring-rink-500"
                            />
                          </label>
                        );
                      })}
                    </div>

                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                      Imported players are added as approved registrations for this season. If the same team is active this season, the player keeps that team assignment; otherwise they come in as unassigned.
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="border-white/10 text-neutral-300 hover:bg-neutral-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={isPending || players.length === 0 || selectedCount === 0}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : (
                `Import ${selectedCount} player${selectedCount === 1 ? '' : 's'}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
