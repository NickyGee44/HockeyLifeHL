'use client';

import { Clock, User, Zap } from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';
import type { DraftPick } from './types';

interface DraftHistoryProps {
  picks: DraftPick[];
  maxDisplay?: number;
}

function formatTime(ms: number | null): string {
  if (!ms) return '-';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DraftHistory({ picks, maxDisplay = 10 }: DraftHistoryProps) {
  // Sort picks by pick_number descending (most recent first)
  const sortedPicks = [...picks].sort((a, b) => b.pick_number - a.pick_number);
  const displayedPicks = sortedPicks.slice(0, maxDisplay);

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Draft History</h2>
        <p className="text-sm text-muted-foreground">
          {picks.length} picks made
        </p>
      </div>

      {/* Timeline */}
      <div className="max-h-[400px] overflow-y-auto">
        {displayedPicks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No picks yet
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {displayedPicks.map((pick, index) => (
              <li
                key={pick.id}
                className={cn(
                  'p-4 transition-colors',
                  index === 0 && 'bg-rink-500/5'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Pick number badge */}
                  <div
                    className={cn(
                      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                      index === 0
                        ? 'bg-rink-500 text-black'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    #{pick.pick_number}
                  </div>

                  {/* Pick details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {pick.player_name || 'Unknown Player'}
                      </span>
                      {pick.auto_picked && (
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <Zap className="h-3 w-3" />
                          Auto
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {pick.team_name || 'Team'}
                      </span>
                      <span>Round {pick.round}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(pick.pick_time_ms)}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <span className="text-xs text-muted-foreground">
                    {pick.created_at ? formatTimestamp(pick.created_at) : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Show more */}
      {sortedPicks.length > maxDisplay && (
        <div className="border-t p-3 text-center">
          <span className="text-xs text-muted-foreground">
            +{sortedPicks.length - maxDisplay} more picks
          </span>
        </div>
      )}
    </div>
  );
}
