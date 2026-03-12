'use client';

import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LeagueReferee } from '@/lib/actions/referee-management';
import { Mail, Calendar, Edit, Trash2, MoreVertical, Phone, Wallet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RefereeCardProps {
  referee: LeagueReferee;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onEdit?: () => void;
  onEditCompensation?: () => void;
  onRemove?: () => void;
  onAssignGames?: () => void;
  onRequestAvailability?: () => void;
}

export function RefereeCard({
  referee,
  selected,
  onSelect,
  onEdit,
  onEditCompensation,
  onRemove,
  onAssignGames,
  onRequestAvailability,
}: RefereeCardProps) {
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
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
          <img src={referee.photo_url || '/blank_player.png'} alt={referee.name} className="w-10 h-10 rounded-full object-cover" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{referee.name}</h3>
            <Badge
              variant={referee.is_active ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                referee.is_active
                  ? 'bg-green-500/10 text-green-500 border-green-500/30'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              )}
            >
              {referee.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {referee.email && (
            <div className="flex items-center gap-1 text-sm text-neutral-400 mb-1">
              <Mail className="w-3 h-3" />
              <span className="truncate">{referee.email}</span>
            </div>
          )}

          {referee.phone && (
            <div className="flex items-center gap-1 text-sm text-neutral-400 mb-1">
              <Phone className="w-3 h-3" />
              <span>{referee.phone}</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {referee.total_assignments} game{referee.total_assignments !== 1 ? 's' : ''} assigned
            </span>
            <span className={referee.availability_window_count > 0 ? 'text-green-400' : 'text-amber-400'}>
              {referee.availability_window_count > 0
                ? `${referee.availability_window_count} availability slot${referee.availability_window_count === 1 ? '' : 's'}`
                : 'No availability submitted'}
            </span>
            <span>
              {referee.can_referee && referee.can_linesman
                ? 'Referee + linesman'
                : referee.can_linesman
                  ? 'Linesman only'
                  : referee.can_referee
                    ? 'Referee only'
                    : 'No officiating role enabled'}
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-400">
            Base {formatCurrency(referee.game_fee_cents)} · Solo {formatCurrency(referee.solo_game_fee_cents)} · Paired {formatCurrency(referee.paired_game_fee_cents)} · Linesman {formatCurrency(referee.linesman_fee_cents)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onAssignGames && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAssignGames}
              className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10 text-xs"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Assign Games
            </Button>
          )}
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
              {onEdit && (
                <DropdownMenuItem
                  onClick={onEdit}
                  className="text-white hover:bg-neutral-800 cursor-pointer"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onEditCompensation && (
                <DropdownMenuItem
                  onClick={onEditCompensation}
                  className="text-white hover:bg-neutral-800 cursor-pointer"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Edit Pay Rules
                </DropdownMenuItem>
              )}
              {onRemove && (
                <DropdownMenuItem
                  onClick={onRemove}
                  className="text-red-500 hover:bg-neutral-800 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              )}
              {onRequestAvailability && (
                <DropdownMenuItem
                  onClick={onRequestAvailability}
                  className="text-white hover:bg-neutral-800 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Request availability
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}
