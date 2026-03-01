'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportPlayerStatsCSV, exportGoalieStatsCSV } from '@/lib/actions/stats-export';

interface StatsExportButtonProps {
  leagueId: string;
  seasonId: string;
  seasonName: string;
}

export function StatsExportButton({ leagueId, seasonId, seasonName }: StatsExportButtonProps) {
  const [loadingSkater, setLoadingSkater] = useState(false);
  const [loadingGoalie, setLoadingGoalie] = useState(false);

  function triggerDownload(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSkaterExport() {
    setLoadingSkater(true);
    try {
      const result = await exportPlayerStatsCSV(leagueId, seasonId, seasonName);
      if (result.success) {
        triggerDownload(result.data, `skater-stats-${seasonId}.csv`);
      }
    } finally {
      setLoadingSkater(false);
    }
  }

  async function handleGoalieExport() {
    setLoadingGoalie(true);
    try {
      const result = await exportGoalieStatsCSV(leagueId, seasonId, seasonName);
      if (result.success) {
        triggerDownload(result.data, `goalie-stats-${seasonId}.csv`);
      }
    } finally {
      setLoadingGoalie(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSkaterExport}
        disabled={loadingSkater}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors disabled:opacity-50"
      >
        {loadingSkater ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        Skaters
      </button>
      <button
        onClick={handleGoalieExport}
        disabled={loadingGoalie}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors disabled:opacity-50"
      >
        {loadingGoalie ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        Goalies
      </button>
    </div>
  );
}
