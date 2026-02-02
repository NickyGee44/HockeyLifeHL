'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { cn } from '@hockey-life/ui';
import {
  RevenueDataPoint,
  formatCurrency,
  DateRange,
  Granularity,
  exportToCSV,
} from '@/lib/dashboard';
import { useRevenueStats } from '@/lib/dashboard/use-dashboard';

interface RevenueChartProps {
  organizationId: string;
  dateRange: DateRange;
  className?: string;
}

/**
 * RevenueChart - Revenue visualization with gold accent
 * Dark mode per BRAND-KIT.md
 */
export function RevenueChart({ organizationId, dateRange, className }: RevenueChartProps) {
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const { data, isLoading, error } = useRevenueStats(organizationId, dateRange, granularity);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((d) => ({
      ...d,
      revenue: d.total_revenue_cents / 100,
      failed: d.failed_revenue_cents / 100,
    }));
  }, [data]);

  const summary = useMemo(() => {
    if (!data || data.length === 0) {
      return { total: 0, average: 0, transactions: 0, failed: 0 };
    }

    const total = data.reduce((sum, d) => sum + d.total_revenue_cents, 0);
    const transactions = data.reduce((sum, d) => sum + d.payment_count, 0);
    const failed = data.reduce((sum, d) => sum + d.failed_payment_count, 0);

    return {
      total,
      average: data.length > 0 ? total / data.length : 0,
      transactions,
      failed,
    };
  }, [data]);

  const handleExport = () => {
    if (data) {
      exportToCSV(data as unknown as Record<string, unknown>[], 'revenue_data', [
        { key: 'period_label', label: 'Period' },
        { key: 'payment_count', label: 'Transactions' },
        { key: 'total_revenue_cents', label: 'Revenue (cents)' },
        { key: 'failed_payment_count', label: 'Failed' },
        { key: 'platform_fee_cents', label: 'Platform Fee (cents)' },
      ]);
    }
  };

  if (error) {
    return (
      <DashboardCard title="Revenue" className={className}>
        <div className="h-64 flex items-center justify-center">
          <p className="text-red-400">Failed to load revenue data</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Revenue"
      className={className}
      actions={
        <div className="flex items-center gap-2">
          <GranularityToggle value={granularity} onChange={setGranularity} />
          <ExportButton onClick={handleExport} disabled={isLoading || !data?.length} />
        </div>
      }
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatBox
          label="Total Revenue"
          value={formatCurrency(summary.total)}
          isLoading={isLoading}
        />
        <StatBox
          label="Daily Average"
          value={formatCurrency(summary.average)}
          isLoading={isLoading}
        />
        <StatBox
          label="Transactions"
          value={summary.transactions.toString()}
          isLoading={isLoading}
        />
        <StatBox
          label="Failed"
          value={summary.failed.toString()}
          valueClass="text-red-400"
          isLoading={isLoading}
        />
      </div>

      {/* Chart */}
      <div className="h-64">
        {isLoading ? (
          <ChartSkeleton />
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-500">
            No revenue data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis
                dataKey="period_label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#737373', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#737373', fontSize: 12 }}
                tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#D4AF37"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </DashboardCard>
  );
}

// Custom Tooltip
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as RevenueDataPoint & { revenue: number };

  return (
    <div className="bg-neutral-900 border border-gold-500/30 rounded-xl p-3 shadow-lg">
      <p className="text-sm font-semibold text-white mb-2">{label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-neutral-400">Revenue:</span>
          <span className="text-gold-400 font-semibold">{formatCurrency(data.total_revenue_cents)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-neutral-400">Transactions:</span>
          <span className="text-white">{data.payment_count}</span>
        </div>
        {data.failed_payment_count > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-400">Failed:</span>
            <span className="text-red-400">{data.failed_payment_count}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Granularity Toggle
function GranularityToggle({
  value,
  onChange,
}: {
  value: Granularity;
  onChange: (v: Granularity) => void;
}) {
  const options: { value: Granularity; label: string }[] = [
    { value: 'daily', label: 'D' },
    { value: 'weekly', label: 'W' },
    { value: 'monthly', label: 'M' },
  ];

  return (
    <div className="flex bg-neutral-800 rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-2.5 py-1 text-xs font-semibold rounded-md transition-all',
            value === opt.value
              ? 'bg-gold-500/20 text-gold-400'
              : 'text-neutral-400 hover:text-white'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Reusable components
export function DashboardCard({
  title,
  children,
  className,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'bg-neutral-900 border border-gold-500/20 rounded-2xl p-6',
        'shadow-glow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function StatBox({
  label,
  value,
  valueClass,
  isLoading,
}: {
  label: string;
  value: string;
  valueClass?: string;
  isLoading?: boolean;
}) {
  return (
    <div className="bg-neutral-950/50 rounded-xl p-3">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      {isLoading ? (
        <div className="h-6 bg-neutral-800 rounded animate-pulse w-20" />
      ) : (
        <p className={cn('text-lg font-bold text-white', valueClass)}>{value}</p>
      )}
    </div>
  );
}

export function ExportButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-2 rounded-lg transition-all',
        'text-neutral-400 hover:text-gold-400 hover:bg-gold-500/10',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
      title="Export to CSV"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </button>
  );
}

export function ChartSkeleton() {
  return (
    <div className="h-full flex items-end gap-2 animate-pulse">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-neutral-800 rounded-t"
          style={{ height: `${Math.random() * 60 + 20}%` }}
        />
      ))}
    </div>
  );
}
