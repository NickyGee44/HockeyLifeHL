'use client';

import { useState } from 'react';
import { PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createGoalieRequest } from '@/lib/actions/goalie-marketplace';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GoalieRequestForm, type GoalieRequestFormValue } from './GoalieRequestForm';

interface RequestGoalieButtonProps {
  gameId: string;
  teamId: string;
  onCreated?: () => void;
}

export function RequestGoalieButton({ gameId, teamId, onCreated }: RequestGoalieButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<GoalieRequestFormValue>({
    skill_level_needed: 'intermediate',
    compensation: '',
    notes: '',
  });

  const submit = async () => {
    setLoading(true);
    const result = await createGoalieRequest(gameId, teamId, {
      skill_level_needed: value.skill_level_needed,
      compensation: value.compensation,
      notes: value.notes,
    });

    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success('Goalie request created and notifications sent');
    setOpen(false);
    onCreated?.();
    setLoading(false);
  };

  return (
    <>
      <Button className="bg-gradient-to-r from-rink-500 to-arena-500 text-black" onClick={() => setOpen(true)}>
        <PlusCircle className="w-4 h-4 mr-2" /> Request Goalie
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Create Goalie Request</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Captains can broadcast a request to all active sub goalies.
            </DialogDescription>
          </DialogHeader>

          <GoalieRequestForm onChange={setValue} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={submit} disabled={loading} className="bg-gradient-to-r from-rink-500 to-arena-500 text-black">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
