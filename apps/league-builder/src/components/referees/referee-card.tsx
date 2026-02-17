'use client';

import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LeagueReferee } from '@/lib/actions/referee-management';
import { User, Mail, Calendar, Edit, Trash2, MoreVertical, Phone } from 'lucide-react';
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
  onRemove?: () => void;
  onAssignGames?: () => void;
}

export function RefereeCard({
  referee,
  selected,
  onSelect,
  onEdit,
  onRemove,
  onAssignGames,
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
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          {referee.photo_url ? (
            <img src={referee.photo_url} alt={referee.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-blue-500" />
          )}
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
              {onRemove && (
                <DropdownMenuItem
                  onClick={onRemove}
                  className="text-red-500 hover:bg-neutral-800 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
