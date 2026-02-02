'use client';

import { useState } from 'react';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GameStatus, GameFilters } from '@/lib/actions/games';
import { Filter, X, Calendar, Users, Trophy } from 'lucide-react';
import { format } from 'date-fns';

interface GameFiltersProps {
  filters: GameFilters;
  onFiltersChange: (filters: GameFilters) => void;
  teams: Array<{ id: string; name: string; short_name: string | null }>;
  seasons: Array<{ id: string; name: string }>;
  className?: string;
}

const statusOptions: Array<{ value: GameStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'postponed', label: 'Postponed' },
];

export function GameFilters({
  filters,
  onFiltersChange,
  teams,
  seasons,
  className,
}: GameFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = [
    filters.status && filters.status !== 'all',
    filters.teamId,
    filters.seasonId,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'gap-2 border-gold-500/20 text-neutral-300 hover:bg-neutral-800',
            activeFilterCount > 0 && 'border-gold-500/40'
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-gold-500 text-black text-xs font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {isExpanded && (
        <div className="p-4 rounded-xl bg-neutral-900 border border-gold-500/20 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-neutral-400 text-xs">
              Status
            </Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  status: value === 'all' ? undefined : (value as GameStatus),
                })
              }
            >
              <SelectTrigger className="bg-neutral-800 border-gold-500/20 text-white">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-gold-500/20">
                {statusOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-white hover:bg-gold-500/10 focus:bg-gold-500/10"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Team Filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-neutral-400 text-xs">
              <Users className="w-3.5 h-3.5" />
              Team
            </Label>
            <Select
              value={filters.teamId || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  teamId: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-neutral-800 border-gold-500/20 text-white">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-gold-500/20 max-h-[300px]">
                <SelectItem value="all" className="text-white hover:bg-gold-500/10 focus:bg-gold-500/10">
                  All Teams
                </SelectItem>
                {teams.map((team) => (
                  <SelectItem
                    key={team.id}
                    value={team.id}
                    className="text-white hover:bg-gold-500/10 focus:bg-gold-500/10"
                  >
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Season Filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-neutral-400 text-xs">
              <Trophy className="w-3.5 h-3.5" />
              Season
            </Label>
            <Select
              value={filters.seasonId || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  seasonId: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-neutral-800 border-gold-500/20 text-white">
                <SelectValue placeholder="All Seasons" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-gold-500/20">
                <SelectItem value="all" className="text-white hover:bg-gold-500/10 focus:bg-gold-500/10">
                  All Seasons
                </SelectItem>
                {seasons.map((season) => (
                  <SelectItem
                    key={season.id}
                    value={season.id}
                    className="text-white hover:bg-gold-500/10 focus:bg-gold-500/10"
                  >
                    {season.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-neutral-400 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              From Date
            </Label>
            <Input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  dateFrom: e.target.value || undefined,
                })
              }
              className="bg-neutral-800 border-gold-500/20 text-white"
            />
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-neutral-400 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              To Date
            </Label>
            <Input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  dateTo: e.target.value || undefined,
                })
              }
              className="bg-neutral-800 border-gold-500/20 text-white"
            />
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && !isExpanded && (
        <div className="flex flex-wrap gap-2">
          {filters.status && filters.status !== 'all' && (
            <FilterTag
              label={`Status: ${statusOptions.find((o) => o.value === filters.status)?.label}`}
              onRemove={() => onFiltersChange({ ...filters, status: undefined })}
            />
          )}
          {filters.teamId && (
            <FilterTag
              label={`Team: ${teams.find((t) => t.id === filters.teamId)?.name}`}
              onRemove={() => onFiltersChange({ ...filters, teamId: undefined })}
            />
          )}
          {filters.seasonId && (
            <FilterTag
              label={`Season: ${seasons.find((s) => s.id === filters.seasonId)?.name}`}
              onRemove={() => onFiltersChange({ ...filters, seasonId: undefined })}
            />
          )}
          {filters.dateFrom && (
            <FilterTag
              label={`From: ${format(new Date(filters.dateFrom), 'MMM d, yyyy')}`}
              onRemove={() => onFiltersChange({ ...filters, dateFrom: undefined })}
            />
          )}
          {filters.dateTo && (
            <FilterTag
              label={`To: ${format(new Date(filters.dateTo), 'MMM d, yyyy')}`}
              onRemove={() => onFiltersChange({ ...filters, dateTo: undefined })}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-500/10 text-gold-500 text-xs font-medium border border-gold-500/20">
      {label}
      <button
        onClick={onRemove}
        className="w-3.5 h-3.5 rounded-full hover:bg-gold-500/20 flex items-center justify-center"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}
