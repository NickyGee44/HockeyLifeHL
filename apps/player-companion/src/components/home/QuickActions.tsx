'use client';

import Link from 'next/link';
import { Navigation, Users, BarChart3, Calendar, Share2 } from 'lucide-react';
import { cn } from '@hockey-life/ui';

interface QuickAction {
  id: string;
  label: string;
  icon: typeof Navigation;
  href?: string;
  onClick?: () => void;
}

const quickActions: QuickAction[] = [
  { id: 'schedule', label: 'Schedule', icon: Calendar, href: '/schedule' },
  { id: 'roster', label: 'Roster', icon: Users, href: '/team' },
  { id: 'stats', label: 'Stats', icon: BarChart3, href: '/stats' },
  {
    id: 'share',
    label: 'Share',
    icon: Share2,
    onClick: async () => {
      if (navigator.share) {
        await navigator.share({
          title: 'HockeyLifeHL',
          text: 'Check out my hockey stats!',
          url: window.location.origin,
        });
      }
    },
  },
];

export function QuickActions() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {quickActions.map((action) => {
        const Icon = action.icon;
        const content = (
          <>
            <div className="w-10 h-10 rounded-full bg-gold-500/15 flex items-center justify-center">
              <Icon className="w-5 h-5 text-gold-500" />
            </div>
            <span className="text-xs font-medium text-neutral-300">{action.label}</span>
          </>
        );

        if (action.href) {
          return (
            <Link
              key={action.id}
              href={action.href}
              className={cn(
                'flex flex-col items-center gap-2 min-w-[72px] py-3 px-4',
                'rounded-xl bg-neutral-850 border border-gold-500/20',
                'active:scale-95 transition-transform touch-action-manipulation'
              )}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={action.id}
            onClick={action.onClick}
            className={cn(
              'flex flex-col items-center gap-2 min-w-[72px] py-3 px-4',
              'rounded-xl bg-neutral-850 border border-gold-500/20',
              'active:scale-95 transition-transform touch-action-manipulation'
            )}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
