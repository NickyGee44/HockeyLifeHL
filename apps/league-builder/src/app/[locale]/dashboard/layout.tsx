import * as React from 'react';
import { getCaptainTeams } from '@/lib/actions/captain';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch captain teams for the sidebar
  const captainTeamsResult = await getCaptainTeams();
  const captainTeams = captainTeamsResult.data || [];

  return (
    <div className="min-h-screen bg-neutral-950">
      <DashboardSidebar captainTeams={captainTeams} />

      {/* Main content */}
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out aurora-bg">
        {children}
      </main>
    </div>
  );
}
