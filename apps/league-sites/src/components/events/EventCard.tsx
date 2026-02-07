import { MapPin, Clock } from 'lucide-react';
import type { LeagueEvent } from '@/lib/types';

interface EventCardProps {
  event: LeagueEvent;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  general: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  practice: 'bg-green-500/10 text-green-400 border-green-500/20',
  tournament: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  social: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  meeting: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  fundraiser: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  general: 'General',
  practice: 'Practice',
  tournament: 'Tournament',
  social: 'Social',
  meeting: 'Meeting',
  fundraiser: 'Fundraiser',
};

function formatEventDate(dateStr: string) {
  const date = new Date(dateStr);
  return {
    dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    day: date.getDate(),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    full: date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };
}

export function EventCard({ event }: EventCardProps) {
  const date = formatEventDate(event.start_time);
  const endDate = event.end_time ? formatEventDate(event.end_time) : null;
  const typeColor = EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS.general;
  const typeLabel = EVENT_TYPE_LABELS[event.event_type] || event.event_type;

  return (
    <div className="card group flex gap-4 p-4">
      {/* Date box */}
      <div className="shrink-0 w-16 text-center">
        <div className="rounded-xl border border-[var(--league-primary)]/25 bg-[var(--league-primary)]/10 p-2">
          <p className="text-xs font-medium text-[var(--league-primary)] uppercase">{date.month}</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{date.day}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{date.dayName}</p>
        </div>
      </div>

      {/* Event details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] truncate">
            {event.title}
          </h3>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${typeColor}`}>
            {typeLabel}
          </span>
        </div>

        {event.description && (
          <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-2">
            {event.description}
          </p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-secondary)]">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {date.time}
            {endDate && <span> - {endDate.time}</span>}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {event.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
