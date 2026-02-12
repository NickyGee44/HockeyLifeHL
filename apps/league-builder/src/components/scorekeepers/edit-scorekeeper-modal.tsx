'use client';

import { useState, useTransition, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { updateScorekeeper, type LeagueScorekeeper } from '@/lib/actions/scorekeeper-management';
import { Loader2, AlertCircle } from 'lucide-react';

interface EditScorekeeperModalProps {
  scorekeeper: LeagueScorekeeper;
  leagueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updated: LeagueScorekeeper) => void;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export function EditScorekeeperModal({
  scorekeeper,
  leagueId,
  open,
  onOpenChange,
  onSuccess,
}: EditScorekeeperModalProps) {
  const t = useTranslations('scorekeepers.editModal');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    displayName: scorekeeper.display_name || scorekeeper.profile?.full_name || '',
    hourlyRate: scorekeeper.hourly_rate?.toString() || '',
    notes: scorekeeper.notes || '',
    isActive: scorekeeper.status === 'active',
    maxGamesPerWeek: scorekeeper.max_games_per_week?.toString() || '',
    preferredDays: scorekeeper.preferred_days || [],
  });

  useEffect(() => {
    setFormData({
      displayName: scorekeeper.display_name || scorekeeper.profile?.full_name || '',
      hourlyRate: scorekeeper.hourly_rate?.toString() || '',
      notes: scorekeeper.notes || '',
      isActive: scorekeeper.status === 'active',
      maxGamesPerWeek: scorekeeper.max_games_per_week?.toString() || '',
      preferredDays: scorekeeper.preferred_days || [],
    });
  }, [scorekeeper]);

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter(d => d !== day)
        : [...prev.preferredDays, day].sort(),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateScorekeeper({
        id: scorekeeper.id,
        leagueId,
        displayName: formData.displayName || undefined,
        status: formData.isActive ? 'active' : 'inactive',
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        notes: formData.notes || null,
        maxGamesPerWeek: formData.maxGamesPerWeek ? parseInt(formData.maxGamesPerWeek) : null,
        preferredDays: formData.preferredDays.length > 0 ? formData.preferredDays : null,
      });

      if (result.success) {
        onSuccess(result.data);
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className="text-neutral-400">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">{t('displayName')}</Label>
            <Input
              id="displayName"
              placeholder="John Smith"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              className="bg-neutral-800 border-white/10 text-white placeholder:text-neutral-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">{t('activeStatus')}</Label>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourlyRate">{t('hourlyRate')}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
              <Input
                id="hourlyRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="25.00"
                value={formData.hourlyRate}
                onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                className="pl-7 bg-neutral-800 border-white/10 text-white placeholder:text-neutral-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxGamesPerWeek">{t('maxGamesPerWeek')}</Label>
            <Input
              id="maxGamesPerWeek"
              type="number"
              min="1"
              placeholder={t('noLimit')}
              value={formData.maxGamesPerWeek}
              onChange={(e) => setFormData(prev => ({ ...prev, maxGamesPerWeek: e.target.value }))}
              className="bg-neutral-800 border-white/10 text-white placeholder:text-neutral-500"
            />
            <p className="text-xs text-neutral-500">{t('leaveEmptyNoLimit')}</p>
          </div>

          <div className="space-y-2">
            <Label>{t('preferredDays')}</Label>
            <div className="flex flex-wrap gap-2">
              {DAY_KEYS.map((dayKey, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDayToggle(index)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    formData.preferredDays.includes(index)
                      ? 'bg-rink-500 text-black'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  )}
                >
                  {t(dayKey)}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500">
              {t('selectDaysPreference')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('notes')}</Label>
            <Textarea
              id="notes"
              placeholder={t('notesPlaceholder')}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="bg-neutral-800 border-white/10 text-white placeholder:text-neutral-500 resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10 text-neutral-300 hover:bg-neutral-800"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className={cn(
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold',
                'hover:shadow-lg hover:shadow-rink-500/20'
              )}
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('saveChanges')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
