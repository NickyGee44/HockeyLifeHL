'use client';

import { cn } from '@hockey-life/ui';
import { HealthScore, HealthInsight } from '@/lib/dashboard';
import { useHealthScore } from '@/lib/dashboard/use-dashboard';
import { DashboardCard } from './RevenueChart';

interface HealthScoreWidgetProps {
  organizationId: string;
  className?: string;
}

/**
 * HealthScoreWidget - Composite league health score
 * Shows overall health with breakdown by category
 */
export function HealthScoreWidget({
  organizationId,
  className,
}: HealthScoreWidgetProps) {
  const { data, isLoading, error } = useHealthScore(organizationId);

  if (error) {
    return (
      <DashboardCard title="League Health" className={className}>
        <div className="h-64 flex items-center justify-center">
          <p className="text-red-400">Failed to load health data</p>
        </div>
      </DashboardCard>
    );
  }

  const healthCategories = data
    ? [
        { label: 'Revenue', value: data.revenue_score },
        { label: 'Game Completion', value: data.game_completion_score },
        { label: 'User Engagement', value: data.user_engagement_score },
        { label: 'Registrations', value: data.registration_conversion_score },
      ]
    : [];

  return (
    <DashboardCard title="League Health" className={className}>
      {isLoading ? (
        <HealthSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Main Score Circle */}
          <div className="flex justify-center">
            <HealthScoreCircle
              score={data?.overall_score || 0}
              status={data?.health_status || 'Needs Attention'}
            />
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {healthCategories.map((category) => (
              <CategoryScore key={category.label} {...category} />
            ))}
          </div>

          {/* Insights */}
          {data?.insights && data.insights.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-neutral-800">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Insights
              </p>
              <div className="space-y-2">
                {data.insights.slice(0, 3).map((insight, i) => (
                  <InsightItem key={i} insight={insight} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardCard>
  );
}

function HealthScoreCircle({
  score,
  status,
}: {
  score: number;
  status: HealthScore['health_status'];
}) {
  const circumference = 2 * Math.PI * 45;
  const progress = (score / 100) * circumference;

  const getStatusColor = () => {
    switch (status) {
      case 'Excellent':
        return 'text-emerald-400';
      case 'Good':
        return 'text-rink-400';
      case 'Fair':
        return 'text-amber-400';
      default:
        return 'text-red-400';
    }
  };

  const getStrokeColor = () => {
    switch (status) {
      case 'Excellent':
        return '#22c55e';
      case 'Good':
        return '#22D3EE';
      case 'Fair':
        return '#f59e0b';
      default:
        return '#ef4444';
    }
  };

  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="72"
          cy="72"
          r="45"
          fill="none"
          stroke="#262626"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="72"
          cy="72"
          r="45"
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-4xl font-black', getStatusColor())}>{score}</span>
        <span className="text-xs text-neutral-500 uppercase tracking-wider">{status}</span>
      </div>
    </div>
  );
}

function CategoryScore({ label, value }: { label: string; value: number }) {
  const getValueColor = () => {
    if (value >= 80) return 'text-emerald-400';
    if (value >= 60) return 'text-rink-400';
    if (value >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-neutral-950/50 rounded-xl p-3">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <span className={cn('text-lg font-bold', getValueColor())}>{value}</span>
        <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              value >= 80
                ? 'bg-emerald-500'
                : value >= 60
                ? 'bg-rink-500'
                : value >= 40
                ? 'bg-amber-500'
                : 'bg-red-500'
            )}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function InsightItem({ insight }: { insight: HealthInsight }) {
  const getIconAndColor = () => {
    switch (insight.type) {
      case 'success':
        return { icon: CheckIcon, color: 'text-emerald-400 bg-emerald-500/10' };
      case 'warning':
        return { icon: AlertIcon, color: 'text-amber-400 bg-amber-500/10' };
      case 'error':
        return { icon: ErrorIcon, color: 'text-red-400 bg-red-500/10' };
      default:
        return { icon: InfoIcon, color: 'text-blue-400 bg-blue-500/10' };
    }
  };

  const { icon: Icon, color } = getIconAndColor();

  return (
    <div className={cn('flex items-start gap-2 p-2 rounded-lg', color.split(' ')[1])}>
      <Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', color.split(' ')[0])} />
      <p className="text-xs text-neutral-300">{insight.message}</p>
    </div>
  );
}

function HealthSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-center">
        <div className="w-36 h-36 rounded-full bg-neutral-800" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-neutral-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// Icon components
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  );
}
