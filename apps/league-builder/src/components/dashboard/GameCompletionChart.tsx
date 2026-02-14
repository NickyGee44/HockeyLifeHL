'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps,
} from 'recharts';
import { DateRange, GameStatsDataPoint, formatPercent, exportToCSV } from '@/lib/dashboard';
import { useGameStats } from '@/lib/dashboard/use-dashboard';
import { DashboardCard, StatBox, ExportButton, ChartSkeleton } from './RevenueChart';

interface GameCompletionChartProps {
  organizationId: string;
  dateRange: DateRange;
  className?: string;
}

/**
 * GameCompletionChart - Game completion rate visualization
 * Shows scheduled vs played vs cancelled games
 */
export function GameCompletionChart({
  organizationId,
  dateRange,
  className,
}: GameCompletionChartProps) {
  const { data, isLoading, error } = useGameStats(organizationId, dateRange);

  const summary = useMemo(() => {
    if (!data || data.length === 0) {
      return { total: 0, completed: 0, cancelled: 0, rate: 0 };
    }

    const total = data.reduce((sum, d) => sum + d.total_scheduled, 0);
    const completed = data.reduce((sum, d) => sum + d.completed_count, 0);
    const cancelled = data.reduce((sum, d) => sum + d.cancelled_count, 0);
    const overdue = data.reduce((sum, d) => sum + d.overdue_count, 0);

    return {
      total,
      completed,
      cancelled,
      overdue,
      rate: total > 0 ? (completed / total) * 100 : 0,
    };
  }, [data]);

  const handleExport = () => {
    if (data) {
      exportToCSV(data as unknown as Record<string, unknown>[], 'game_stats', [
        { key: 'scheduled_at', label: 'Date' },
        { key: 'total_scheduled', label: 'Scheduled' },
        { key: 'completed_count', label: 'Completed' },
        { key: 'cancelled_count', label: 'Cancelled' },
        { key: 'completion_rate', label: 'Completion Rate (%)' },
      ]);
    }
  };

  if (error) {
    return (
      <DashboardCard title="Game Completion" className={className}>
        <div className="h-64 flex items-center justify-center">
          <p className="text-red-400">Failed to load game data</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Game Completion"
      className={className}
      actions={<ExportButton onClick={handleExport} disabled={isLoading || !data?.length} />}
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatBox
          label="Total Scheduled"
          value={summary.total.toString()}
          isLoading={isLoading}
        />
        <StatBox
          label="Completed"
          value={summary.completed.toString()}
          valueClass="text-emerald-400"
          isLoading={isLoading}
        />
        <StatBox
          label="Cancelled"
          value={summary.cancelled.toString()}
          valueClass="text-red-400"
          isLoading={isLoading}
        />
        <StatBox
          label="Completion Rate"
          value={formatPercent(summary.rate)}
          valueClass={summary.rate >= 80 ? 'text-emerald-400' : summary.rate >= 60 ? 'text-amber-400' : 'text-red-400'}
          isLoading={isLoading}
        />
      </div>

      {/* Chart */}
      <div className="h-64">
        {isLoading ? (
          <ChartSkeleton />
        ) : !data || data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-500">
            No game data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis
                dataKey="scheduled_at"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#737373', fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#737373', fontSize: 12 }}
              />
              <Tooltip content={<GameTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => <span className="text-neutral-300 text-sm">{value}</span>}
              />
              <Bar dataKey="completed_count" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cancelled_count" name="Cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="in_progress_count" name="In Progress" fill="#22D3EE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </DashboardCard>
  );
}

function GameTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as GameStatsDataPoint;
  const date = new Date(label);

  return (
    <div className="bg-neutral-900 border border-rink-500/30 rounded-xl p-3 shadow-lg">
      <p className="text-sm font-semibold text-white mb-2">
        {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-neutral-400">Scheduled:</span>
          <span className="text-white">{data.total_scheduled}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-neutral-400">Completed:</span>
          <span className="text-emerald-400">{data.completed_count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-neutral-400">Cancelled:</span>
          <span className="text-red-400">{data.cancelled_count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-neutral-400">Rate:</span>
          <span className="text-rink-400">{formatPercent(data.completion_rate)}</span>
        </div>
      </div>
    </div>
  );
}
