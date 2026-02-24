'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { addGoalieToPool, type GoalieSkillLevel } from '@/lib/actions/goalie-marketplace';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddGoalieModalProps {
  leagueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export function AddGoalieModal({ leagueId, open, onOpenChange, onAdded }: AddGoalieModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [skill, setSkill] = useState<GoalieSkillLevel>('intermediate');
  const [rate, setRate] = useState('0');

  const reset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setSkill('intermediate');
    setRate('0');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await addGoalieToPool(leagueId, {
      name,
      email,
      phone: phone || undefined,
      skill_level: skill,
      rate_per_game: Number(rate || '0'),
      has_full_gear: true,
      registered_via: 'manual',
    });

    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success('Goalie added to pool');
    reset();
    onAdded();
    onOpenChange(false);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-rink-500" /> Add Goalie
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Add a goalie manually to the league-wide sub pool.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="goalie-name">Name</Label>
            <Input id="goalie-name" value={name} onChange={(e) => setName(e.target.value)} required className="bg-neutral-800 border-white/10" />
          </div>
          <div>
            <Label htmlFor="goalie-email">Email</Label>
            <Input id="goalie-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-neutral-800 border-white/10" />
          </div>
          <div>
            <Label htmlFor="goalie-phone">Phone</Label>
            <Input id="goalie-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-neutral-800 border-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Skill</Label>
              <Select value={skill} onValueChange={(value) => setSkill(value as GoalieSkillLevel)}>
                <SelectTrigger className="bg-neutral-800 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="goalie-rate">Rate/Game</Label>
              <Input id="goalie-rate" type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} className="bg-neutral-800 border-white/10" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-rink-500 to-arena-500 text-black">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
