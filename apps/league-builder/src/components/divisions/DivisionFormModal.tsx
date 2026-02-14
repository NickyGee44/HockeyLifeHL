'use client';

/**
 * Division Form Modal Component
 *
 * Modal for creating or editing a division.
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createDivision,
  updateDivision,
  type DivisionWithTeamCount,
} from '@/lib/actions/divisions';

// ==============================================================================
// TYPES
// ==============================================================================

interface DivisionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leagueId: string;
  division?: DivisionWithTeamCount | null;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  description: string;
  skillLevel: string;
  maxTeams: string;
  gameDurationMinutes: string;
  periodCount: string;
}

const SKILL_LEVEL_KEYS: Array<{ value: string; labelKey: string }> = [
  { value: '', labelKey: 'noSkillLevel' },
  { value: 'A', labelKey: 'skillA' },
  { value: 'B', labelKey: 'skillB' },
  { value: 'C', labelKey: 'skillC' },
  { value: 'Beginner', labelKey: 'beginner' },
  { value: 'Intermediate', labelKey: 'intermediate' },
  { value: 'Advanced', labelKey: 'advanced' },
  { value: 'Recreational', labelKey: 'recreational' },
  { value: 'Competitive', labelKey: 'competitive' },
];

const PERIOD_VALUES = ['2', '3', '4'];

// ==============================================================================
// COMPONENT
// ==============================================================================

export function DivisionFormModal({
  open,
  onOpenChange,
  leagueId,
  division,
  onSuccess,
}: DivisionFormModalProps) {
  const t = useTranslations('divisions.form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    skillLevel: '',
    maxTeams: '',
    gameDurationMinutes: '60',
    periodCount: '3',
  });

  const isEditing = !!division;

  // Reset form when modal opens/closes or division changes
  useEffect(() => {
    if (open) {
      if (division) {
        setFormData({
          name: division.name,
          description: division.description || '',
          skillLevel: division.skill_level || '',
          maxTeams: division.max_teams?.toString() || '',
          gameDurationMinutes: division.game_duration_minutes.toString(),
          periodCount: division.period_count.toString(),
        });
      } else {
        setFormData({
          name: '',
          description: '',
          skillLevel: '',
          maxTeams: '',
          gameDurationMinutes: '60',
          periodCount: '3',
        });
      }
      setError(null);
    }
  }, [open, division]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && division) {
        // Update existing division
        const result = await updateDivision({
          divisionId: division.id,
          name: formData.name,
          description: formData.description || null,
          skillLevel: formData.skillLevel || null,
          maxTeams: formData.maxTeams ? parseInt(formData.maxTeams) : null,
          gameDurationMinutes: parseInt(formData.gameDurationMinutes),
          periodCount: parseInt(formData.periodCount),
        });

        if (!result.success) {
          setError(result.error);
          return;
        }
      } else {
        // Create new division
        const result = await createDivision({
          leagueId,
          name: formData.name,
          description: formData.description || undefined,
          skillLevel: formData.skillLevel || undefined,
          maxTeams: formData.maxTeams ? parseInt(formData.maxTeams) : undefined,
          gameDurationMinutes: parseInt(formData.gameDurationMinutes),
          periodCount: parseInt(formData.periodCount),
        });

        if (!result.success) {
          setError(result.error);
          return;
        }
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-neutral-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? t('editTitle') : t('createTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('editDescription')
              : t('createDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-neutral-300">
                {t('divisionName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('divisionNamePlaceholder')}
                required
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-neutral-300">
                {t('descriptionLabel')}
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>

            {/* Skill Level */}
            <div className="space-y-2">
              <Label htmlFor="skillLevel" className="text-neutral-300">
                {t('skillLevel')}
              </Label>
              <Select
                value={formData.skillLevel || '_none'}
                onValueChange={(value) => setFormData({ ...formData, skillLevel: value === '_none' ? '' : value })}
              >
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                  <SelectValue placeholder={t('skillLevelPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  {SKILL_LEVEL_KEYS.map((level) => (
                    <SelectItem key={level.value || '_none'} value={level.value || '_none'}>
                      {t(level.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Max Teams */}
            <div className="space-y-2">
              <Label htmlFor="maxTeams" className="text-neutral-300">
                {t('maxTeams')}
              </Label>
              <Input
                id="maxTeams"
                type="number"
                min="1"
                value={formData.maxTeams}
                onChange={(e) => setFormData({ ...formData, maxTeams: e.target.value })}
                placeholder={t('maxTeamsPlaceholder')}
                className="bg-neutral-800 border-neutral-700 text-white"
              />
              <p className="text-xs text-neutral-500">
                {t('maxTeamsHelp')}
              </p>
            </div>

            {/* Game Settings Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Game Duration */}
              <div className="space-y-2">
                <Label htmlFor="gameDuration" className="text-neutral-300">
                  {t('gameDuration')}
                </Label>
                <div className="relative">
                  <Input
                    id="gameDuration"
                    type="number"
                    min="15"
                    max="180"
                    value={formData.gameDurationMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, gameDurationMinutes: e.target.value })
                    }
                    className="bg-neutral-800 border-neutral-700 text-white pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
                    {t('durationUnit')}
                  </span>
                </div>
              </div>

              {/* Period Count */}
              <div className="space-y-2">
                <Label htmlFor="periodCount" className="text-neutral-300">
                  {t('periods')}
                </Label>
                <Select
                  value={formData.periodCount}
                  onValueChange={(value) => setFormData({ ...formData, periodCount: value })}
                >
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    {PERIOD_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t('periodCount', { count: parseInt(value) })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-neutral-400 hover:text-white"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className={cn(
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? t('updating') : t('creating')}
                </>
              ) : isEditing ? (
                t('update')
              ) : (
                t('create')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
