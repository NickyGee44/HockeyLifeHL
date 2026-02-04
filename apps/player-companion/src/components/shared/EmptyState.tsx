'use client';

import { cn } from '@hockey-life/ui';
import { Calendar, BarChart3, Users, Bell } from 'lucide-react';

type EmptyStateType = 'games' | 'stats' | 'team' | 'notifications';

interface EmptyStateProps {
  type: EmptyStateType;
  className?: string;
}

const emptyStates: Record<
  EmptyStateType,
  { icon: typeof Calendar; headline: string; body: string }
> = {
  games: {
    icon: Calendar,
    headline: 'No upcoming games',
    body: 'Your next game will appear here once scheduled.',
  },
  stats: {
    icon: BarChart3,
    headline: 'No stats yet',
    body: 'Your stats will appear here after your first game is recorded.',
  },
  team: {
    icon: Users,
    headline: 'No teammates yet',
    body: 'Your team roster will appear here once players join.',
  },
  notifications: {
    icon: Bell,
    headline: 'No notifications',
    body: 'You will see game reminders and updates here.',
  },
};

export function EmptyState({ type, className }: EmptyStateProps) {
  const { icon: Icon, headline, body } = emptyStates[type];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-neutral-850 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-neutral-600" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{headline}</h3>
      <p className="text-sm text-neutral-400 max-w-[240px]">{body}</p>
    </div>
  );
}
