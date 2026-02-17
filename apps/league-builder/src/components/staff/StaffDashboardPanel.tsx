'use client';

import { cn } from '@hockey-life/ui';
import {
  ClipboardList,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { StaffDashboardData, StaffAssignment } from '@/lib/actions/staff-dashboard';
import { useMemo } from 'react';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function AssignmentRow({ assignment }: { assignment: StaffAssignment }) {
  const game = assignment.game;
  if (!game) return null;

  const isCompleted = !!assignment.completed_at;
  const homeTeam = game.home_team?.name ?? 'TBD';
  const awayTeam = game.away_team?.name ?? 'TBD';

  return (
    <Link
      href={`/dashboard/leagues/${assignment.league_id}`}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl transition-colors',
        'hover:bg-white/[0.04] group'
      )}
    >
      {/* Date/time column */}
      <div className="flex-shrink-0 w-20 text-center">
        <div className="text-sm font-semibold text-white">
          {formatDate(game.scheduled_at)}
        </div>
        <div className="text-xs text-neutral-500">{formatTime(game.scheduled_at)}</div>
      </div>

      {/* Matchup */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">
          {homeTeam} vs {awayTeam}
        </div>
        {game.location && (
          <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{game.location}</span>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-500/10 text-green-500">
            <CheckCircle2 className="w-3 h-3" />
            Done
          </span>
        ) : assignment.checked_in_at ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-rink-500/10 text-rink-500">
            <Clock className="w-3 h-3" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500">
            <Clock className="w-3 h-3" />
            Upcoming
          </span>
        )}
      </div>

      {/* Notes indicator */}
      {assignment.notes && (
        <FileText className="w-4 h-4 text-neutral-600 flex-shrink-0" />
      )}

      <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors flex-shrink-0" />
    </Link>
  );
}

function MiniCalendar({ assignmentDates }: { assignmentDates: string[] }) {
  const dateSet = useMemo(() => new Set(assignmentDates), [assignmentDates]);

  // Build a 4-week calendar starting from this week's Monday
  const weeks = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const result: Date[][] = [];
    for (let w = 0; w < 4; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + w * 7 + d);
        week.push(date);
      }
      result.push(week);
    }
    return result;
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayLabels.map((label, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-medium text-neutral-600 py-1"
          >
            {label}
          </div>
        ))}
      </div>
      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((date, di) => {
            const dateStr = date.toISOString().split('T')[0];
            const hasAssignment = dateSet.has(dateStr);
            const isToday = dateStr === todayStr;
            const isPast = date < today;

            return (
              <div
                key={di}
                className={cn(
                  'relative flex items-center justify-center w-8 h-8 rounded-lg text-xs transition-colors',
                  isToday && 'ring-1 ring-rink-500/50',
                  hasAssignment && !isPast && 'bg-rink-500/20 text-rink-400 font-semibold',
                  hasAssignment && isPast && 'bg-green-500/10 text-green-500/70',
                  !hasAssignment && isPast && 'text-neutral-700',
                  !hasAssignment && !isPast && 'text-neutral-500'
                )}
              >
                {date.getDate()}
                {hasAssignment && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-rink-500" />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function StaffDashboardPanel({ data }: { data: StaffDashboardData }) {
  if (!data.isStaff) return null;

  const { upcoming, recent, stats, assignmentDates } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-rink-500" />
          My Assignments
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: upcoming assignments + recent */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-white">{stats.totalAssignments}</div>
              <div className="text-xs text-neutral-500 mt-1">Total</div>
            </div>
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-green-500">{stats.completedAssignments}</div>
              <div className="text-xs text-neutral-500 mt-1">Completed</div>
            </div>
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-rink-500">{stats.upcomingCount}</div>
              <div className="text-xs text-neutral-500 mt-1">Upcoming</div>
            </div>
          </div>

          {/* Upcoming Assignments */}
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="font-semibold text-white text-sm">Upcoming Assignments</h3>
            </div>
            {upcoming.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-sm">
                No upcoming assignments
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {upcoming.map((a) => (
                  <AssignmentRow key={a.id} assignment={a} />
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          {recent.length > 0 && (
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h3 className="font-semibold text-white text-sm">Recent Activity</h3>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {recent.map((a) => (
                  <AssignmentRow key={a.id} assignment={a} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: calendar */}
        <div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-rink-500" />
              <h3 className="font-semibold text-white text-sm">Assignment Calendar</h3>
            </div>
            <MiniCalendar assignmentDates={assignmentDates} />
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                <span className="w-2 h-2 rounded-full bg-rink-500/40" />
                Upcoming
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                <span className="w-2 h-2 rounded-full bg-green-500/30" />
                Completed
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
