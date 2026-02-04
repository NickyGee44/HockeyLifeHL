'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@hockey-life/ui';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RegistrationFiltersProps {
  seasons: { id: string; name: string }[];
  currentStatus?: string;
  currentType?: string;
  currentSeason?: string;
  currentSearch?: string;
}

export function RegistrationFilters({
  seasons,
  currentStatus,
  currentType,
  currentSeason,
  currentSearch,
}: RegistrationFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(currentSearch || '');
  const [mounted, setMounted] = useState(false);

  // Only render Select components after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSearchValue(currentSearch || '');
  }, [currentSearch]);

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Reset to page 1 when filters change
    params.delete('page');

    router.push(`?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters('search', searchValue || null);
  };

  const clearFilters = () => {
    router.push('?');
    setSearchValue('');
  };

  const hasFilters =
    currentStatus || currentType || currentSeason || currentSearch;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10 bg-neutral-800 border-neutral-700"
            />
          </div>
        </form>

        {/* Status Filter */}
        {mounted ? (
          <Select
            value={currentStatus || 'all'}
            onValueChange={(value) =>
              updateFilters('status', value === 'all' ? null : value)
            }
          >
            <SelectTrigger className="w-full md:w-40 bg-neutral-800 border-neutral-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="waitlisted">Waitlisted</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="w-full md:w-40 h-10 bg-neutral-800 border border-neutral-700 rounded-md animate-pulse" />
        )}

        {/* Type Filter */}
        {mounted ? (
          <Select
            value={currentType || 'all'}
            onValueChange={(value) =>
              updateFilters('type', value === 'all' ? null : value)
            }
          >
            <SelectTrigger className="w-full md:w-48 bg-neutral-800 border-neutral-700">
              <SelectValue placeholder="Registration Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="team_registration">Team Registration</SelectItem>
              <SelectItem value="free_agent">Free Agent</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="w-full md:w-48 h-10 bg-neutral-800 border border-neutral-700 rounded-md animate-pulse" />
        )}

        {/* Season Filter */}
        {seasons.length > 0 && (
          mounted ? (
            <Select
              value={currentSeason || 'all'}
              onValueChange={(value) =>
                updateFilters('season', value === 'all' ? null : value)
              }
            >
              <SelectTrigger className="w-full md:w-48 bg-neutral-800 border-neutral-700">
                <SelectValue placeholder="Season" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Seasons</SelectItem>
                {seasons.map((season) => (
                  <SelectItem key={season.id} value={season.id}>
                    {season.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="w-full md:w-48 h-10 bg-neutral-800 border border-neutral-700 rounded-md animate-pulse" />
          )
        )}
      </div>

      {/* Active Filters */}
      {hasFilters && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-400">Active filters:</span>
          <div className="flex flex-wrap gap-2">
            {currentStatus && (
              <FilterBadge
                label={`Status: ${currentStatus}`}
                onRemove={() => updateFilters('status', null)}
              />
            )}
            {currentType && (
              <FilterBadge
                label={`Type: ${currentType.replace('_', ' ')}`}
                onRemove={() => updateFilters('type', null)}
              />
            )}
            {currentSeason && (
              <FilterBadge
                label={`Season: ${seasons.find((s) => s.id === currentSeason)?.name || currentSeason}`}
                onRemove={() => updateFilters('season', null)}
              />
            )}
            {currentSearch && (
              <FilterBadge
                label={`Search: "${currentSearch}"`}
                onRemove={() => {
                  setSearchValue('');
                  updateFilters('search', null);
                }}
              />
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-neutral-400 hover:text-white"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterBadge({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-800 text-sm text-neutral-300">
      {label}
      <button
        onClick={onRemove}
        className="ml-1 hover:text-white transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
