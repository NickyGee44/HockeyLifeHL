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
import { importPlayersFromCSV, type PlayerImportRow } from '@/lib/actions/player-import';
import { parseCsvText, downloadCsv } from '@/lib/csv/parse';
import { Loader2, AlertCircle, Upload, FileText, Download, CheckCircle } from 'lucide-react';

interface ImportPlayersModalProps {
  leagueId: string;
  seasonId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TEMPLATE_CONTENT = [
  'first_name,last_name,email,phone,position,jersey_number',
  'John,Smith,john@example.com,555-0100,Forward,12',
  'Jane,Doe,jane@example.com,,Defense,4',
  'Mike,Johnson,mike@example.com,555-0102,Goalie,30',
].join('\n');

export function ImportPlayersModal({
  leagueId,
  seasonId,
  open,
  onOpenChange,
  onSuccess,
}: ImportPlayersModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<PlayerImportRow[]>([]);
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

        const hasHeader =
          rows[0]?.[0]?.toLowerCase().includes('first') ||
          rows[0]?.[0]?.toLowerCase().includes('name');
        const dataRows = hasHeader ? rows.slice(1) : rows;

        const parsed: PlayerImportRow[] = [];
        for (const cells of dataRows) {
          if (cells.length < 2) continue;
          parsed.push({
            firstName: cells[0] ?? '',
            lastName: cells[1] ?? '',
            email: cells[2] ?? '',
            phone: cells[3] ?? '',
            position: cells[4] ?? '',
            jerseyNumber: cells[5] ?? '',
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
      const result = await importPlayersFromCSV(leagueId, seasonId, parsedRows);
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
          <DialogTitle>Import Players from CSV</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Bulk-add players to this season. Players without existing accounts will be created as pending profiles — they can sign up with their email to activate.
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
                <p>{importResult.imported} player{importResult.imported !== 1 ? 's' : ''} imported</p>
                {importResult.skipped > 0 && (
                  <p className="text-yellow-400">{importResult.skipped} skipped (already registered)</p>
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
                  Columns: first_name, last_name, email, phone, position, jersey_number
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadCsv('players_template.csv', TEMPLATE_CONTENT)}
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
                      Preview — {parsedRows.length} player{parsedRows.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-800/50">
                        <tr>
                          <th className="px-3 py-2 text-left text-neutral-400 font-medium">Name</th>
                          <th className="px-3 py-2 text-left text-neutral-400 font-medium">Email</th>
                          <th className="px-3 py-2 text-left text-neutral-400 font-medium">Position</th>
                          <th className="px-3 py-2 text-left text-neutral-400 font-medium">#</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-t border-white/5">
                            <td className="px-3 py-2 text-neutral-300">
                              {[row.firstName, row.lastName].filter(Boolean).join(' ')}
                            </td>
                            <td className="px-3 py-2 text-neutral-400 truncate max-w-[140px]">{row.email}</td>
                            <td className="px-3 py-2 text-neutral-400">{row.position || '—'}</td>
                            <td className="px-3 py-2 text-neutral-400">{row.jerseyNumber || '—'}</td>
                          </tr>
                        ))}
                        {parsedRows.length > 10 && (
                          <tr className="border-t border-white/5">
                            <td colSpan={4} className="px-3 py-2 text-center text-neutral-500">
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
              Import {parsedRows.length > 0 ? `${parsedRows.length} Player${parsedRows.length !== 1 ? 's' : ''}` : 'Players'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
