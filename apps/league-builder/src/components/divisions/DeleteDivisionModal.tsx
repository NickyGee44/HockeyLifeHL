'use client';

/**
 * Delete Division Modal Component
 *
 * Confirmation modal for deleting a division with team reassignment options.
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { Loader2, AlertTriangle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  deleteDivision,
  reassignDivisionTeams,
  getDivisions,
  type DivisionWithTeamCount,
} from '@/lib/actions/divisions';

// ==============================================================================
// TYPES
// ==============================================================================

interface DeleteDivisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  division: DivisionWithTeamCount | null;
  leagueId: string;
  onSuccess?: () => void;
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export function DeleteDivisionModal({
  open,
  onOpenChange,
  division,
  leagueId,
  onSuccess,
}: DeleteDivisionModalProps) {
  const t = useTranslations('divisions.delete');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState<string>('_unassigned');
  const [otherDivisions, setOtherDivisions] = useState<DivisionWithTeamCount[]>([]);
  const [loadingDivisions, setLoadingDivisions] = useState(false);

  const hasTeams = (division?.team_count || 0) > 0;

  // Load other divisions when modal opens
  useEffect(() => {
    if (open && division) {
      setLoadingDivisions(true);
      getDivisions(leagueId).then((result) => {
        if (result.success) {
          setOtherDivisions(result.data.filter((d) => d.id !== division.id));
        }
        setLoadingDivisions(false);
      });
      setReassignTo('_unassigned');
      setError(null);
    }
  }, [open, division, leagueId]);

  const handleDelete = async () => {
    if (!division) return;

    setIsDeleting(true);
    setError(null);

    try {
      // If division has teams and user selected a target division, reassign first
      if (hasTeams && reassignTo !== '_unassigned') {
        const reassignResult = await reassignDivisionTeams(
          division.id,
          reassignTo
        );

        if (!reassignResult.success) {
          setError(reassignResult.error);
          setIsDeleting(false);
          return;
        }
      }

      // Delete the division
      const deleteResult = await deleteDivision(division.id);

      if (!deleteResult.success) {
        setError(deleteResult.error);
        setIsDeleting(false);
        return;
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(t('unexpectedError'));
      setIsDeleting(false);
    }
  };

  if (!division) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-neutral-900 border-white/10">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-red-500/10">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <DialogTitle className="text-white">{t('title')}</DialogTitle>
          </div>
          <DialogDescription>
            {t.rich('confirmation', {
              name: division.name,
              bold: (chunks) => <strong className="text-white">{chunks}</strong>,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Team Warning */}
          {hasTeams && (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-200 font-medium">
                    {t('hasTeams', { count: division.team_count })}
                  </p>
                  <p className="text-xs text-yellow-200/70 mt-1">
                    {t('teamWarning')}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm text-neutral-300 block mb-2">
                  {t('reassignTo')}
                </label>
                <Select
                  value={reassignTo}
                  onValueChange={setReassignTo}
                  disabled={loadingDivisions}
                >
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                    <SelectValue placeholder={t('selectDestination')} />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    <SelectItem value="_unassigned">
                      {t('leaveUnassigned')}
                    </SelectItem>
                    {otherDivisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                        {d.max_teams && (
                          <span className="text-neutral-500 ml-2">
                            ({d.team_count}/{d.max_teams})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* No teams info */}
          {!hasTeams && (
            <div className="p-4 rounded-lg bg-neutral-800/50 text-neutral-400 text-sm">
              {t('noTeams')}
            </div>
          )}

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
            disabled={isDeleting}
            className="text-neutral-400 hover:text-white"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              'bg-red-600 hover:bg-red-700 text-white font-semibold',
              'transition-colors'
            )}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('deleting')}
              </>
            ) : (
              t('confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
