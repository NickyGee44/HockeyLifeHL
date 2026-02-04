'use client';

import { useMemo } from 'react';
import { cn } from '@hockey-life/ui';
import { DateRange, formatPercent, formatNumber, exportToCSV } from '@/lib/dashboard';
import { useRegistrationFunnel } from '@/lib/dashboard/use-dashboard';
import { DashboardCard, ExportButton } from './RevenueChart';

interface RegistrationFunnelProps {
  organizationId: string;
  dateRange: DateRange;
  className?: string;
}

/**
 * RegistrationFunnel - Player registration funnel visualization
 * Shows signup → roster → payment conversion
 */
export function RegistrationFunnel({
  organizationId,
  dateRange,
  className,
}: RegistrationFunnelProps) {
  const { data, isLoading, error } = useRegistrationFunnel(organizationId, dateRange);

  const summary = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalSignups: 0,
        rosterAssigned: 0,
        paidRegistrations: 0,
        signupToRosterRate: 0,
        rosterToPaidRate: 0,
        overallConversion: 0,
      };
    }

    const totalSignups = data.reduce((sum, d) => sum + d.total_signups, 0);
    const rosterAssigned = data.reduce((sum, d) => sum + d.roster_assigned, 0);
    const paidRegistrations = data.reduce((sum, d) => sum + d.paid_registrations, 0);

    return {
      totalSignups,
      rosterAssigned,
      paidRegistrations,
      signupToRosterRate: totalSignups > 0 ? (rosterAssigned / totalSignups) * 100 : 0,
      rosterToPaidRate: rosterAssigned > 0 ? (paidRegistrations / rosterAssigned) * 100 : 0,
      overallConversion: totalSignups > 0 ? (paidRegistrations / totalSignups) * 100 : 0,
    };
  }, [data]);

  const handleExport = () => {
    if (data) {
      exportToCSV(data as unknown as Record<string, unknown>[], 'registration_funnel', [
        { key: 'signup_date', label: 'Date' },
        { key: 'total_signups', label: 'Signups' },
        { key: 'roster_assigned', label: 'Roster Assigned' },
        { key: 'paid_registrations', label: 'Paid' },
        { key: 'signup_to_roster_rate', label: 'Signup→Roster (%)' },
        { key: 'roster_to_paid_rate', label: 'Roster→Paid (%)' },
      ]);
    }
  };

  if (error) {
    return (
      <DashboardCard title="Registration Funnel" className={className}>
        <div className="h-64 flex items-center justify-center">
          <p className="text-red-400">Failed to load funnel data</p>
        </div>
      </DashboardCard>
    );
  }

  const funnelStages = [
    {
      label: 'Signups',
      value: summary.totalSignups,
      percentage: 100,
      color: 'bg-blue-500',
    },
    {
      label: 'Roster Assigned',
      value: summary.rosterAssigned,
      percentage: summary.signupToRosterRate,
      color: 'bg-rink-500',
    },
    {
      label: 'Paid',
      value: summary.paidRegistrations,
      percentage: summary.overallConversion,
      color: 'bg-emerald-500',
    },
  ];

  return (
    <DashboardCard
      title="Registration Funnel"
      className={className}
      actions={<ExportButton onClick={handleExport} disabled={isLoading || !data?.length} />}
    >
      {isLoading ? (
        <FunnelSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Funnel Visualization */}
          <div className="space-y-4">
            {funnelStages.map((stage, index) => (
              <div key={stage.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                    <span className="text-sm font-medium text-white">{stage.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-white">{formatNumber(stage.value)}</span>
                    {index > 0 && (
                      <span className="text-sm text-neutral-400 ml-2">
                        ({formatPercent(stage.percentage)})
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-3 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', stage.color)}
                    style={{ width: `${stage.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Conversion Rates */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-800">
            <ConversionMetric
              label="Signup → Roster"
              value={summary.signupToRosterRate}
              isGood={summary.signupToRosterRate >= 70}
            />
            <ConversionMetric
              label="Roster → Paid"
              value={summary.rosterToPaidRate}
              isGood={summary.rosterToPaidRate >= 80}
            />
          </div>

          {/* Overall Conversion */}
          <div className="bg-neutral-950/50 rounded-xl p-4 text-center">
            <p className="text-xs text-neutral-500 mb-1 uppercase tracking-wider">
              Overall Conversion
            </p>
            <p
              className={cn(
                'text-3xl font-black',
                summary.overallConversion >= 50
                  ? 'text-emerald-400'
                  : summary.overallConversion >= 30
                  ? 'text-amber-400'
                  : 'text-red-400'
              )}
            >
              {formatPercent(summary.overallConversion)}
            </p>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

function ConversionMetric({
  label,
  value,
  isGood,
}: {
  label: string;
  value: number;
  isGood: boolean;
}) {
  return (
    <div className="bg-neutral-950/50 rounded-xl p-3 text-center">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className={cn('text-xl font-bold', isGood ? 'text-emerald-400' : 'text-amber-400')}>
        {formatPercent(value)}
      </p>
    </div>
  );
}

function FunnelSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 bg-neutral-800 rounded w-24" />
            <div className="h-4 bg-neutral-800 rounded w-16" />
          </div>
          <div className="h-3 bg-neutral-800 rounded-full" />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-4 pt-4">
        <div className="h-16 bg-neutral-800 rounded-xl" />
        <div className="h-16 bg-neutral-800 rounded-xl" />
      </div>
    </div>
  );
}
