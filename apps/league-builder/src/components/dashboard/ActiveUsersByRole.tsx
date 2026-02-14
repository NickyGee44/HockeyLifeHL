'use client';

import { cn } from '@hockey-life/ui';
import { formatNumber, exportToCSV } from '@/lib/dashboard';
import { useUserRoleCounts } from '@/lib/dashboard/use-dashboard';
import { DashboardCard, ExportButton } from './RevenueChart';

interface ActiveUsersByRoleProps {
  organizationId: string;
  className?: string;
}

/**
 * ActiveUsersByRole - User breakdown by role
 * Shows players, captains, scorekeepers, staff, admins
 */
export function ActiveUsersByRole({
  organizationId,
  className,
}: ActiveUsersByRoleProps) {
  const { data, isLoading, error } = useUserRoleCounts(organizationId);

  const handleExport = () => {
    if (data) {
      exportToCSV(
        [
          { role: 'Players', count: data.active_players },
          { role: 'Captains', count: data.captains },
          { role: 'Scorekeepers', count: data.scorekeepers },
          { role: 'Staff', count: data.staff_members },
          { role: 'Admins', count: data.admins },
          { role: 'Total', count: data.total_users },
        ],
        'user_roles',
        [
          { key: 'role', label: 'Role' },
          { key: 'count', label: 'Count' },
        ]
      );
    }
  };

  if (error) {
    return (
      <DashboardCard title="Active Users by Role" className={className}>
        <div className="h-64 flex items-center justify-center">
          <p className="text-red-400">Failed to load user data</p>
        </div>
      </DashboardCard>
    );
  }

  const roles = data
    ? [
        { label: 'Players', value: data.active_players, color: 'bg-blue-500', icon: PlayerIcon },
        { label: 'Captains', value: data.captains, color: 'bg-rink-500', icon: CaptainIcon },
        { label: 'Scorekeepers', value: data.scorekeepers, color: 'bg-emerald-500', icon: ScorekeeperIcon },
        { label: 'Staff', value: data.staff_members, color: 'bg-purple-500', icon: StaffIcon },
        { label: 'Admins', value: data.admins, color: 'bg-red-500', icon: AdminIcon },
      ]
    : [];

  const maxValue = Math.max(...roles.map((r) => r.value), 1);

  return (
    <DashboardCard
      title="Active Users by Role"
      className={className}
      actions={<ExportButton onClick={handleExport} disabled={isLoading || !data} />}
    >
      {isLoading ? (
        <RolesSkeleton />
      ) : (
        <div className="space-y-5">
          {/* Role Bars */}
          {roles.map((role) => (
            <div key={role.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <role.icon className={cn('w-4 h-4', role.color.replace('bg-', 'text-'))} />
                  <span className="text-sm font-medium text-neutral-300">{role.label}</span>
                </div>
                <span className="text-lg font-bold text-white">{formatNumber(role.value)}</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', role.color)}
                  style={{ width: `${(role.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}

          {/* Total Users */}
          <div className="pt-4 border-t border-neutral-800">
            <div className="bg-neutral-950/50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rink-500/20 rounded-lg">
                  <UsersIcon className="w-5 h-5 text-rink-500" />
                </div>
                <span className="text-sm font-medium text-neutral-400">Total Active Users</span>
              </div>
              <span className="text-2xl font-black text-white">
                {formatNumber(data?.total_users || 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

function RolesSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 bg-neutral-800 rounded w-24" />
            <div className="h-4 bg-neutral-800 rounded w-12" />
          </div>
          <div className="h-2 bg-neutral-800 rounded-full" />
        </div>
      ))}
      <div className="pt-4">
        <div className="h-16 bg-neutral-800 rounded-xl" />
      </div>
    </div>
  );
}

// Icon components
function PlayerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
    </svg>
  );
}

function CaptainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l3.09 6.26L22 12l-5 4.87 1.18 6.88L12 20.77l-6.18 2.98L7 16.87 2 12l6.91-.74L12 5z" />
    </svg>
  );
}

function ScorekeeperIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
    </svg>
  );
}

function StaffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function AdminIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}
