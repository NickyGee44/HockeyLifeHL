'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  updateRefereeCompensation,
  type LeagueReferee,
} from '@/lib/actions/referee-management';
import { Loader2 } from 'lucide-react';

interface EditRefereeCompensationModalProps {
  leagueId: string;
  referee: LeagueReferee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function centsToInput(cents: number | null | undefined) {
  return ((cents || 0) / 100).toFixed(2);
}

function inputToCents(value: string) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 100));
}

export function EditRefereeCompensationModal({
  leagueId,
  referee,
  open,
  onOpenChange,
  onSuccess,
}: EditRefereeCompensationModalProps) {
  const [isPending, startTransition] = useTransition();
  const [refereeIdentifier, setRefereeIdentifier] = useState('');
  const [defaultJerseyNumber, setDefaultJerseyNumber] = useState('');
  const [gameFee, setGameFee] = useState('0.00');
  const [soloFee, setSoloFee] = useState('0.00');
  const [pairedFee, setPairedFee] = useState('0.00');
  const [linesmanFee, setLinesmanFee] = useState('0.00');
  const [singleGameFee, setSingleGameFee] = useState('0.00');

  useEffect(() => {
    setRefereeIdentifier(referee?.referee_identifier || '');
    setDefaultJerseyNumber(referee?.default_jersey_number || '');
    setGameFee(centsToInput(referee?.game_fee_cents));
    setSoloFee(centsToInput(referee?.solo_game_fee_cents));
    setPairedFee(centsToInput(referee?.paired_game_fee_cents));
    setLinesmanFee(centsToInput(referee?.linesman_fee_cents));
    setSingleGameFee(centsToInput(referee?.single_game_fee_cents));
  }, [referee]);

  const handleSave = () => {
    if (!referee?.league_referee_id) {
      toast.error('This referee does not have a structured scheduling record yet.');
      return;
    }

    startTransition(async () => {
      const result = await updateRefereeCompensation({
        leagueId,
        leagueRefereeId: referee.league_referee_id!,
        refereeIdentifier,
        defaultJerseyNumber,
        gameFeeCents: inputToCents(gameFee),
        soloGameFeeCents: inputToCents(soloFee),
        pairedGameFeeCents: inputToCents(pairedFee),
        linesmanFeeCents: inputToCents(linesmanFee),
        singleGameFeeCents: inputToCents(singleGameFee),
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to save compensation.');
        return;
      }

      toast.success('Referee compensation updated.');
      onSuccess();
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Referee Pay Rules</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Set how this referee should be paid for standard, solo, paired, linesman, and single-game nights.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="referee-identifier">Referee ID</Label>
            <Input
              id="referee-identifier"
              value={refereeIdentifier}
              onChange={(event) => setRefereeIdentifier(event.target.value)}
              className="bg-neutral-800 border-white/10 text-white"
              placeholder="BMHL-REF-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default-jersey">Default Jersey #</Label>
            <Input
              id="default-jersey"
              value={defaultJerseyNumber}
              onChange={(event) => setDefaultJerseyNumber(event.target.value)}
              className="bg-neutral-800 border-white/10 text-white"
              placeholder="17"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="game-fee">Standard Game Fee (CAD)</Label>
            <Input
              id="game-fee"
              value={gameFee}
              onChange={(event) => setGameFee(event.target.value)}
              className="bg-neutral-800 border-white/10 text-white"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="solo-fee">Solo Game Fee (CAD)</Label>
            <Input
              id="solo-fee"
              value={soloFee}
              onChange={(event) => setSoloFee(event.target.value)}
              className="bg-neutral-800 border-white/10 text-white"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paired-fee">Paired Ref Fee (CAD)</Label>
            <Input
              id="paired-fee"
              value={pairedFee}
              onChange={(event) => setPairedFee(event.target.value)}
              className="bg-neutral-800 border-white/10 text-white"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linesman-fee">Linesman Fee (CAD)</Label>
            <Input
              id="linesman-fee"
              value={linesmanFee}
              onChange={(event) => setLinesmanFee(event.target.value)}
              className="bg-neutral-800 border-white/10 text-white"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="single-game-fee">Single Game Night Fee (CAD)</Label>
            <Input
              id="single-game-fee"
              value={singleGameFee}
              onChange={(event) => setSingleGameFee(event.target.value)}
              className="bg-neutral-800 border-white/10 text-white"
              inputMode="decimal"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/10 text-neutral-300"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Pay Rules
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
