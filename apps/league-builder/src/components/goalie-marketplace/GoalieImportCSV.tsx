'use client';

import { useState } from 'react';
import { Upload, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { addGoalieToPool } from '@/lib/actions/goalie-marketplace';
import { Button } from '@/components/ui/button';
import { parseCsvText, downloadCsv } from '@/lib/csv/parse';

interface GoalieImportCSVProps {
  leagueId: string;
  onImported: () => void;
}

export function GoalieImportCSV({ leagueId, onImported }: GoalieImportCSVProps) {
  const [loading, setLoading] = useState(false);

  const handleDownloadTemplate = () => {
    downloadCsv(
      'goalies_template.csv',
      [
        'name,email,phone,skill_level,rate_per_game',
        'Jordan Smith,jordan@example.com,555-1000,intermediate,45',
        'Casey Lee,casey@example.com,555-1001,advanced,55',
      ].join('\n')
    );
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    const text = await file.text();
    const rows = parseCsvText(text);
    const [headerRow, ...dataRows] = rows;
    const headers = (headerRow ?? []).map((h) => h.trim().toLowerCase());

    const idxName = headers.indexOf('name');
    const idxEmail = headers.indexOf('email');
    const idxPhone = headers.indexOf('phone');
    const idxSkill = headers.indexOf('skill_level');
    const idxRate = headers.indexOf('rate_per_game');

    if (idxName < 0 || idxEmail < 0) {
      toast.error('CSV must include name,email columns');
      setLoading(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    for (const cols of dataRows) {
      if (cols.length === 0 || cols.every((value) => !value?.trim())) {
        continue;
      }

      const result = await addGoalieToPool(leagueId, {
        name: cols[idxName]?.trim() ?? '',
        email: cols[idxEmail]?.trim() ?? '',
        phone: idxPhone >= 0 ? cols[idxPhone] : undefined,
        skill_level: (idxSkill >= 0 ? cols[idxSkill] : 'intermediate') as 'beginner' | 'intermediate' | 'advanced' | 'expert',
        rate_per_game: idxRate >= 0 ? Number(cols[idxRate] || '0') : 0,
        registered_via: 'import',
      });
      if (result.success) {
        successCount += 1;
      } else {
        errorCount += 1;
      }
    }

    if (successCount > 0) {
      toast.success(`Imported ${successCount} goalies${errorCount > 0 ? ` (${errorCount} skipped)` : ''}`);
      onImported();
    } else {
      toast.error(errorCount > 0 ? 'No goalies were imported. Check your CSV rows and permissions.' : 'No valid goalie rows found.');
    }
    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-white">Import CSV</h4>
          <p className="text-xs text-neutral-400">Columns: name,email,phone,skill_level,rate_per_game</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-2" /> Template
          </Button>
          <label>
            <input
              type="file"
              className="hidden"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button type="button" variant="outline" className="cursor-pointer" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} Upload CSV
            </Button>
          </label>
        </div>
      </div>
    </div>
  );
}
