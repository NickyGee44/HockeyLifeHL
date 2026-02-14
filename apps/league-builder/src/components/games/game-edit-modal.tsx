'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { Game } from '@/lib/actions/games';
import { updateGame, rescheduleGame } from '@/lib/actions/games';
import { format } from 'date-fns';
import { Calendar, MapPin, Edit, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GameEditModalProps {
  game: Game;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (game: Game) => void;
}

export function GameEditModal({
  game,
  open,
  onOpenChange,
  onSuccess,
}: GameEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(
    format(new Date(game.scheduled_at), "yyyy-MM-dd'T'HH:mm")
  );
  const [location, setLocation] = useState(game.location || '');
  const [homeScore, setHomeScore] = useState(game.home_score.toString());
  const [awayScore, setAwayScore] = useState(game.away_score.toString());

  const isScheduledDateChanged =
    format(new Date(game.scheduled_at), "yyyy-MM-dd'T'HH:mm") !== scheduledAt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If date changed, use reschedule action
      if (isScheduledDateChanged) {
        const result = await rescheduleGame(
          game.id,
          new Date(scheduledAt).toISOString(),
          location || undefined
        );

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        // If scores also changed, update them separately
        if (
          parseInt(homeScore) !== game.home_score ||
          parseInt(awayScore) !== game.away_score
        ) {
          const scoreResult = await updateGame(game.id, {
            home_score: parseInt(homeScore),
            away_score: parseInt(awayScore),
          });

          if (!scoreResult.success) {
            toast.error('Game rescheduled but score update failed');
            onSuccess?.(result.data);
            onOpenChange(false);
            return;
          }
        }

        toast.success('Game rescheduled successfully');
        onSuccess?.(result.data);
      } else {
        // Regular update
        const result = await updateGame(game.id, {
          location: location || undefined,
          home_score: parseInt(homeScore),
          away_score: parseInt(awayScore),
        });

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        toast.success('Game updated successfully');
        onSuccess?.(result.data);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating game:', error);
      toast.error('Failed to update game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-800 border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Edit className="w-5 h-5 text-rink-500" />
            Edit Game
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Update game details, schedule, or scores.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Teams Display */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-900/50 border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg"
                style={{ backgroundColor: game.home_team?.primary_color || '#22D3EE' }}
              />
              <span className="font-medium text-white text-sm">
                {game.home_team?.name}
              </span>
            </div>
            <span className="text-neutral-500 font-medium">vs</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-sm">
                {game.away_team?.name}
              </span>
              <div
                className="w-8 h-8 rounded-lg"
                style={{ backgroundColor: game.away_team?.primary_color || '#3B82F6' }}
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label htmlFor="scheduledAt" className="flex items-center gap-2 text-neutral-300">
              <Calendar className="w-4 h-4 text-rink-500" />
              Date & Time
            </Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="bg-neutral-900 border-white/10 text-white focus:ring-rink-500 focus:border-rink-500"
            />
            {isScheduledDateChanged && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <p className="text-xs text-orange-400">
                  Changing the date will mark this game as rescheduled
                </p>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2 text-neutral-300">
              <MapPin className="w-4 h-4 text-rink-500" />
              Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Arena name or address"
              className="bg-neutral-900 border-white/10 text-white focus:ring-rink-500 focus:border-rink-500"
            />
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="homeScore" className="text-neutral-300">
                {game.home_team?.short_name || 'Home'} Score
              </Label>
              <Input
                id="homeScore"
                type="number"
                min="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="bg-neutral-900 border-white/10 text-white text-center text-xl font-bold focus:ring-rink-500 focus:border-rink-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="awayScore" className="text-neutral-300">
                {game.away_team?.short_name || 'Away'} Score
              </Label>
              <Input
                id="awayScore"
                type="number"
                min="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="bg-neutral-900 border-white/10 text-white text-center text-xl font-bold focus:ring-rink-500 focus:border-rink-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-neutral-600 text-neutral-300 hover:bg-neutral-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isScheduledDateChanged ? 'Reschedule & Save' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
