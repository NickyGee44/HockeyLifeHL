'use client';

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { rateGoalie } from '@/lib/actions/goalie-marketplace';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface RateGoaliePromptProps {
  goalieId: string;
  gameId: string;
  onRated?: () => void;
}

export function RateGoaliePrompt({ goalieId, gameId, onRated }: RateGoaliePromptProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stars, setStars] = useState(5);
  const [note, setNote] = useState('');

  const submit = async () => {
    setLoading(true);
    const result = await rateGoalie(goalieId, gameId, { stars, private_note: note });
    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success('Goalie rated');
    setOpen(false);
    onRated?.();
    setLoading(false);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>Rate Goalie</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Rate Sub Goalie</DialogTitle>
            <DialogDescription className="text-neutral-400">This feedback is private to captains/admins.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setStars(s)}>
                  <Star className={`w-6 h-6 ${s <= stars ? 'text-amber-400 fill-current' : 'text-neutral-600'}`} />
                </button>
              ))}
            </div>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Private notes" className="bg-neutral-800 border-white/10" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={submit} disabled={loading} className="bg-gradient-to-r from-rink-500 to-arena-500 text-black">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
