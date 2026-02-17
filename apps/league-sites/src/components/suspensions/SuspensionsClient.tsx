'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { Suspension, Season } from '@/lib/types';

interface SuspensionsClientProps {
  suspensions: Suspension[];
  seasons: Season[];
  currentFilters: {
    season: string;
    status: string;
  };
  leagueSlug: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          Active
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
          Completed
        </span>
      );
    case 'appealed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
          Appealed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]">
          {status}
        </span>
      );
  }
}

export function SuspensionsClient({
  suspensions,
  seasons,
  currentFilters,
  leagueSlug,
}: SuspensionsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/${leagueSlug}/suspensions?${params.toString()}`);
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Season Filter */}
        {seasons.length > 0 && (
          <select
            value={currentFilters.season || 'all'}
            onChange={(e) => handleFilterChange('season', e.target.value)}
            className="
              px-4 py-2 rounded-lg
              bg-[var(--color-surface-hover)] border border-[var(--color-border)]
              text-[var(--color-text-primary)] text-sm
              focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50
              cursor-pointer transition-all duration-200
              hover:border-[var(--league-primary)]/50
            "
          >
            <option value="all">All Seasons</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
        )}

        {/* Status Filter */}
        <div className="flex gap-2">
          <StatusChip
            label="All"
            value="all"
            currentStatus={currentFilters.status}
            onClick={() => handleFilterChange('status', 'all')}
          />
          <StatusChip
            label="Active"
            value="active"
            currentStatus={currentFilters.status}
            onClick={() => handleFilterChange('status', 'active')}
          />
          <StatusChip
            label="Completed"
            value="completed"
            currentStatus={currentFilters.status}
            onClick={() => handleFilterChange('status', 'completed')}
          />
        </div>
      </div>

      {/* Suspensions Table */}
      {suspensions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-3 px-3 font-medium text-[var(--color-text-muted)]">
                  Player
                </th>
                <th className="text-left py-3 px-3 font-medium text-[var(--color-text-muted)]">
                  Team
                </th>
                <th className="text-left py-3 px-3 font-medium text-[var(--color-text-muted)]">
                  Reason
                </th>
                <th className="text-center py-3 px-3 font-medium text-[var(--color-text-muted)]">
                  Games
                </th>
                <th className="text-center py-3 px-3 font-medium text-[var(--color-text-muted)]">
                  Dates
                </th>
                <th className="text-center py-3 px-3 font-medium text-[var(--color-text-muted)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {suspensions.map((suspension) => (
                <tr
                  key={suspension.id}
                  className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <Image
                        src={suspension.player?.avatar_url || '/blank_player.png'}
                        alt={suspension.player?.full_name || ''}
                        width={28}
                        height={28}
                        className="rounded-full object-cover"
                      />
                      <Link
                        href={`/${leagueSlug}/players/${suspension.player_id}`}
                        className="font-medium hover:text-[var(--league-primary)] transition-colors"
                      >
                        {suspension.player?.full_name || 'Unknown Player'}
                      </Link>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {suspension.team?.logo_url && (
                        <Image
                          src={suspension.team.logo_url}
                          alt={suspension.team.name || ''}
                          width={20}
                          height={20}
                          className="rounded"
                        />
                      )}
                      <span className="text-[var(--color-text-secondary)]">
                        {suspension.team?.name || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[var(--color-text-primary)]">
                      {suspension.reason}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {suspension.games_remaining != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--color-text-muted)]" />
                        <span className="font-medium">
                          {suspension.games_remaining}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center gap-0.5 text-xs text-[var(--color-text-secondary)]">
                      {suspension.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(suspension.start_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {suspension.end_date && (
                        <span className="text-[var(--color-text-muted)]">
                          to {format(new Date(suspension.end_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {!suspension.start_date && !suspension.end_date && (
                        <span className="text-[var(--color-text-muted)]">-</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {getStatusBadge(suspension.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center">
          <ShieldAlert className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Suspensions</h3>
          <p className="text-[var(--color-text-secondary)]">
            {currentFilters.status === 'active'
              ? 'There are no active suspensions at this time.'
              : currentFilters.status === 'completed'
              ? 'No completed suspensions found for this period.'
              : 'No suspensions have been recorded yet.'}
          </p>
        </div>
      )}

      {/* Summary footer */}
      {suspensions.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-text-muted)]">
          <span>
            {suspensions.length} suspension{suspensions.length !== 1 ? 's' : ''} found
          </span>
          <div className="flex items-center gap-1 text-xs">
            <AlertTriangle className="w-3 h-3" />
            <span>Suspensions are issued by league officials</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusChip({
  label,
  value,
  currentStatus,
  onClick,
}: {
  label: string;
  value: string;
  currentStatus: string;
  onClick: () => void;
}) {
  const isActive = currentStatus === value;

  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
        ${
          isActive
            ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
            : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]'
        }
      `}
    >
      {label}
    </button>
  );
}
