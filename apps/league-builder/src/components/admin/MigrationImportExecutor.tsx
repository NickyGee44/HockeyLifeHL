'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@hockey-life/ui';
import {
  previewMigrationImport,
  executeMigrationImport,
  getLeagueSeasonsForMigration,
  type MigrationImportPreviewResult,
  type MigrationImportResult,
} from '@/lib/actions/migration-import-executor';
import type { PlatformMigrationQueueRequest } from '@/lib/actions/platform-migration-admin';
import { MIGRATION_TARGET_ENTITY_META } from '@/lib/migration/import-mapping';
import type { MigrationTargetEntity } from '@/lib/migration/requests';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Eye,
  Loader2,
  Play,
  Table2,
  XCircle,
} from 'lucide-react';

type Props = {
  request: PlatformMigrationQueueRequest;
  onImportComplete: () => void;
};

type SeasonOption = {
  id: string;
  name: string;
};

const ENTITIES_NEEDING_SEASON: MigrationTargetEntity[] = [
  'players',
  'schedule_games',
  'stats',
];

export function MigrationImportExecutor({ request, onImportComplete }: Props) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [seasonsLoaded, setSeasonsLoaded] = useState(false);
  const [preview, setPreview] = useState<MigrationImportPreviewResult | null>(null);
  const [importResult, setImportResult] = useState<MigrationImportResult | null>(null);
  const [isPreviewing, startPreviewTransition] = useTransition();
  const [isExecuting, startExecuteTransition] = useTransition();

  const readyAssets = request.uploaded_assets.filter((asset) => {
    const mapping = request.normalization_profile?.import_mappings.find(
      (m) => m.asset_id === asset.id
    );
    return mapping?.ready_for_import;
  });

  const importResults: MigrationImportResult[] =
    (request.normalization_profile as any)?.import_results ?? [];

  if (readyAssets.length === 0 && importResults.length === 0) {
    return null;
  }

  function getMapping(assetId: string) {
    return request.normalization_profile?.import_mappings.find(
      (m) => m.asset_id === assetId
    );
  }

  function needsSeason(assetId: string) {
    const mapping = getMapping(assetId);
    return mapping?.target_entity
      ? ENTITIES_NEEDING_SEASON.includes(mapping.target_entity)
      : false;
  }

  async function loadSeasons() {
    if (seasonsLoaded) return;
    try {
      const result = await getLeagueSeasonsForMigration(request.league_id);
      if (result.success) {
        setSeasons(result.data);
      }
    } catch {
      // silent — season picker will just be empty
    }
    setSeasonsLoaded(true);
  }

  function handlePreview(assetId: string) {
    setSelectedAssetId(assetId);
    setPreview(null);
    setImportResult(null);

    if (needsSeason(assetId)) {
      loadSeasons();
    }

    startPreviewTransition(async () => {
      const result = await previewMigrationImport({
        requestId: request.id,
        leagueId: request.league_id,
        assetId,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setPreview(result.data);
    });
  }

  function handleExecute() {
    if (!selectedAssetId) return;

    if (needsSeason(selectedAssetId) && !selectedSeasonId) {
      toast.error('Select a season before importing.');
      return;
    }

    startExecuteTransition(async () => {
      const result = await executeMigrationImport({
        requestId: request.id,
        leagueId: request.league_id,
        assetId: selectedAssetId,
        seasonId: selectedSeasonId || undefined,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setImportResult(result.data);
      toast.success(
        `Import complete: ${result.data.imported} imported, ${result.data.skipped} skipped`
      );
      onImportComplete();
    });
  }

  return (
    <div className="rounded-[24px] border border-violet-400/15 bg-violet-400/[0.04] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-100/80">
            Import execution
          </p>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-white">
            Run imports into BLH
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-300">
            Preview mapped data from each file, then execute the import to write rows directly into the league&apos;s database tables.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-300">
          <span className="font-semibold text-white">{readyAssets.length}</span> file
          {readyAssets.length === 1 ? '' : 's'} ready to import
        </div>
      </div>

      {/* Previously completed imports */}
      {importResults.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Previous imports
          </p>
          {importResults.map((result) => (
            <div
              key={`${result.assetId}-${result.completedAt}`}
              className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                  <span className="text-sm font-semibold text-white">{result.assetName}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-neutral-300">
                    {MIGRATION_TARGET_ENTITY_META[result.targetEntity]?.label ?? result.targetEntity}
                  </span>
                </div>
                <span className="text-xs text-neutral-400">
                  {new Date(result.completedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-300">
                {result.imported} imported, {result.skipped} skipped
                {result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Ready-to-import assets */}
      {readyAssets.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Ready to import
          </p>
          {readyAssets.map((asset) => {
            const mapping = getMapping(asset.id)!;
            const isSelected = selectedAssetId === asset.id;
            const alreadyImported = importResults.some((r) => r.assetId === asset.id);

            return (
              <div
                key={asset.id}
                className={cn(
                  'rounded-[22px] border p-5 transition-[border-color,background-color]',
                  isSelected
                    ? 'border-violet-300/30 bg-violet-400/10'
                    : 'border-white/10 bg-black/20'
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-neutral-300">
                        {asset.analysis.source_format.replace(/_/g, ' ')}
                      </span>
                      <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-[11px] font-semibold text-violet-100">
                        {MIGRATION_TARGET_ENTITY_META[mapping.target_entity!]?.label ?? mapping.target_entity}
                      </span>
                      {alreadyImported && (
                        <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                          Previously imported
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-lg font-bold text-white">{asset.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePreview(asset.id)}
                    disabled={isPreviewing}
                    className="inline-flex items-center gap-2 rounded-2xl border border-violet-300/30 bg-violet-400/10 px-4 py-3 text-sm font-semibold text-violet-100 transition-[border-color,background-color,color,transform] hover:-translate-y-0.5 hover:border-violet-200/40 hover:bg-violet-400/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {isPreviewing && selectedAssetId === asset.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    Preview
                  </button>
                </div>

                {/* Preview section */}
                {isSelected && preview && (
                  <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
                    <div className="grid gap-3 md:grid-cols-3">
                      <PreviewStat
                        icon={<Table2 className="h-4 w-4" />}
                        label="Total rows"
                        value={preview.totalRowCount.toLocaleString()}
                      />
                      <PreviewStat
                        icon={<Database className="h-4 w-4" />}
                        label="Mapped fields"
                        value={`${preview.mappedFieldCount}`}
                      />
                      <PreviewStat
                        icon={<Database className="h-4 w-4" />}
                        label="Target"
                        value={MIGRATION_TARGET_ENTITY_META[preview.targetEntity]?.label ?? preview.targetEntity}
                      />
                    </div>

                    {preview.errors.length > 0 && (
                      <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
                        <div className="flex items-center gap-2 text-amber-100">
                          <AlertTriangle className="h-4 w-4" />
                          <p className="text-sm font-semibold">Preview warnings</p>
                        </div>
                        <ul className="mt-2 space-y-1 text-sm text-amber-50/90">
                          {preview.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Sample data table */}
                    {preview.sampleRows.length > 0 && (
                      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                                Row
                              </th>
                              {Object.keys(preview.sampleRows[0].mapped).map((field) => (
                                <th
                                  key={field}
                                  className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500"
                                >
                                  {field}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {preview.sampleRows.slice(0, 10).map((row) => (
                              <tr
                                key={row.rowNumber}
                                className="border-b border-white/5"
                              >
                                <td className="px-3 py-2 font-mono text-neutral-500">
                                  {row.rowNumber}
                                </td>
                                {Object.values(row.mapped).map((value, i) => (
                                  <td
                                    key={i}
                                    className="max-w-[200px] truncate px-3 py-2 text-neutral-300"
                                  >
                                    {value || '—'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {preview.sampleRows.length > 10 && (
                          <p className="border-t border-white/10 px-3 py-2 text-xs text-neutral-500">
                            Showing first 10 of {preview.sampleRows.length} preview rows
                          </p>
                        )}
                      </div>
                    )}

                    {/* Season picker for entities that need it */}
                    {needsSeason(asset.id) && (
                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-white">
                          Target season
                        </span>
                        <select
                          value={selectedSeasonId}
                          onChange={(e) => setSelectedSeasonId(e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white outline-none transition-colors focus:border-violet-300/35"
                        >
                          <option value="">Select a season</option>
                          {seasons.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {/* Execute button */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                      <div className="text-sm text-neutral-400">
                        {preview.totalRowCount.toLocaleString()} rows will be imported into{' '}
                        <span className="font-semibold text-white">
                          {request.league_name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleExecute}
                        disabled={isExecuting}
                        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition-[border-color,background-color,color,transform] hover:-translate-y-0.5 hover:border-emerald-200/40 hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                      >
                        {isExecuting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        Execute import
                      </button>
                    </div>
                  </div>
                )}

                {/* Import result */}
                {isSelected && importResult && (
                  <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
                    <div
                      className={cn(
                        'rounded-2xl border p-4',
                        importResult.errors.length === 0
                          ? 'border-emerald-300/20 bg-emerald-400/10'
                          : 'border-amber-300/20 bg-amber-400/10'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {importResult.errors.length === 0 ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-100" />
                        )}
                        <p className="text-lg font-bold text-white">Import complete</p>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <ResultStat label="Imported" value={importResult.imported} color="text-emerald-200" />
                        <ResultStat label="Skipped" value={importResult.skipped} color="text-neutral-300" />
                        <ResultStat label="Errors" value={importResult.errors.length} color="text-rose-200" />
                      </div>

                      <p className="mt-3 text-xs text-neutral-400">
                        Completed {new Date(importResult.completedAt).toLocaleString()}
                      </p>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4">
                        <div className="flex items-center gap-2 text-rose-100">
                          <XCircle className="h-4 w-4" />
                          <p className="text-sm font-semibold">
                            {importResult.errors.length} error{importResult.errors.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-rose-50/90">
                          {importResult.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PreviewStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function ResultStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>
      <p className={cn('mt-2 text-2xl font-black', color)}>{value}</p>
    </div>
  );
}
