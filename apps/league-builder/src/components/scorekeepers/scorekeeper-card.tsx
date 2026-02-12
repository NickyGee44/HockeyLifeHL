'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LeagueScorekeeper } from '@/lib/actions/scorekeeper-management';
import { User, Mail, Calendar, Edit, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ScorekeeperCardProps {
  scorekeeper: LeagueScorekeeper;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onAssignGames?: () => void;
}

export function ScorekeeperCard({
  scorekeeper,
  selected,
  onSelect,
  onEdit,
  onRemove,
  onAssignGames,
}: ScorekeeperCardProps) {
  const t = useTranslations('scorekeepers.card');
  const displayName = scorekeeper.display_name || scorekeeper.profile?.full_name || 'Unknown';
  const email = scorekeeper.email || scorekeeper.profile?.email || '';

  return (
    <div
      className={cn(
        'bg-white/[0.04] border rounded-xl p-4 transition-all',
        selected ? 'border-rink-500' : 'border-white/10 hover:border-white/20'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-rink-500/30 bg-neutral-800 text-rink-500 focus:ring-rink-500 focus:ring-offset-neutral-900"
          />
        )}

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-rink-500/20 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-rink-500" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{displayName}</h3>
            <Badge
              variant={scorekeeper.status === 'active' ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                scorekeeper.status === 'active'
                  ? 'bg-green-500/10 text-green-500 border-green-500/30'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              )}
            >
              {scorekeeper.status}
            </Badge>
          </div>

          <div className="flex items-center gap-1 text-sm text-neutral-400 mb-2">
            <Mail className="w-3 h-3" />
            <span className="truncate">{email}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {t('assigned', { count: scorekeeper.total_assignments || 0 })}
            </span>
            <span>
              {t('completed', { count: scorekeeper.completed_assignments || 0 })}
            </span>
            {scorekeeper.hourly_rate && (
              <span className="text-rink-500">
                ${scorekeeper.hourly_rate}/hr
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-400 hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-neutral-900 border-white/10">
            {onAssignGames && (
              <DropdownMenuItem
                onClick={onAssignGames}
                className="text-white hover:bg-neutral-800 cursor-pointer"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {t('assignToGames')}
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem
                onClick={onEdit}
                className="text-white hover:bg-neutral-800 cursor-pointer"
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('edit')}
              </DropdownMenuItem>
            )}
            {onRemove && (
              <DropdownMenuItem
                onClick={onRemove}
                className="text-red-500 hover:bg-neutral-800 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('remove')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
