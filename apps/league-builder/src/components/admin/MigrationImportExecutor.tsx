'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@hockey-life/ui';
import { executeMigrationImport } from '@/lib/actions/execute-migration-import';
import type { PlatformMigrationQueueRequest } from '@/lib/actions/platform-migration-admin';
import {
  MIGRATION_TARGET_ENTITY_OPTIONS,
  type MigrationImportRunReport,
  type MigrationEntityImportReport,
} from '@/lib/migration/requests';
import { MIGRATION_TARGET_ENTITY_META } from '@/lib/migration/import-mapping';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Play,
  XCircle,
} from 'lucide-react';

type Props = {
  request: PlatformMigrationQueueRequest;
  onRequestUpdated: (request: PlatformMigrationQueueRequest) => void;
};

export function MigrationImportExecutor({ request, onRequestUpdated }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [report, setReport] = useState<MigrationImportRunReport | null>(null);

  const readyMappings = useMemo(() => {
    return (request.normalization_profile?.import_mappings ?? []).filter(
      (mapping) => mapping.ready_for_import
    );
  }, [request]);

  const entitySummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const mapping of readyMappings) {
      if (mapping.target_entity) {
        counts[mapping.target_entity] = (counts[mapping.target_entity] ?? 0) + 1;
      }
    }
    return counts;
  }, [readyMappings]);

  const canExecute = readyMappings.length > 0;

  function handleExecute() {
    setShowConfirm(false);
    startTransition(async () => {
      const result = await executeMigrationImport(request.id, request.league_id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setReport(result.data);
      toast.success('Import execution completed');
    });
  }

  return (
    <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-400/[0.04] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
        Import execution
      </p>
      <h3 className="mt-3 text-2xl font-black tracking-tight text-white">
        Approve &amp; execute import
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-300">
        Review the import summary below, then execute to write the mapped data into the target
        league. This action is not easily reversible.
      </p>

      {/* Import summary */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Import summary
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-neutral-500">Ready files</p>
            <p className="mt-1 text-lg font-bold text-white">
              {readyMappings.length}{' '}
              <span className="text-sm font-normal text-neutral-400">
                of {request.uploaded_assets.length}
              </span>
            </p>
          </div>
          {Object.entries(entitySummary).map(([entity, count]) => (
            <div key={entity} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-neutral-500">
                {MIGRATION_TARGET_ENTITY_META[entity as keyof typeof MIGRATION_TARGET_ENTITY_META]
                  ?.label ?? entity}
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {count} file{count === 1 ? '' : 's'}
              </p>
            </div>
          ))}
        </div>

        {!canExecute && (
          <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3">
            <div className="flex items-center gap-2 text-amber-100">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-semibold">No files are ready for import</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-50/80">
              Use the import planner above to map at least one file before executing.
            </p>
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4">
          <p className="text-sm font-semibold text-rose-100">
            This will write data into{' '}
            <span className="font-black">{request.league_name}</span>. Are you sure?
          </p>
          <p className="mt-2 text-sm leading-6 text-rose-50/80">
            {readyMappings.length} file{readyMappings.length === 1 ? '' : 's'} will be imported.
            This action modifies live league data and is not easily reversible.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExecute}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/30 bg-rose-400/15 px-4 py-3 text-sm font-semibold text-rose-100 transition-[border-color,background-color,color,transform] hover:-translate-y-0.5 hover:border-rose-200/40 hover:bg-rose-400/20"
            >
              <Play className="h-4 w-4" />
              Confirm &amp; execute
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-neutral-300 transition-colors hover:border-white/20 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Report display */}
      {report && <ImportRunReport report={report} />}

      {/* Execute button */}
      {!showConfirm && !report && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <p className="text-sm text-neutral-400">
            Once executed, imported data will appear in the league dashboard.
          </p>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={!canExecute || isPending}
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition-[border-color,background-color,color,transform] hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Execute import
          </button>
        </div>
      )}

      {/* Loading state */}
      {isPending && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-200" />
          <div>
            <p className="text-sm font-semibold text-cyan-100">Import in progress</p>
            <p className="mt-1 text-sm text-cyan-50/80">
              Writing data into {request.league_name}. This may take a few minutes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const REPORT_STATUS_STYLES: Record<MigrationImportRunReport['status'], string> = {
  running: 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100',
  completed: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100',
  failed: 'border-rose-300/20 bg-rose-400/10 text-rose-100',
  partial: 'border-amber-300/20 bg-amber-400/10 text-amber-100',
};

const REPORT_STATUS_LABELS: Record<MigrationImportRunReport['status'], string> = {
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  partial: 'Partial',
};

function ImportRunReport({ report }: { report: MigrationImportRunReport }) {
  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Import report
        </p>
        <span
          className={cn(
            'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
            REPORT_STATUS_STYLES[report.status]
          )}
        >
          {REPORT_STATUS_LABELS[report.status]}
        </span>
      </div>

      {report.errors.length > 0 && (
        <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3">
          <div className="flex items-center gap-2 text-rose-100">
            <XCircle className="h-4 w-4" />
            <p className="text-sm font-semibold">
              {report.errors.length} top-level error{report.errors.length === 1 ? '' : 's'}
            </p>
          </div>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-rose-50/80">
            {report.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {report.entity_reports.map((entityReport) => (
          <EntityReportCard key={entityReport.asset_id} report={entityReport} />
        ))}
      </div>

      {report.entity_reports.length === 0 && report.errors.length === 0 && (
        <p className="mt-3 text-sm text-neutral-400">No entity reports were generated.</p>
      )}
    </div>
  );
}

function EntityReportCard({ report }: { report: MigrationEntityImportReport }) {
  const [expanded, setExpanded] = useState(false);
  const total = report.created + report.updated + report.skipped + report.errored;
  const hasErrors = report.errored > 0 || report.errors.length > 0;
  const entityLabel =
    MIGRATION_TARGET_ENTITY_META[report.target_entity as keyof typeof MIGRATION_TARGET_ENTITY_META]
      ?.label ?? report.target_entity;

  return (
    <div
      className={cn(
        'rounded-2xl border p-3',
        hasErrors ? 'border-rose-300/15 bg-rose-400/[0.04]' : 'border-white/10 bg-white/[0.03]'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {hasErrors ? (
            <AlertTriangle className="h-4 w-4 text-rose-300" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          )}
          <p className="text-sm font-semibold text-white">{entityLabel}</p>
        </div>
        <p className="text-xs text-neutral-400">{total} total</p>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <StatBadge label="Created" value={report.created} accent="text-emerald-300" />
        <StatBadge label="Updated" value={report.updated} accent="text-cyan-300" />
        <StatBadge label="Skipped" value={report.skipped} accent="text-neutral-300" />
        <StatBadge label="Errored" value={report.errored} accent="text-rose-300" />
      </div>

      {report.errors.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-200 hover:text-rose-100"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            {report.errors.length} error{report.errors.length === 1 ? '' : 's'}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1 rounded-xl border border-rose-300/10 bg-black/20 p-3 text-xs leading-5 text-rose-50/80">
              {report.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function StatBadge({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-center">
      <p className={cn('text-lg font-bold', accent)}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
    </div>
  );
}
