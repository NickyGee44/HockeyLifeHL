'use client';

import { useState, useMemo } from 'react';
import { Calendar, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { EventCard } from './EventCard';
import type { LeagueEvent } from '@/lib/types';

interface EventCalendarProps {
  events: LeagueEvent[];
}

type ViewMode = 'list' | 'calendar';

export function EventCalendar({ events }: EventCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const now = new Date();

  // Split events into upcoming and past
  const { upcoming, past } = useMemo(() => {
    const upcoming: LeagueEvent[] = [];
    const past: LeagueEvent[] = [];
    events.forEach((e) => {
      if (new Date(e.start_time) >= now) {
        upcoming.push(e);
      } else {
        past.push(e);
      }
    });
    // Sort upcoming ascending, past descending
    upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    past.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    return { upcoming, past };
  }, [events]);

  // Group upcoming events by month
  const groupedUpcoming = useMemo(() => {
    const groups: Record<string, LeagueEvent[]> = {};
    upcoming.forEach((event) => {
      const date = new Date(event.start_time);
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!groups[label]) groups[label] = [];
      groups[label].push(event);
    });
    return groups;
  }, [upcoming]);

  // Calendar view helpers
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: (number | null)[] = [];

    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);

    return days;
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, LeagueEvent[]> = {};
    events.forEach((event) => {
      const date = new Date(event.start_time);
      if (date.getFullYear() === currentMonth.getFullYear() && date.getMonth() === currentMonth.getMonth()) {
        const day = date.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(event);
      }
    });
    return map;
  }, [events, currentMonth]);

  const [showPast, setShowPast] = useState(false);

  return (
    <div>
      {/* View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-1 bg-[var(--color-surface)]">
          <button
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-[var(--league-primary)] text-[var(--color-text-inverse)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-[var(--league-primary)] text-[var(--color-text-inverse)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendar
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Upcoming Events */}
          {upcoming.length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedUpcoming).map(([monthLabel, monthEvents]) => (
                <div key={monthLabel}>
                  <h3 className="text-sm font-semibold text-[var(--league-primary)] uppercase tracking-wider mb-3">
                    {monthLabel}
                  </h3>
                  <div className="space-y-3">
                    {monthEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-3" />
              <p className="text-[var(--color-text-secondary)]">No upcoming events scheduled.</p>
            </div>
          )}

          {/* Past Events */}
          {past.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowPast(!showPast)}
                className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-3"
              >
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${showPast ? 'rotate-90' : ''}`}
                />
                Past Events ({past.length})
              </button>
              {showPast && (
                <div className="space-y-3 opacity-75">
                  {past.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Calendar View */
        <div>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
              }
              className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {currentMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </h3>
            <button
              onClick={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
              }
              className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-[var(--color-text-muted)] py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => (
              <div
                key={i}
                className={`min-h-[80px] rounded-lg border p-1.5 ${
                  day
                    ? 'border-[var(--color-border)] bg-[var(--color-surface)]'
                    : 'border-transparent'
                }`}
              >
                {day && (
                  <>
                    <span className="text-xs text-[var(--color-text-secondary)]">{day}</span>
                    {eventsByDay[day] && (
                      <div className="mt-1 space-y-0.5">
                        {eventsByDay[day].slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className="text-[10px] leading-tight px-1 py-0.5 rounded bg-[var(--league-primary)]/10 text-[var(--league-primary)] truncate"
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {eventsByDay[day].length > 2 && (
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            +{eventsByDay[day].length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
