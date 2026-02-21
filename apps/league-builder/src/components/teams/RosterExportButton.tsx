'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportTeamRoster, exportLeagueRosters } from '@/lib/actions/roster-export';
import { buildRosterCsv } from '@/lib/roster/csv';

interface RosterExportButtonProps {
  teamId?: string;
  leagueId?: string;
  seasonId?: string;
  label?: string;
}

/**
 * Export button that downloads a CSV of player contacts (name, email, phone).
 * Pass teamId for single team export, or leagueId for all teams.
 */
export function RosterExportButton({
  teamId,
  leagueId,
  seasonId,
  label = 'Export Contacts',
}: RosterExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      let rows: Array<{
        jerseyNumber: number | null;
        fullName: string;
        email: string;
        phone: string | null;
        position: string;
        leadershipRole: string | null;
        status: string;
        teamName: string;
      }>;
      let filename: string;

      if (teamId) {
        const result = await exportTeamRoster(teamId, seasonId);
        rows = result.rows;
        const safeName = result.teamName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        filename = `roster-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`;
      } else if (leagueId) {
        const result = await exportLeagueRosters(leagueId, seasonId);
        rows = result.rows;
        const safeName = result.leagueName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        filename = `all-rosters-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`;
      } else {
        return;
      }

      if (rows.length === 0) {
        alert('No players found to export.');
        return;
      }

      const csv = buildRosterCsv(rows, !!leagueId);

      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      aria-busy={isExporting}
      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 disabled:opacity-50 transition-colors"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {label}
    </button>
  );
}
