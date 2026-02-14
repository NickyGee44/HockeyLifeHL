'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  useGameEvents,
  getTeamPlayers,
  type GameEvent,
  type EventType,
  type Team,
  type Player } from '@/lib/scorekeeper';
import { cn } from '@hockey-life/ui';
import { useEffect } from 'react';

interface EventTimelineProps {
  gameId: string;
  homeTeam?: Team;
  awayTeam?: Team;
  period?: number; // If provided, only show events for this period
  onUndoEvent?: (eventId: string) => void;
  showPeriodHeaders?: boolean;
  maxHeight?: string;
}

/**
 * EventTimeline - Chronological list of game events with undo
 * iPad-optimized with swipe-to-undo gesture
 * Shows goals, assists, penalties, and saves
 */
export function EventTimeline({
  gameId,
  homeTeam,
  awayTeam,
  period,
  onUndoEvent,
  showPeriodHeaders = true,
  maxHeight = '400px' }: EventTimelineProps) {
  const t = useTranslations('scorekeeper.timeline');
  const { events, undoEvent, isLoading } = useGameEvents(gameId);
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const [undoingId, setUndoingId] = useState<string | null>(null);

  // Load player data
  useEffect(() => {
    const loadPlayers = async () => {
      if (!homeTeam?.id && !awayTeam?.id) return;

      const playerMap = new Map<string, Player>();

      if (homeTeam?.id) {
        const homePlayers = await getTeamPlayers(homeTeam.id);
        homePlayers.forEach((p) => playerMap.set(p.id, p));
      }

      if (awayTeam?.id) {
        const awayPlayers = await getTeamPlayers(awayTeam.id);
        awayPlayers.forEach((p) => playerMap.set(p.id, p));
      }

      setPlayers(playerMap);
    };

    loadPlayers();
  }, [homeTeam?.id, awayTeam?.id]);

  // Filter events by period if specified
  const filteredEvents = useMemo(() => {
    const filtered = period
      ? events.filter((e) => e.period === period)
      : events;

    // Sort by period then time
    return filtered.sort((a, b) => {
      if (a.period !== b.period) return a.period - b.period;
      return b.game_time_seconds - a.game_time_seconds; // Newest first
    });
  }, [events, period]);

  // Group events by period
  const eventsByPeriod = useMemo(() => {
    const groups = new Map<number, GameEvent[]>();

    filteredEvents.forEach((event) => {
      const existing = groups.get(event.period) || [];
      groups.set(event.period, [...existing, event]);
    });

    return groups;
  }, [filteredEvents]);

  const handleUndo = useCallback(
    async (eventId: string) => {
      setUndoingId(eventId);
      try {
        await undoEvent(eventId);
        onUndoEvent?.(eventId);
      } finally {
        setUndoingId(null);
      }
    },
    [undoEvent, onUndoEvent]
  );

  const getTeamForEvent = (event: GameEvent): Team | undefined => {
    if (event.team_id === homeTeam?.id) return homeTeam;
    if (event.team_id === awayTeam?.id) return awayTeam;
    return undefined;
  };

  if (isLoading) {
    return <EventTimelineSkeleton />;
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-neutral-400 font-medium">{t('noEventsRecorded')}</p>
        <p className="text-neutral-500 text-sm mt-1">
          {period ? t('noEventsInPeriod', { period }) : t('startRecording')}
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden"
      style={{ maxHeight }}
    >
      <div className="overflow-y-auto" style={{ maxHeight }}>
        {showPeriodHeaders ? (
          // Grouped by period
          Array.from(eventsByPeriod.entries()).map(([periodNum, periodEvents]) => (
            <div key={periodNum}>
              {/* Period Header */}
              <div className="sticky top-0 z-10 px-4 py-2 bg-neutral-950 border-b border-neutral-800">
                <span className="text-xs font-semibold text-rink-500 uppercase tracking-wider">
                  {t('period', { period: periodNum })}
                </span>
              </div>

              {/* Events */}
              <div className="divide-y divide-neutral-800">
                {periodEvents.map((event) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    team={getTeamForEvent(event)}
                    player={players.get(event.player_id)}
                    assistPlayers={event.assist_player_ids?.map((id) => players.get(id)).filter(Boolean) as Player[]}
                    onUndo={() => handleUndo(event.id)}
                    isUndoing={undoingId === event.id}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          // Flat list
          <div className="divide-y divide-neutral-800">
            {filteredEvents.map((event) => (
              <EventItem
                key={event.id}
                event={event}
                team={getTeamForEvent(event)}
                player={players.get(event.player_id)}
                assistPlayers={event.assist_player_ids?.map((id) => players.get(id)).filter(Boolean) as Player[]}
                onUndo={() => handleUndo(event.id)}
                isUndoing={undoingId === event.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface EventItemProps {
  event: GameEvent;
  team?: Team;
  player?: Player;
  assistPlayers?: Player[];
  onUndo: () => void;
  isUndoing: boolean;
}

function EventItem({
  event,
  team,
  player,
  assistPlayers,
  onUndo,
  isUndoing }: EventItemProps) {
  const t = useTranslations('scorekeeper.timeline');
  const [showUndo, setShowUndo] = useState(false);
  const teamColor = team?.primary_color || '#22D3EE';

  const eventConfig = getEventConfig(event.event_type, t);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        'relative flex items-start gap-4 p-4 transition-all touch-manipulation',
        'hover:bg-neutral-800/50',
        showUndo && 'bg-red-500/5'
      )}
      onTouchStart={() => setShowUndo(true)}
      onTouchEnd={() => setTimeout(() => setShowUndo(false), 2000)}
    >
      {/* Event Icon */}
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
          eventConfig.bgClass
        )}
      >
        <eventConfig.icon className={cn('w-6 h-6', eventConfig.iconClass)} />
      </div>

      {/* Event Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('font-semibold', eventConfig.textClass)}>
            {eventConfig.label}
          </span>
          {event.sync_status !== 'synced' && (
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                event.sync_status === 'pending' && 'bg-amber-500/20 text-amber-400',
                event.sync_status === 'syncing' && 'bg-rink-500/20 text-rink-400',
                event.sync_status === 'error' && 'bg-red-500/20 text-red-400'
              )}
            >
              {event.sync_status}
            </span>
          )}
        </div>

        {/* Player info */}
        {player && (
          <p className="text-white font-medium">
            <span style={{ color: teamColor }}>#{player.jersey_number}</span>{' '}
            {player.full_name}
          </p>
        )}

        {/* Assists */}
        {assistPlayers && assistPlayers.length > 0 && (
          <p className="text-sm text-neutral-400 mt-0.5">
            {t('assistsLabel')}{' '}
            {assistPlayers.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ', '}
                <span style={{ color: teamColor }}>#{p.jersey_number}</span> {p.full_name}
              </span>
            ))}
          </p>
        )}

        {/* Penalty info */}
        {event.penalty_type && (
          <p className="text-sm text-neutral-400 mt-0.5">
            {event.penalty_minutes} min - {event.penalty_description || event.penalty_type}
          </p>
        )}

        {/* Timestamp */}
        <p className="text-xs text-neutral-500 mt-1">
          P{event.period} {formatTime(event.game_time_seconds)}
        </p>
      </div>

      {/* Undo Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUndo();
        }}
        disabled={isUndoing}
        className={cn(
          'flex-shrink-0 p-3 rounded-xl transition-all touch-manipulation',
          'text-neutral-500 hover:text-red-400 hover:bg-red-500/10',
          'active:bg-red-500/20',
          showUndo && 'text-red-400 bg-red-500/10',
          isUndoing && 'opacity-50'
        )}
      >
        {isUndoing ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        )}
      </button>
    </div>
  );
}

// Event type configuration
function getEventConfig(type: EventType, t: (key: string) => string) {
  switch (type) {
    case 'goal':
      return {
        label: t('goalLabel'),
        icon: GoalIcon,
        bgClass: 'bg-emerald-500/20',
        iconClass: 'text-emerald-400',
        textClass: 'text-emerald-400' };
    case 'assist':
      return {
        label: t('assistLabel'),
        icon: AssistIcon,
        bgClass: 'bg-blue-500/20',
        iconClass: 'text-blue-400',
        textClass: 'text-blue-400' };
    case 'penalty':
      return {
        label: t('penaltyLabel'),
        icon: PenaltyIcon,
        bgClass: 'bg-red-500/20',
        iconClass: 'text-red-400',
        textClass: 'text-red-400' };
    case 'save':
      return {
        label: t('saveLabel'),
        icon: SaveIcon,
        bgClass: 'bg-purple-500/20',
        iconClass: 'text-purple-400',
        textClass: 'text-purple-400' };
    case 'period_start':
      return {
        label: t('periodStartLabel'),
        icon: ClockIcon,
        bgClass: 'bg-rink-500/20',
        iconClass: 'text-rink-400',
        textClass: 'text-rink-400' };
    case 'period_end':
      return {
        label: t('periodEndLabel'),
        icon: ClockIcon,
        bgClass: 'bg-neutral-700',
        iconClass: 'text-neutral-400',
        textClass: 'text-neutral-400' };
    default: {
      // Handle unknown event types gracefully
      const unknownType: string = type as string;
      return {
        label: unknownType.toUpperCase(),
        icon: ClockIcon,
        bgClass: 'bg-neutral-700',
        iconClass: 'text-neutral-400',
        textClass: 'text-neutral-400' };
    }
  }
}

// Icon components
function GoalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h4M18 12h4M12 2v4M12 18v4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

function AssistIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PenaltyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" />
      <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EventTimelineSkeleton() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-4 p-4 border-b border-neutral-800 last:border-0">
          <div className="w-12 h-12 rounded-xl bg-neutral-800" />
          <div className="flex-1">
            <div className="h-4 bg-neutral-800 rounded w-20 mb-2" />
            <div className="h-5 bg-neutral-800 rounded w-40 mb-1" />
            <div className="h-3 bg-neutral-800 rounded w-24 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { EventTimelineSkeleton };
