'use client';

import type { ReactNode } from 'react';
import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@hockey-life/ui';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { updatePlatformMigrationRequest, type PlatformMigrationQueueRequest } from '@/lib/actions/platform-migration-admin';
import { buildPlatformOwnerViewHref } from '@/lib/auth/platform-owner-view-routing';
import {
  MIGRATION_REQUEST_STATUS_OPTIONS,
  MIGRATION_SCOPE_META,
  MIGRATION_STATUS_META,
  type LeagueMigrationRequestStatus,
} from '@/lib/migration/requests';
import {
  ArrowRight,
  Calendar,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileStack,
  Filter,
  Link2,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

type Props = {
  requests: PlatformMigrationQueueRequest[];
  activeOwnerViewLeagueId?: string | null;
};

type FilterValue = 'all' | LeagueMigrationRequestStatus;

type EditorState = {
  status: LeagueMigrationRequestStatus;
  quotedPrice: string;
  scheduledFor: string;
  adminNotes: string;
};

const STATUS_STYLES: Record<LeagueMigrationRequestStatus, string> = {
  draft: 'border-white/15 bg-white/[0.05] text-neutral-200',
  submitted: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100',
  reviewing: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
  quoted: 'border-violet-400/20 bg-violet-400/10 text-violet-100',
  scheduled: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
  in_progress: 'border-orange-400/20 bg-orange-400/10 text-orange-100',
  completed: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
  cancelled: 'border-rose-400/20 bg-rose-400/10 text-rose-100',
};

function createEditorState(request: PlatformMigrationQueueRequest | null): EditorState {
  return {
    status: request?.status ?? 'submitted',
    quotedPrice:
      request?.quoted_price_cents !== null && request?.quoted_price_cents !== undefined
        ? String((request.quoted_price_cents / 100).toFixed(0))
        : '',
    scheduledFor: request?.scheduled_for ? request.scheduled_for.slice(0, 10) : '',
    adminNotes: request?.admin_notes ?? '',
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatMoney(cents?: number | null) {
  if (cents === null || cents === undefined) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function summarize(request: PlatformMigrationQueueRequest) {
  return [
    request.league_name,
    request.organization_name,
    request.requester_name,
    request.requester_email,
    request.source_system,
    request.source_url,
    request.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function MigrationQueueClient({
  requests,
  activeOwnerViewLeagueId = null,
}: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(requests[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const [requestList, updateRequestList] = useOptimistic<
    PlatformMigrationQueueRequest[],
    PlatformMigrationQueueRequest
  >(requests, (currentRequests, updatedRequest) => {
    const existingIndex = currentRequests.findIndex((request) => request.id === updatedRequest.id);

    if (existingIndex === -1) {
      return [updatedRequest, ...currentRequests];
    }

    return currentRequests.map((request) =>
      request.id === updatedRequest.id ? updatedRequest : request
    );
  });

  const derivedSummary = useMemo(() => {
    const next: Record<LeagueMigrationRequestStatus, number> = {
      draft: 0,
      submitted: 0,
      reviewing: 0,
      quoted: 0,
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const request of requestList) {
      next[request.status] += 1;
    }

    return next;
  }, [requestList]);

  const derivedActiveCount =
    derivedSummary.draft +
    derivedSummary.submitted +
    derivedSummary.reviewing +
    derivedSummary.quoted +
    derivedSummary.scheduled +
    derivedSummary.in_progress;

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return requestList.filter((request) => {
      if (filter !== 'all' && request.status !== filter) return false;
      if (!normalizedQuery) return true;
      return summarize(request).includes(normalizedQuery);
    });
  }, [filter, query, requestList]);

  const effectiveSelectedId = useMemo(() => {
    if (selectedId && requestList.some((request) => request.id === selectedId)) {
      return selectedId;
    }

    return filteredRequests[0]?.id ?? requestList[0]?.id ?? null;
  }, [filteredRequests, requestList, selectedId]);

  const selectedRequest = useMemo(
    () => requestList.find((request) => request.id === effectiveSelectedId) ?? filteredRequests[0] ?? null,
    [effectiveSelectedId, filteredRequests, requestList]
  );

  function saveChanges(selectedRequest: PlatformMigrationQueueRequest, editorState: EditorState) {
    startTransition(async () => {
      const quotedPriceCents = editorState.quotedPrice.trim()
        ? Math.round(Number(editorState.quotedPrice) * 100)
        : null;

      const result = await updatePlatformMigrationRequest({
        requestId: selectedRequest.id,
        leagueId: selectedRequest.league_id,
        status: editorState.status,
        adminNotes: editorState.adminNotes,
        quotedPriceCents,
        scheduledFor: editorState.scheduledFor || null,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Migration request updated');
      updateRequestList(result.data);
      setSelectedId(result.data.id);
      router.refresh();
    });
  }

  const filterCounts: Array<{ id: FilterValue; label: string; count: number }> = [
    { id: 'all', label: 'All requests', count: requestList.length },
    ...MIGRATION_REQUEST_STATUS_OPTIONS.map((status) => ({
      id: status,
      label: MIGRATION_STATUS_META[status].label,
      count: derivedSummary[status],
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard icon={<Sparkles className="h-4 w-4" />} label="Active queue" value={derivedActiveCount} accent="text-cyan-300" />
        <SummaryCard icon={<Clock3 className="h-4 w-4" />} label="Submitted" value={derivedSummary.submitted + derivedSummary.reviewing} accent="text-sky-300" />
        <SummaryCard icon={<CircleDollarSign className="h-4 w-4" />} label="Quoted" value={derivedSummary.quoted + derivedSummary.scheduled} accent="text-violet-300" />
        <SummaryCard icon={<ShieldCheck className="h-4 w-4" />} label="Completed" value={derivedSummary.completed} accent="text-emerald-300" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[28px] border border-white/10 bg-neutral-900/85 p-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Queue</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Historical migration requests</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-neutral-300">
              <Filter className="h-3.5 w-3.5 text-neutral-500" />
              {filteredRequests.length} visible
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by league, requester, source, or notes"
                className="border-white/10 bg-black/20 pl-10 text-white placeholder:text-neutral-500"
              />
            </label>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {filterCounts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors',
                    filter === item.id
                      ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100'
                      : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/20 hover:text-white'
                  )}
                >
                  {item.label}
                  <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-neutral-300">{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-neutral-400">
                No migration requests match the current filter.
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className={cn(
                    'rounded-[24px] border p-4 transition-[border-color,background-color,transform]',
                    selectedRequest?.id === request.id
                      ? 'border-cyan-300/35 bg-cyan-400/10'
                      : 'border-white/10 bg-black/20 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.04]'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(request.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', STATUS_STYLES[request.status])}>
                            {MIGRATION_STATUS_META[request.status].label}
                          </span>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                            {formatDateTime(request.created_at)}
                          </span>
                        </div>
                        <p className="mt-3 truncate text-lg font-bold text-white">{request.league_name}</p>
                        <p className="mt-1 truncate text-sm text-neutral-400">
                          {request.organization_name ?? 'No organization'}
                          {request.requester_name ? ` · ${request.requester_name}` : ''}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-neutral-300">
                        {request.scope.length} track{request.scope.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {request.scope.map((scope) => (
                        <span
                          key={scope}
                          className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-neutral-300"
                        >
                          {MIGRATION_SCOPE_META[scope].label}
                        </span>
                      ))}
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-neutral-400">
                      {request.notes || 'No owner notes were included with this request.'}
                    </p>
                  </button>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
                    <p className="text-xs text-neutral-500">
                      {request.requester_email || 'No requester email on file'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {activeOwnerViewLeagueId === request.league_id && (
                        <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                          Active owner view
                        </span>
                      )}
                      <Link
                        href={buildPlatformOwnerViewHref({
                          leagueId: request.league_id,
                          redirectTo: `/dashboard/leagues/${request.league_id}/migration-center`,
                        })}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:border-cyan-200/35 hover:bg-cyan-400/15"
                      >
                        {activeOwnerViewLeagueId === request.league_id
                          ? 'Continue owner view'
                          : 'View owner setup'}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(165deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 backdrop-blur-xl">
          {selectedRequest ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold', STATUS_STYLES[selectedRequest.status])}>
                      {MIGRATION_STATUS_META[selectedRequest.status].label}
                    </span>
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      Created {formatDateTime(selectedRequest.created_at)}
                    </span>
                  </div>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{selectedRequest.league_name}</h2>
                  <p className="mt-2 text-sm text-neutral-400">
                    {selectedRequest.organization_name ?? 'No organization'}
                    {selectedRequest.requester_name ? ` · requested by ${selectedRequest.requester_name}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/leagues/${selectedRequest.league_id}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.06]"
                  >
                    League dashboard
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  <Link
                    href={buildPlatformOwnerViewHref({
                      leagueId: selectedRequest.league_id,
                      redirectTo: `/dashboard/leagues/${selectedRequest.league_id}/migration-center`,
                    })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-200/35 hover:bg-cyan-400/15"
                  >
                    {activeOwnerViewLeagueId === selectedRequest.league_id
                      ? 'Continue owner view'
                      : 'View owner setup'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DetailChip icon={<Users className="h-4 w-4" />} label="Requester" value={selectedRequest.requester_name || selectedRequest.requester_email || 'Unknown'} />
                <DetailChip icon={<FileStack className="h-4 w-4" />} label="Estimated volume" value={selectedRequest.estimated_item_count ? `${selectedRequest.estimated_item_count.toLocaleString()} items` : 'Not provided'} />
                <DetailChip icon={<Calendar className="h-4 w-4" />} label="Owner target" value={formatDate(selectedRequest.desired_launch_date)} />
                <DetailChip icon={<CircleDollarSign className="h-4 w-4" />} label="Current quote" value={formatMoney(selectedRequest.quoted_price_cents)} />
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                <div className="space-y-4 rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Request context</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedRequest.scope.map((scope) => (
                        <span
                          key={scope}
                          className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-neutral-100"
                        >
                          {MIGRATION_SCOPE_META[scope].label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Datum label="Source system" value={selectedRequest.source_system || 'Not provided'} />
                  <Datum label="Source URL" value={selectedRequest.source_url || 'Not provided'} href={selectedRequest.source_url || undefined} />
                  <Datum label="Submitted" value={formatDateTime(selectedRequest.submitted_at)} />
                  <Datum label="Reviewed" value={formatDateTime(selectedRequest.reviewed_at)} />
                  <Datum label="Scheduled" value={formatDate(selectedRequest.scheduled_for)} />
                  <Datum label="Completed" value={formatDateTime(selectedRequest.completed_at)} />

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Owner notes</p>
                    <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-neutral-300">
                      {selectedRequest.notes || 'No notes provided.'}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Archive links</p>
                    <div className="mt-2 space-y-2">
                      {selectedRequest.asset_links.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-500">
                          No archive links were included.
                        </div>
                      ) : (
                        selectedRequest.asset_links.map((link) => (
                          <a
                            key={link}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-300/25 hover:bg-cyan-400/8"
                          >
                            <span className="truncate">{link}</span>
                            <Link2 className="h-4 w-4 shrink-0" />
                          </a>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <MigrationRequestEditor
                  key={`${selectedRequest.id}:${selectedRequest.updated_at}`}
                  request={selectedRequest}
                  isPending={isPending}
                  onSave={(editorState) => saveChanges(selectedRequest, editorState)}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-8 text-sm text-neutral-400">
              Select a migration request to review it.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/85 p-4 backdrop-blur-xl">
      <div className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04]', accent)}>{icon}</div>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
      <p className="text-sm text-neutral-400">{label}</p>
    </div>
  );
}

function MigrationRequestEditor({
  request,
  isPending,
  onSave,
}: {
  request: PlatformMigrationQueueRequest;
  isPending: boolean;
  onSave: (editorState: EditorState) => void;
}) {
  const [editorState, setEditorState] = useState<EditorState>(() => createEditorState(request));

  return (
    <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-400/[0.05] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/80">Ops controls</p>
      <h3 className="mt-3 text-2xl font-black tracking-tight text-white">Review, quote, and schedule</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-300">
        Update the workflow state here, keep internal notes on the request, and add the commercial or scheduling fields the owner needs back in their dashboard.
      </p>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-white">Status</span>
          <select
            value={editorState.status}
            onChange={(event) =>
              setEditorState((current) => ({
                ...current,
                status: event.target.value as LeagueMigrationRequestStatus,
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white outline-none transition-colors focus:border-cyan-300/35"
            disabled={isPending}
          >
            {MIGRATION_REQUEST_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {MIGRATION_STATUS_META[status].label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-white">Quoted price (CAD)</span>
          <Input
            type="number"
            min={0}
            step={1}
            value={editorState.quotedPrice}
            onChange={(event) =>
              setEditorState((current) => ({
                ...current,
                quotedPrice: event.target.value,
              }))
            }
            placeholder="499"
            className="border-white/10 bg-black/20 text-white placeholder:text-neutral-500"
            disabled={isPending}
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-white">Scheduled work date</span>
          <Input
            type="date"
            value={editorState.scheduledFor}
            onChange={(event) =>
              setEditorState((current) => ({
                ...current,
                scheduledFor: event.target.value,
              }))
            }
            className="border-white/10 bg-black/20 text-white"
            disabled={isPending}
          />
        </label>
      </div>

      <label className="mt-5 block space-y-2">
        <span className="text-sm font-semibold text-white">Internal ops notes</span>
        <Textarea
          rows={10}
          value={editorState.adminNotes}
          onChange={(event) =>
            setEditorState((current) => ({
              ...current,
              adminNotes: event.target.value,
            }))
          }
          placeholder="Source quality is good. Need player ID mapping before importing 2018-2020 stats. Quote assumes articles come in CSV plus image URLs."
          className="border-white/10 bg-black/20 text-white placeholder:text-neutral-500"
          disabled={isPending}
        />
      </label>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
        <p className="text-sm text-neutral-400">
          Changes here flow back into the owner-facing migration center.
        </p>
        <button
          type="button"
          onClick={() => onSave(editorState)}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition-[border-color,background-color,color,transform] hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save admin update
        </button>
      </div>
    </div>
  );
}

function DetailChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
        <span className="text-neutral-400">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Datum({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">{label}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-cyan-100 hover:text-cyan-50"
        >
          {value}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : (
        <p className="mt-2 text-sm font-semibold text-white">{value}</p>
      )}
    </div>
  );
}
