'use client';

import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { FileText, Table, Loader2 } from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';
import type { DraftResults, DraftPick, DraftTeam } from './types';

interface DraftResultsExportProps {
  draftId: string;
  picks?: DraftPick[];
  teams?: DraftTeam[];
  supabase?: SupabaseClient;
}

const escapeCSV = (value: string | number | null | undefined): string => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function DraftResultsExport({ draftId, picks, teams, supabase: supabaseProp }: DraftResultsExportProps) {
  const [fallbackClient] = useState(() => supabaseProp ? null : createClient());
  const supabase = supabaseProp ?? fallbackClient!;
  const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null);

  /**
   * Attempt to fetch full results from the RPC. If it fails, fall back
   * to the picks/teams props that are already loaded in memory.
   */
  const fetchResults = async (): Promise<DraftResults> => {
    try {
      const { data, error } = await (supabase.rpc as any)('get_draft_results', {
        p_draft_id: draftId,
      });

      if (error) throw error;

      const results = data as DraftResults;
      if (!results?.picks) throw new Error('RPC returned no picks');

      return results;
    } catch {
      // Fallback: build DraftResults from the picks/teams props
      if (!picks || picks.length === 0) {
        throw new Error('No draft results available to export');
      }

      const teamMap = new Map((teams ?? []).map((t) => [t.id, t.name]));

      return {
        draft: {
          id: draftId,
          name: 'Draft Results',
          status: 'complete',
          draft_type: 'snake',
          total_rounds: Math.max(...picks.map((p) => p.round), 1),
          started_at: null,
          completed_at: picks[picks.length - 1]?.created_at ?? null,
        },
        picks: picks.map((p) => ({
          pick_number: p.pick_number,
          round: p.round,
          team_name: p.team_name ?? teamMap.get(p.team_id) ?? 'Unknown Team',
          player_name: p.player_name ?? 'Unknown',
          position: null,
          skill_level: null,
          auto_picked: p.auto_picked ?? false,
          pick_time_ms: p.pick_time_ms ?? null,
        })),
        teams: (teams ?? []).map((t) => ({
          team_id: t.id,
          team_name: t.name,
          total_picks: picks.filter((p) => p.team_id === t.id).length,
          roster_confirmed: false,
        })),
        trades: null,
      };
    }
  };

  const exportToCSV = async () => {
    setIsExporting('csv');
    try {
      const results = await fetchResults();

      // Create CSV content
      const headers = [
        'Pick #',
        'Round',
        'Team',
        'Player',
        'Position',
        'Skill Level',
        'Auto-Picked',
        'Pick Time (s)',
      ];

      const rows = results.picks.map((pick) => [
        pick.pick_number,
        pick.round,
        pick.team_name,
        pick.player_name,
        pick.position || '',
        pick.skill_level || '',
        pick.auto_picked ? 'Yes' : 'No',
        pick.pick_time_ms ? (pick.pick_time_ms / 1000).toFixed(1) : '',
      ]);

      const csvContent = [
        // Draft info header
        `Draft: ${escapeCSV(results.draft.name)}`,
        `Type: ${escapeCSV(results.draft.draft_type)}`,
        `Completed: ${results.draft.completed_at ? new Date(results.draft.completed_at).toLocaleString() : 'N/A'}`,
        '',
        // Column headers and data
        headers.map(escapeCSV).join(','),
        ...rows.map((row) => row.map(escapeCSV).join(',')),
      ].join('\n');

      // Download via Blob + anchor click
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `draft_results_${results.draft.name.replace(/\s+/g, '_')}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
    } finally {
      setIsExporting(null);
    }
  };

  const exportToPDF = async () => {
    setIsExporting('pdf');
    try {
      const results = await fetchResults();

      // Create printable HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${results.draft.name} - Draft Results</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1a1a1a; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #22D3EE; padding-bottom: 20px; }
            .header h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 8px; }
            .header p { color: #666; font-size: 14px; }
            .stats { display: flex; justify-content: center; gap: 40px; margin-bottom: 40px; }
            .stat { text-align: center; }
            .stat-value { font-size: 32px; font-weight: bold; color: #22D3EE; }
            .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { background: #22D3EE; color: #000; padding: 12px 8px; text-align: left; font-size: 12px; text-transform: uppercase; }
            td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
            tr:nth-child(even) { background: #f9f9f9; }
            .auto-pick { color: #f59e0b; font-size: 11px; }
            .team-section { margin-bottom: 30px; }
            .team-name { font-size: 18px; font-weight: bold; margin-bottom: 10px; padding: 8px; background: #f5f5f5; }
            .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #999; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${results.draft.name}</h1>
            <p>Draft Type: ${results.draft.draft_type} | Rounds: ${results.draft.total_rounds} | Completed: ${results.draft.completed_at ? new Date(results.draft.completed_at).toLocaleString() : 'N/A'}</p>
          </div>

          <div class="stats">
            <div class="stat">
              <div class="stat-value">${results.picks.length}</div>
              <div class="stat-label">Total Picks</div>
            </div>
            <div class="stat">
              <div class="stat-value">${results.teams.length}</div>
              <div class="stat-label">Teams</div>
            </div>
            <div class="stat">
              <div class="stat-value">${results.picks.filter((p) => p.auto_picked).length}</div>
              <div class="stat-label">Auto-Picks</div>
            </div>
          </div>

          <h2 style="margin-bottom: 16px; font-size: 18px;">All Picks</h2>
          <table>
            <thead>
              <tr>
                <th>Pick</th>
                <th>Round</th>
                <th>Team</th>
                <th>Player</th>
                <th>Position</th>
                <th>Skill</th>
              </tr>
            </thead>
            <tbody>
              ${results.picks
                .map(
                  (pick) => `
                <tr>
                  <td>${pick.pick_number}</td>
                  <td>${pick.round}</td>
                  <td>${pick.team_name}</td>
                  <td>${pick.player_name} ${pick.auto_picked ? '<span class="auto-pick">(Auto)</span>' : ''}</td>
                  <td>${pick.position || '-'}</td>
                  <td>${pick.skill_level || '-'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <h2 style="margin-bottom: 16px; font-size: 18px;">Rosters by Team</h2>
          ${results.teams
            .map(
              (team) => `
            <div class="team-section">
              <div class="team-name">${team.team_name} (${team.total_picks} picks)</div>
              <table>
                <thead>
                  <tr>
                    <th>Pick #</th>
                    <th>Round</th>
                    <th>Player</th>
                    <th>Position</th>
                    <th>Skill</th>
                  </tr>
                </thead>
                <tbody>
                  ${results.picks
                    .filter((p) => p.team_name === team.team_name)
                    .map(
                      (pick) => `
                    <tr>
                      <td>${pick.pick_number}</td>
                      <td>${pick.round}</td>
                      <td>${pick.player_name}</td>
                      <td>${pick.position || '-'}</td>
                      <td>${pick.skill_level || '-'}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
            )
            .join('')}

          ${
            results.trades && results.trades.length > 0
              ? `
            <h2 style="margin-bottom: 16px; font-size: 18px;">Trades</h2>
            <table>
              <thead>
                <tr>
                  <th>Round</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${results.trades
                  .map(
                    (trade) => `
                  <tr>
                    <td>Round ${trade.round}</td>
                    <td>${trade.from_team}</td>
                    <td>${trade.to_team}</td>
                    <td>${new Date(trade.traded_at).toLocaleString()}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          `
              : ''
          }

          <div class="footer">
            Generated by Beer League Hockey | ${new Date().toLocaleString()}
          </div>
        </body>
        </html>
      `;

      // Open print dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    } catch (err) {
      console.error('Error exporting PDF:', err);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportToCSV}
        disabled={isExporting !== null}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
          'border border-neutral-700 bg-neutral-800/50 text-neutral-300',
          'hover:border-neutral-600 hover:text-white',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        {isExporting === 'csv' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Table className="h-4 w-4" />
        )}
        CSV
      </button>

      <button
        onClick={exportToPDF}
        disabled={isExporting !== null}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
          'border border-neutral-700 bg-neutral-800/50 text-neutral-300',
          'hover:border-neutral-600 hover:text-white',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        {isExporting === 'pdf' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        PDF
      </button>
    </div>
  );
}
