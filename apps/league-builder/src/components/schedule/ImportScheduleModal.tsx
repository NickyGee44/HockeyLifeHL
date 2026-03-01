'use client';

import { useState, useTransition, useRef } from 'react';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { importGamesFromCSV, type ScheduleImportRow } from '@/lib/actions/schedule-import';
import { parseCsvText, downloadCsv } from '@/lib/csv/parse';
import { Loader2, AlertCircle, Upload, FileText, Download, CheckCircle } from 'lucide-react';

interface ImportScheduleModalProps {
  leagueId: string;
  seasonId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TEMPLATE_CONTENT = [
  'date,time,home_team,away_team,venue,notes',
  '2026-10-01,19:00,Team A,Team B,Main Arena,',
  '2026-10-08,20:30,Team B,Team C,East Rink,',
].join('\n');

export function ImportScheduleModal({
  leagueId,
  seasonId,
  open,
  onOpenChange,
  onSuccess,
}: ImportScheduleModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ScheduleImportRow[]>([]);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCsvText(text);

        // Skip header row
        const hasHeader = rows[0]?.[0]?.toLowerCase().includes('date');
        const dataRows = hasHeader ? rows.slice(1) : rows;

        const parsed: ScheduleImportRow[] = [];
        for (const cells of dataRows) {
          if (cells.length < 4) continue;
          parsed.push({
            date: cells[0] ?? '',
            time: cells[1] ?? '',
            homeTeam: cells[2] ?? '',
            awayTeam: cells[3] ?? '',
            venue: cells[4] ?? '',
            notes: cells[5] ?? '',
          });
        }

        if (parsed.length === 0) {
          setError('No valid rows found. Check the file format.');
        } else {
          setParsedRows(parsed);
        }
      } catch {
        setError('Failed to parse file. Ensure it is a valid CSV.');
      }
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!parsedRows.length) return;
    setError(null);
    startTransition(async () => {
      const result = await importGamesFromCSV(leagueId, seasonId, parsedRows);
      if (result.success) {
        setImportResult(result.data);
        if (result.data.imported > 0) onSuccess();
      } else {
        setError(result.error);
      }
    });
  };

  const handleClose = () => {
    setParsedRows([]);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Schedule from CSV</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Upload a CSV file to bulk-import games. Team names must match existing teams exactly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {importResult && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-2">
                <CheckCircle className="w-5 h-5" />
                Import complete
              </div>
              <div className="text-sm text-neutral-300 space-y-1">
                <p>{importResult.imported} game{importResult.imported !== 1 ? 's' : ''} imported</p>
                {importResult.skipped > 0 && (
                  <p className="text-yellow-400">{importResult.skipped} row{importResult.skipped !== 1 ? 's' : ''} skipped</p>
                )}
                {importResult.errors.length > 0 && (
                  <div className="mt-2 text-red-400">
                    <p className="font-medium">Errors:</p>
                    <ul className="list-disc list-inside text-xs mt-1">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>...and {importResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {!importResult && (
            <>
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                  'border-white/10 hover:border-rink-500/50 hover:bg-rink-500/5'
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-10 h-10 text-neutral-500 mx-auto mb-3" />
                <p className="text-neutral-300 font-medium mb-1">Click to upload CSV</p>
                <p className="text-sm text-neutral-500">
                  Columns: date, time, home_team, away_team, venue, notes
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadCsv('schedule_template.csv', TEMPLATE_CONTENT)}
                className="w-full border-white/10 text-neutral-300 hover:bg-neutral-800"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>

              {parsedRows.length > 0 && (
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <div className="bg-neutral-800 px-4 py-2 flex items-center gap-2 border-b border-white/10">
                    <FileText className="w-4 h-4 text-neutral-400" />
                    <span className="text-sm font-medium text-white">
                      Preview — {parsedRows.length} game{parsedRows.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-800/50">
                        <tr>
                          <th className="px-3 py-2 text-left text-neutral-400 font-medium">Date</th>
                          <th className="px-3 py-2 text-left text-neutral-400 font-medium">Time</th>
                          <th className="px-3 py-2 text-left text-neutral-400 font-medium">Home</th>
                          <th className="px-3 py-2 text-left text-neutral-400 font-medium">Away</th>
                          <th className="px-3 py-2 text-left text-neutral-400 font-medium">Venue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-t border-white/5">
                            <td className="px-3 py-2 text-neutral-300">{row.date}</td>
                            <td className="px-3 py-2 text-neutral-300">{row.time}</td>
                            <td className="px-3 py-2 text-neutral-300 truncate max-w-[100px]">{row.homeTeam}</td>
                            <td className="px-3 py-2 text-neutral-300 truncate max-w-[100px]">{row.awayTeam}</td>
                            <td className="px-3 py-2 text-neutral-400 truncate max-w-[80px]">{row.venue || '—'}</td>
                          </tr>
                        ))}
                        {parsedRows.length > 10 && (
                          <tr className="border-t border-white/5">
                            <td colSpan={5} className="px-3 py-2 text-center text-neutral-500">
                              ...and {parsedRows.length - 10} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="border-white/10 text-neutral-300 hover:bg-neutral-800"
          >
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          {!importResult && (
            <Button
              type="button"
              onClick={handleImport}
              disabled={isPending || parsedRows.length === 0}
              className={cn(
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold',
                'hover:shadow-lg hover:shadow-rink-500/20'
              )}
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import {parsedRows.length > 0 ? `${parsedRows.length} Game${parsedRows.length !== 1 ? 's' : ''}` : 'Games'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
