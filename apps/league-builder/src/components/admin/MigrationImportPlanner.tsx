'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@hockey-life/ui';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  updatePlatformMigrationImportMapping,
  type PlatformMigrationQueueRequest,
} from '@/lib/actions/platform-migration-admin';
import {
  MIGRATION_SCOPE_META,
  MIGRATION_SCOPE_OPTIONS,
  type LeagueMigrationScope,
  type MigrationImportFieldMapping,
  type MigrationImportMode,
  type MigrationTargetEntity,
  type MigrationUploadedAsset,
} from '@/lib/migration/requests';
import {
  buildMigrationImportMappingEntry,
  listTargetFields,
  MIGRATION_IMPORT_MODE_META,
  MIGRATION_TARGET_ENTITY_META,
} from '@/lib/migration/import-mapping';
import { AlertTriangle, CheckCircle2, Loader2, Map, Waypoints } from 'lucide-react';

type Props = {
  request: PlatformMigrationQueueRequest;
  onRequestUpdated: (request: PlatformMigrationQueueRequest) => void;
};

type AssetDraft = {
  scope: LeagueMigrationScope | '';
  targetEntity: MigrationTargetEntity | '';
  sourceObject: string;
  importMode: MigrationImportMode;
  notesText: string;
  fieldMappings: Record<string, string>;
};

function getExistingMapping(
  request: PlatformMigrationQueueRequest,
  assetId: string
) {
  return request.normalization_profile?.import_mappings.find((mapping) => mapping.asset_id === assetId) ?? null;
}

function createAssetDraft(
  request: PlatformMigrationQueueRequest,
  asset: MigrationUploadedAsset
): AssetDraft {
  const mapping =
    getExistingMapping(request, asset.id) ?? buildMigrationImportMappingEntry(asset);

  return {
    scope: mapping.scope ?? '',
    targetEntity: mapping.target_entity ?? '',
    sourceObject: mapping.source_object ?? '',
    importMode: mapping.import_mode,
    notesText: mapping.notes.join('\n'),
    fieldMappings: Object.fromEntries(
      mapping.field_mappings.map((field) => [field.source_field, field.target_field ?? ''])
    ),
  };
}

function buildDraftMap(request: PlatformMigrationQueueRequest) {
  return Object.fromEntries(
    request.uploaded_assets.map((asset) => [asset.id, createAssetDraft(request, asset)])
  ) as Record<string, AssetDraft>;
}

function toFieldMappingOverrides(draft: AssetDraft): MigrationImportFieldMapping[] {
  return Object.entries(draft.fieldMappings).map(([sourceField, targetField]) => ({
    source_field: sourceField,
    target_field: targetField || null,
    required: false,
    confidence: 'confirmed',
  }));
}

function toNotesArray(notesText: string) {
  return notesText
    .split(/\r?\n/)
    .map((note) => note.trim())
    .filter(Boolean);
}

