'use client';

import { cn } from '@hockey-life/ui';
import { useTranslations } from 'next-intl';
import type { GameStatus } from '@/lib/actions/games';
import {
  Clock,
  Play,
  CheckCircle,
  XCircle,
  PauseCircle,
  RefreshCw,
} from 'lucide-react';

interface StatusBadgeProps {
  status: GameStatus;
  isRescheduled?: boolean;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusStyles: Record<
  GameStatus,
  { bgColor: string; textColor: string; borderColor: string; icon: typeof Clock }
> = {
  scheduled: { bgColor: 'bg-blue-500/10', textColor: 'text-blue-500', borderColor: 'border-blue-500/30', icon: Clock },
  in_progress: { bgColor: 'bg-green-500/10', textColor: 'text-green-500', borderColor: 'border-green-500/30', icon: Play },
  completed: { bgColor: 'bg-rink-500/10', textColor: 'text-rink-500', borderColor: 'border-rink-500/30', icon: CheckCircle },
  cancelled: { bgColor: 'bg-red-500/10', textColor: 'text-red-500', borderColor: 'border-red-500/30', icon: XCircle },
  postponed: { bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-500', borderColor: 'border-yellow-500/30', icon: PauseCircle },
};

const sizeConfig = {
  sm: {
    badge: 'px-2 py-0.5 text-xs',
    icon: 'w-3 h-3',
  },
  md: {
    badge: 'px-2.5 py-1 text-xs',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    badge: 'px-3 py-1.5 text-sm',
    icon: 'w-4 h-4',
  },
};

export function StatusBadge({
  status,
  isRescheduled,
  className,
  showIcon = true,
  size = 'md',
}: StatusBadgeProps) {
  const t = useTranslations('games');
  const styles = statusStyles[status];
  const sizes = sizeConfig[size];
  const Icon = styles.icon;

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-semibold rounded-full border',
          styles.bgColor,
          styles.textColor,
          styles.borderColor,
          sizes.badge,
          className
        )}
      >
        {showIcon && <Icon className={sizes.icon} />}
        {t(`status.${status}`)}
      </span>
      {isRescheduled && (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-medium rounded-full border',
            'bg-orange-500/10 text-orange-500 border-orange-500/30',
            sizes.badge
          )}
        >
          <RefreshCw className={sizes.icon} />
          {t('status.rescheduled')}
        </span>
      )}
    </div>
  );
}

export function StatusDot({
  status,
  className,
}: {
  status: GameStatus;
  className?: string;
}) {

  return (
    <span
      className={cn(
        'w-2 h-2 rounded-full',
        status === 'scheduled' && 'bg-blue-500',
        status === 'in_progress' && 'bg-green-500 animate-pulse',
        status === 'completed' && 'bg-rink-500',
        status === 'cancelled' && 'bg-red-500',
        status === 'postponed' && 'bg-yellow-500',
        className
      )}
    />
  );
}
