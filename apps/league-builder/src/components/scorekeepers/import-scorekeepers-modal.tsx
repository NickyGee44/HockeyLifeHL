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
import { importScorekepersFromCSV } from '@/lib/actions/scorekeeper-management';
import { Loader2, AlertCircle, Upload, FileText, Download, CheckCircle } from 'lucide-react';

interface ImportScorekepersModalProps {
  leagueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  email: string;
  name: string;
  hourlyRate?: number;
}

export function ImportScorekepersModal({
  leagueId,
  open,
  onOpenChange,
  onSuccess,
}: ImportScorekepersModalProps) {
  const t = useTranslations('scorekeepers.importModal');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
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
        const lines = text.split('\n').filter(line => line.trim());

        // Skip header row if it exists
        const hasHeader = lines[0]?.toLowerCase().includes('email') ||
                          lines[0]?.toLowerCase().includes('name');
        const dataLines = hasHeader ? lines.slice(1) : lines;

        const parsed: ParsedRow[] = [];
        for (const line of dataLines) {
          // Handle both comma and tab delimited
          const parts = line.includes('\t')
            ? line.split('\t')
            : line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));

          if (parts.length >= 2) {
            const email = parts[0]?.trim();
            const name = parts[1]?.trim();
            const hourlyRate = parts[2] ? parseFloat(parts[2]) : undefined;

            if (email && name) {
              parsed.push({
                email,
                name,
                hourlyRate: isNaN(hourlyRate as number) ? undefined : hourlyRate,
              });
            }
          }
        }

        if (parsed.length === 0) {
          setError(t('noValidData'));
        } else {
          setParsedData(parsed);
        }
      } catch {
        setError(t('failedToParse'));
      }
    };

    reader.onerror = () => {
      setError(t('failedToRead'));
    };

    reader.readAsText(file);
  };

  const handleImport = () => {
    if (parsedData.length === 0) return;

    setError(null);
    startTransition(async () => {
      const result = await importScorekepersFromCSV({
        leagueId,
        csvData: parsedData,
      });

      if (result.success) {
        setImportResult(result.data);
        if (result.data.imported > 0) {
          onSuccess();
        }
      } else {
        setError(result.error);
      }
    });
  };

  const handleDownloadTemplate = () => {
    const template = 'email,name,hourlyRate\njohn@example.com,John Smith,25.00\njane@example.com,Jane Doe,30.00';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scorekeepers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setParsedData([]);
    setImportResult(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className="text-neutral-400">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {importResult && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 text-green-500 font-medium mb-2">
                <CheckCircle className="w-5 h-5" />
                {t('importComplete')}
              </div>
              <div className="text-sm text-neutral-300 space-y-1">
                <p>{t('importedSuccessfully', { count: importResult.imported })}</p>
                {importResult.skipped > 0 && (
                  <p className="text-yellow-500">{t('skipped', { count: importResult.skipped })}</p>
                )}
                {importResult.errors.length > 0 && (
                  <div className="mt-2 text-red-400">
                    <p className="font-medium">{t('errors')}</p>
                    <ul className="list-disc list-inside text-xs">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>{t('andMoreErrors', { count: importResult.errors.length - 5 })}</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {!importResult && (
            <>
              {/* Upload area */}
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
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-10 h-10 text-neutral-500 mx-auto mb-3" />
                <p className="text-neutral-300 font-medium mb-1">
                  {t('clickToUpload')}
                </p>
                <p className="text-sm text-neutral-500">
                  {t('csvFormat')}
                </p>
              </div>

              {/* Template download */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="w-full border-white/10 text-neutral-300 hover:bg-neutral-800"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('downloadTemplate')}
              </Button>

              {/* Preview */}
              {parsedData.length > 0 && (
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <div className="bg-neutral-800 px-4 py-2 flex items-center gap-2 border-b border-white/10">
                    <FileText className="w-4 h-4 text-neutral-400" />
                    <span className="text-sm font-medium text-white">
                      {t('preview', { count: parsedData.length })}
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-800/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-neutral-400 font-medium">{t('emailHeader')}</th>
                          <th className="px-4 py-2 text-left text-neutral-400 font-medium">{t('nameHeader')}</th>
                          <th className="px-4 py-2 text-left text-neutral-400 font-medium">{t('rateHeader')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-t border-white/5">
                            <td className="px-4 py-2 text-neutral-300">{row.email}</td>
                            <td className="px-4 py-2 text-neutral-300">{row.name}</td>
                            <td className="px-4 py-2 text-neutral-300">
                              {row.hourlyRate ? `$${row.hourlyRate}` : '-'}
                            </td>
                          </tr>
                        ))}
                        {parsedData.length > 10 && (
                          <tr className="border-t border-white/5">
                            <td colSpan={3} className="px-4 py-2 text-center text-neutral-500">
                              {t('andMoreRows', { count: parsedData.length - 10 })}
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
            {importResult ? t('close') : t('cancel')}
          </Button>
          {!importResult && (
            <Button
              type="button"
              onClick={handleImport}
              disabled={isPending || parsedData.length === 0}
              className={cn(
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold',
                'hover:shadow-lg hover:shadow-rink-500/20'
              )}
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('importCount', { count: parsedData.length })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
