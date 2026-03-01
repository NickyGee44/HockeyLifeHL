'use client';

import { useState, useTransition, useRef } from 'react';
import { useTranslations } from 'next-intl';
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
import { importTeamsFromCSV, type TeamImportRow } from '@/lib/actions/team-import';
import { parseCsvText, downloadCsv } from '@/lib/csv/parse';
import { Loader2, AlertCircle, Upload, FileText, Download, CheckCircle } from 'lucide-react';

interface ImportTeamsModalProps {
  leagueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TEMPLATE_CONTENT = [
  'team_name,division,color,captain_email',
  'Thunderhawks,AA,#1a56db,coach@example.com',
  'Blizzards,A,#e3342f,',
  'Bruisers,BB,,',
].join('\n');

export function ImportTeamsModal({
  leagueId,
  open,
  onOpenChange,
  onSuccess,
}: ImportTeamsModalProps) {
  const t = useTranslations('teams');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<TeamImportRow[]>([]);
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

        const hasHeader = rows[0]?.[0]?.toLowerCase().includes('team');
        const dataRows = hasHeader ? rows.slice(1) : rows;

        const parsed: TeamImportRow[] = [];
        for (const cells of dataRows) {
          if (!cells[0]?.trim()) continue;
          parsed.push({
            teamName: cells[0] ?? '',
            division: cells[1] ?? '',
            color: cells[2] ?? '',
            captainEmail: cells[3] ?? '',
          });
        }

        if (parsed.length === 0) {
          setError(t('import.noValidRows'));
        } else {
          setParsedRows(parsed);
        }
      } catch {
        setError(t('import.parseError'));
      }
    };
    reader.onerror = () => setError(t('import.readError'));
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!parsedRows.length) return;
    setError(null);
    startTransition(async () => {
      const result = await importTeamsFromCSV(leagueId, parsedRows);
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
          <DialogTitle>{t('import.title')}</DialogTitle>
          <DialogDescription className="text-neutral-400">
            {t('import.description')}
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
                {t('import.importComplete')}
              </div>
              <div className="text-sm text-neutral-300 space-y-1">
                <p>{importResult.imported} {t('import.teamsCreated')}</p>
                {importResult.skipped > 0 && (
                  <p className="text-yellow-400">{importResult.skipped} {t('import.rowsSkipped')}</p>
                )}
                {importResult.errors.length > 0 && (
                  <div className="mt-2 text-red-400">
                    <p className="font-medium">{t('import.errors')}</p>
                    <ul className="list-disc list-inside text-xs mt-1">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>{t('import.andMore', { count: importResult.errors.length - 5 })}</li>
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
                <p className="text-neutral-300 font-medium mb-1">{t('import.clickToUpload')}</p>
                <p className="text-sm text-neutral-500">
                  {t('import.columns')}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadCsv('teams_template.csv', TEMPLATE_CONTENT)}
                className="w-full border-white/10 text-neutral-300 hover:bg-neutral-800"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('import.downloadTemplate')}
              </Button>

              {parsedRows.length > 0 && (
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <div className="bg-neutral-800 px-4 py-2 flex items-center gap-2 border-b border-white/10">
                    <FileText className="w-4 h-4 text-neutral-400" />
                    <span className="text-sm font-medium text-white">
                      {t('import.previewTitle', { count: parsedRows.length })}
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-800/50">
                        <tr>
                          <th className="px-3 py-2 text-left text-neutral-400 font-medium">{t('import.teamHeader')}</th>
                          <th className="px-3 py-2 text-left text-neutral-400 font-medium">{t('import.divisionHeader')}</th>
                          <th className="px-3 py-2 text-left text-neutral-400 font-medium">{t('import.colorHeader')}</th>
                          <th className="px-3 py-2 text-left text-neutral-400 font-medium">{t('import.captainHeader')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-t border-white/5">
                            <td className="px-3 py-2 text-neutral-300 font-medium">{row.teamName}</td>
                            <td className="px-3 py-2 text-neutral-400">{row.division || '—'}</td>
                            <td className="px-3 py-2">
                              {row.color ? (
                                <span className="flex items-center gap-2">
                                  <span
                                    className="w-4 h-4 rounded-sm inline-block border border-white/20"
                                    style={{ backgroundColor: row.color }}
                                  />
                                  <span className="text-neutral-400 text-xs">{row.color}</span>
                                </span>
                              ) : (
                                <span className="text-neutral-500">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-neutral-400 truncate max-w-[120px]">
                              {row.captainEmail || '—'}
                            </td>
                          </tr>
                        ))}
                        {parsedRows.length > 10 && (
                          <tr className="border-t border-white/5">
                            <td colSpan={4} className="px-3 py-2 text-center text-neutral-500">
                              {t('import.andMore', { count: parsedRows.length - 10 })}
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
            {importResult ? t('import.close') : t('import.cancel')}
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
              {t('import.importButton', { count: parsedRows.length })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