export function MigrationImportPlanner({ request, onRequestUpdated }: Props) {
  const [drafts, setDrafts] = useState<Record<string, AssetDraft>>(() => buildDraftMap(request));
  const [isPending, startTransition] = useTransition();

  const previewEntries = useMemo(() => {
    return Object.fromEntries(
      request.uploaded_assets.map((asset) => {
        const draft = drafts[asset.id] ?? createAssetDraft(request, asset);
        return [
          asset.id,
          buildMigrationImportMappingEntry(
            asset,
            {
              scope: draft.scope || null,
              target_entity: draft.targetEntity || null,
              source_object: draft.sourceObject || null,
              import_mode: draft.importMode,
              field_mappings: toFieldMappingOverrides(draft),
              notes: toNotesArray(draft.notesText),
            },
            getExistingMapping(request, asset.id)
          ),
        ];
      })
    );
  }, [drafts, request]);

  const readyCount = Object.values(previewEntries).filter((entry) => entry.ready_for_import).length;

  function updateDraft(assetId: string, patch: Partial<AssetDraft>) {
    setDrafts((current) => ({
      ...current,
      [assetId]: {
        ...(current[assetId] ?? createAssetDraft(request, request.uploaded_assets.find((asset) => asset.id === assetId)!)),
        ...patch,
      },
    }));
  }

  function saveAsset(asset: MigrationUploadedAsset) {
    const draft = drafts[asset.id] ?? createAssetDraft(request, asset);
    startTransition(async () => {
      const result = await updatePlatformMigrationImportMapping({
        requestId: request.id,
        leagueId: request.league_id,
        assetId: asset.id,
        scope: draft.scope || null,
        targetEntity: draft.targetEntity || null,
        sourceObject: draft.sourceObject || null,
        importMode: draft.importMode,
        fieldMappings: toFieldMappingOverrides(draft),
        notes: toNotesArray(draft.notesText),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setDrafts(buildDraftMap(result.data));
      onRequestUpdated(result.data);
      toast.success('Import plan saved');
    });
  }

  return (
    <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-400/[0.04] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100/80">
            Import prep
          </p>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-white">
            Map uploaded files into BLH
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-300">
            Choose the BLH destination for each file, map the fields you need, and save the import plan. This lets ops move a request from file review into an import-ready state without rebuilding the mapping each time.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-300">
          <span className="font-semibold text-white">{readyCount}</span> of{' '}
          <span className="font-semibold text-white">{request.uploaded_assets.length}</span> files ready
        </div>
      </div>

      {request.normalization_profile?.import_blockers?.length ? (
        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
          <div className="flex items-center gap-2 text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-semibold">Current blockers</p>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-50/90">
            {request.normalization_profile.import_blockers.slice(0, 6).map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {request.uploaded_assets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-neutral-400">
            No uploaded files yet. Once the owner uploads exports here, this planner will generate suggested destinations and mappings.
          </div>
        ) : (
          request.uploaded_assets.map((asset) => {
            const draft = drafts[asset.id] ?? createAssetDraft(request, asset);
            const preview = previewEntries[asset.id];
            const targetFields = listTargetFields(
              (draft.targetEntity || null) as MigrationTargetEntity | null
            );

            return (
              <div key={asset.id} className="rounded-[22px] border border-white/10 bg-black/20 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-neutral-300">
                        {asset.analysis.source_format.replace(/_/g, ' ')}
                      </span>
                      {preview.ready_for_import ? (
                        <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                          Ready to import
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
                          Needs mapping
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-lg font-bold text-white">{asset.name}</p>
                    <p className="mt-1 text-sm text-neutral-400">
                      {asset.analysis.detected_tables.length > 0
                        ? `Detected tables: ${asset.analysis.detected_tables.slice(0, 5).join(', ')}`
                        : asset.analysis.notes[0] ?? 'No table metadata detected yet'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-neutral-300">
                    {asset.analysis.sample_columns.length} sample field
                    {asset.analysis.sample_columns.length === 1 ? '' : 's'}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-white">BLH track</span>
                    <select
                      value={draft.scope}
                      onChange={(event) =>
                        updateDraft(asset.id, {
                          scope: event.target.value as LeagueMigrationScope | '',
                        })
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white outline-none transition-colors focus:border-cyan-300/35"
                    >
                      <option value="">Select track</option>
                      {MIGRATION_SCOPE_OPTIONS.map((scope) => (
                        <option key={scope} value={scope}>
                          {MIGRATION_SCOPE_META[scope].label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-white">Destination entity</span>
                    <select
                      value={draft.targetEntity}
                      onChange={(event) =>
                        updateDraft(asset.id, {
                          targetEntity: event.target.value as MigrationTargetEntity | '',
                        })
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white outline-none transition-colors focus:border-cyan-300/35"
                    >
                      <option value="">Select destination</option>
                      {Object.entries(MIGRATION_TARGET_ENTITY_META).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-white">Import mode</span>
                    <select
                      value={draft.importMode}
                      onChange={(event) =>
                        updateDraft(asset.id, {
                          importMode: event.target.value as MigrationImportMode,
                        })
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white outline-none transition-colors focus:border-cyan-300/35"
                    >
                      {Object.entries(MIGRATION_IMPORT_MODE_META).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-white">Source table / object</span>
                    <Input
                      value={draft.sourceObject}
                      onChange={(event) =>
                        updateDraft(asset.id, {
                          sourceObject: event.target.value,
                        })
                      }
                      placeholder={asset.analysis.detected_tables[0] ?? 'players_export'}
                      className="border-white/10 bg-black/20 text-white placeholder:text-neutral-500"
                    />
                  </label>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-white">
                      <Map className="h-4 w-4 text-cyan-300" />
                      <p className="text-sm font-semibold">Field mapping</p>
                    </div>
                    {asset.analysis.sample_columns.length === 0 ? (
                      <p className="mt-3 text-sm leading-6 text-neutral-400">
                        This file did not expose column-level preview data. Set the destination and source object, then keep any special instructions in notes.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {asset.analysis.sample_columns.map((sourceField) => (
                          <div
                            key={sourceField}
                            className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 md:grid-cols-[0.95fr_1.05fr]"
                          >
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                                Source field
                              </p>
                              <p className="mt-2 text-sm font-semibold text-white">{sourceField}</p>
                            </div>
                            <label className="space-y-2">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                                BLH field
                              </span>
                              <select
                                value={draft.fieldMappings[sourceField] ?? ''}
                                onChange={(event) =>
                                  updateDraft(asset.id, {
                                    fieldMappings: {
                                      ...draft.fieldMappings,
                                      [sourceField]: event.target.value,
                                    },
                                  })
                                }
                                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white outline-none transition-colors focus:border-cyan-300/35"
                              >
                                <option value="">Skip for now</option>
                                {targetFields.map((field) => (
                                  <option key={field.key} value={field.key}>
                                    {field.label}
                                    {field.required ? ' (required)' : ''}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-2 text-white">
                        <Waypoints className="h-4 w-4 text-emerald-300" />
                        <p className="text-sm font-semibold">Readiness</p>
                      </div>
                      <div
                        className={cn(
                          'mt-4 rounded-2xl border p-4',
                          preview.ready_for_import
                            ? 'border-emerald-300/20 bg-emerald-400/10'
                            : 'border-amber-300/20 bg-amber-400/10'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {preview.ready_for_import ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-100" />
                          )}
                          <p className="text-sm font-semibold text-white">
                            {preview.ready_for_import
                              ? 'This file is ready for ops import'
                              : 'This file still needs setup'}
                          </p>
                        </div>
                        {preview.blockers.length > 0 ? (
                          <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-100/90">
                            {preview.blockers.map((blocker) => (
                              <li key={blocker}>{blocker}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-neutral-100/90">
                            Destination, source object, and required BLH fields are all mapped.
                          </p>
                        )}
                      </div>
                    </div>

                    <label className="block space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <span className="text-sm font-semibold text-white">Ops notes for this file</span>
                      <Textarea
                        rows={6}
                        value={draft.notesText}
                        onChange={(event) =>
                          updateDraft(asset.id, {
                            notesText: event.target.value,
                          })
                        }
                        placeholder="Needs captain email normalization before import. Old table uses player_id instead of email."
                        className="border-white/10 bg-black/20 text-white placeholder:text-neutral-500"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                  <p className="text-sm text-neutral-400">
                    Saved mappings stay attached to this uploaded file and feed the request’s import-readiness summary.
                  </p>
                  <button
                    type="button"
                    onClick={() => saveAsset(asset)}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition-[border-color,background-color,color,transform] hover:-translate-y-0.5 hover:border-emerald-200/40 hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save import plan
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
