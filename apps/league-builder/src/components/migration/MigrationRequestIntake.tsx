'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormField, Input } from '@hockey-life/ui';
import { cn } from '@hockey-life/ui';
import { Textarea } from '@/components/ui/textarea';
import { upsertLeagueMigrationRequest } from '@/lib/actions/migration-requests';
import {
  MIGRATION_SCOPE_META,
  MIGRATION_STATUS_META,
  isMigrationStatusActive,
  isMigrationStatusEditable,
  type LeagueMigrationRequest,
  type LeagueMigrationRequestStatus,
  type LeagueMigrationScope,
} from '@/lib/migration/requests';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock3,
  Database,
  FileStack,
  Flag,
  History,
  Link2,
  Loader2,
  Sparkles,
} from 'lucide-react';

type Props = {
  leagueId: string;
  locale: string;
  requests: LeagueMigrationRequest[];
};

type FormState = {
  scope: LeagueMigrationScope[];
  sourceSystem: string;
  sourceUrl: string;
  assetLinksText: string;
  notes: string;
  desiredLaunchDate: string;
  estimatedItemCount: string;
};

const STATUS_BADGE_STYLES: Record<LeagueMigrationRequestStatus, string> = {
  draft: 'border-white/15 bg-white/[0.05] text-neutral-200',
  submitted: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100',
  reviewing: 'border-sky-400/25 bg-sky-400/10 text-sky-100',
  quoted: 'border-violet-400/25 bg-violet-400/10 text-violet-100',
  scheduled: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  in_progress: 'border-orange-400/25 bg-orange-400/10 text-orange-100',
  completed: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  cancelled: 'border-rose-400/25 bg-rose-400/10 text-rose-100',
};

const REQUEST_STEPS = [
  {
    title: 'Choose the parts you want moved',
    description: 'Pick any mix of teams, players, schedules, stats, news, or media.',
    icon: <Database className="h-4 w-4" />,
  },
  {
    title: 'Share whatever you already have',
    description: 'A website link, shared folder, spreadsheet, or rough notes are enough to start.',
    icon: <Link2 className="h-4 w-4" />,
  },
  {
    title: 'Track the request here',
    description: 'You will see the current status and any updates from our team on this page.',
    icon: <Clock3 className="h-4 w-4" />,
  },
] as const;

function createFormState(request?: LeagueMigrationRequest | null): FormState {
  return {
    scope: request?.scope ?? [],
    sourceSystem: request?.source_system ?? '',
    sourceUrl: request?.source_url ?? '',
    assetLinksText: request?.asset_links?.join('\n') ?? '',
    notes: request?.notes ?? '',
    desiredLaunchDate: request?.desired_launch_date ?? '',
    estimatedItemCount:
      request?.estimated_item_count !== null && request?.estimated_item_count !== undefined
        ? String(request.estimated_item_count)
        : '',
  };
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function MigrationRequestIntake({ leagueId, locale, requests }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const activeRequest = useMemo(
    () => requests.find((request) => isMigrationStatusActive(request.status)) ?? null,
    [requests]
  );
  const editableRequest = activeRequest && isMigrationStatusEditable(activeRequest.status) ? activeRequest : null;
  const latestRequest = requests[0] ?? null;
  const [formState, setFormState] = useState<FormState>(() => createFormState(editableRequest));

  useEffect(() => {
    setFormState(createFormState(editableRequest));
  }, [editableRequest?.id, editableRequest?.updated_at]);

  const selectedScopeCount = formState.scope.length;
  const submitDisabled = isPending || selectedScopeCount === 0 || (!!activeRequest && !editableRequest);
  const draftDisabled = isPending || (!!activeRequest && !editableRequest);
  const statusMessage = activeRequest
    ? MIGRATION_STATUS_META[activeRequest.status].description
    : 'No request is active yet. Save a draft now or send one when you are ready.';

  function toggleScope(scope: LeagueMigrationScope) {
    setFormState((current) => {
      const exists = current.scope.includes(scope);
      return {
        ...current,
        scope: exists
          ? current.scope.filter((value) => value !== scope)
          : [...current.scope, scope],
      };
    });
  }

  function buildAssetLinks() {
    return formState.assetLinksText
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  function submit(mode: 'draft' | 'submit') {
    startTransition(async () => {
      const estimatedItemCount = formState.estimatedItemCount.trim()
        ? Number(formState.estimatedItemCount)
        : null;

      const result = await upsertLeagueMigrationRequest({
        leagueId,
        locale,
        requestId: editableRequest?.id,
        mode,
        scope: formState.scope,
        sourceSystem: formState.sourceSystem,
        sourceUrl: formState.sourceUrl,
        assetLinks: buildAssetLinks(),
        notes: formState.notes,
        desiredLaunchDate: formState.desiredLaunchDate,
        estimatedItemCount,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === 'submit' ? 'Migration request submitted' : 'Migration draft saved');
      router.refresh();
    });
  }

  return (
    <section id="migration-intake" className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr] scroll-mt-24">
      <div className="rounded-[28px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_30%),linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Migration Intake
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-white">Tell us what you want moved</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
              You do not need perfect exports to get started. Send whatever links, folders, spreadsheets, or notes you already have, and we will review the scope from there.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Areas selected</p>
            <p className="mt-2 text-3xl font-black text-white">{selectedScopeCount}</p>
            <p className="text-sm text-neutral-400">Choose every part of the old league site you want help moving.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {REQUEST_STEPS.map((step) => (
            <div key={step.title} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-200">
                  {step.icon}
                </span>
                {step.title}
              </div>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(MIGRATION_SCOPE_META).map(([scope, meta]) => {
            const selected = formState.scope.includes(scope as LeagueMigrationScope);
            return (
              <button
                key={scope}
                type="button"
                onClick={() => toggleScope(scope as LeagueMigrationScope)}
                disabled={!!activeRequest && !editableRequest}
                className={cn(
                  'group rounded-[22px] border px-4 py-4 text-left transition-[border-color,background-color,transform,color] duration-200',
                  selected
                    ? 'border-cyan-300/35 bg-cyan-400/10 text-white'
                    : 'border-white/10 bg-black/20 text-neutral-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]',
                  !!activeRequest && !editableRequest && 'cursor-not-allowed opacity-60 hover:translate-y-0'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{meta.label}</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-400 group-hover:text-neutral-300">
                      {meta.description}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
                      selected
                        ? 'border-cyan-200/50 bg-cyan-300/20 text-cyan-100'
                        : 'border-white/10 bg-white/[0.04] text-neutral-500'
                    )}
                  >
                    {selected ? <CheckCircle2 className="h-3.5 w-3.5" /> : '+'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <FormField
            label="Where your old data lives"
            htmlFor="migration-source-system"
            hint="Examples: SportsEngine, LeagueApps, an old website, Google Drive, Dropbox"
          >
            <Input
              id="migration-source-system"
              value={formState.sourceSystem}
              onChange={(event) => setFormState((current) => ({ ...current, sourceSystem: event.target.value }))}
              placeholder="Old website, registrar, stat system, or storage folder"
              className="border-white/10 bg-black/20 text-white placeholder:text-neutral-500"
              disabled={!!activeRequest && !editableRequest}
            />
          </FormField>

          <FormField
            label="Best link to start from"
            htmlFor="migration-source-url"
            hint="Paste the old league site, a shared folder, or any link that helps us find the source data"
          >
            <Input
              id="migration-source-url"
              value={formState.sourceUrl}
              onChange={(event) => setFormState((current) => ({ ...current, sourceUrl: event.target.value }))}
              placeholder="https://oldleague.example.com"
              className="border-white/10 bg-black/20 text-white placeholder:text-neutral-500"
              disabled={!!activeRequest && !editableRequest}
              inputMode="url"
            />
          </FormField>

          <FormField
            label="When do you want this ready?"
            htmlFor="migration-launch-date"
            hint="Use this if the history needs to be live by a launch date, opener, or registration deadline"
          >
            <Input
              id="migration-launch-date"
              type="date"
              value={formState.desiredLaunchDate}
              onChange={(event) => setFormState((current) => ({ ...current, desiredLaunchDate: event.target.value }))}
              className="border-white/10 bg-black/20 text-white"
              disabled={!!activeRequest && !editableRequest}
            />
          </FormField>

          <FormField
            label="Rough amount of content"
            htmlFor="migration-estimated-count"
            hint="A rough count is enough. Think rows, articles, photos, or files."
          >
            <Input
              id="migration-estimated-count"
              type="number"
              min={0}
              step={1}
              value={formState.estimatedItemCount}
              onChange={(event) => setFormState((current) => ({ ...current, estimatedItemCount: event.target.value }))}
              placeholder="2500"
              className="border-white/10 bg-black/20 text-white placeholder:text-neutral-500"
              disabled={!!activeRequest && !editableRequest}
            />
          </FormField>
        </div>

        <div className="mt-5 grid gap-5">
          <FormField
            label="Links to folders or exports"
            htmlFor="migration-asset-links"
            hint="One URL per line. Shared drives, spreadsheets, zipped exports, and media folders all work."
          >
            <Textarea
              id="migration-asset-links"
              rows={4}
              value={formState.assetLinksText}
              onChange={(event) => setFormState((current) => ({ ...current, assetLinksText: event.target.value }))}
              placeholder={'https://drive.google.com/...\nhttps://docs.google.com/spreadsheets/...'}
              className="border-white/10 bg-black/20 text-white placeholder:text-neutral-500"
              disabled={!!activeRequest && !editableRequest}
            />
          </FormField>

          <FormField
            label="Anything we should know?"
            htmlFor="migration-notes"
            hint="Mention missing seasons, unusual file formats, old URLs you care about, or anything else that might help."
          >
            <Textarea
              id="migration-notes"
              rows={6}
              value={formState.notes}
              onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
              placeholder="We have stats back to 2014, but the early seasons are only available as PDFs. Champions and award winners are on a separate WordPress site."
              className="border-white/10 bg-black/20 text-white placeholder:text-neutral-500"
              disabled={!!activeRequest && !editableRequest}
            />
          </FormField>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div aria-live="polite" className="text-sm text-neutral-400">
            {statusMessage}
          </div>
          <div className="flex flex-wrap gap-3">
            {(!editableRequest || editableRequest.status === 'draft') && (
              <button
                type="button"
                onClick={() => submit('draft')}
                disabled={draftDisabled}
                className={cn(
                  'inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-[border-color,background-color,color]',
                  'border-white/10 bg-white/[0.04] text-white hover:border-white/20 hover:bg-white/[0.06]',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileStack className="h-4 w-4" />}
                Save for later
              </button>
            )}
            <button
              type="button"
              onClick={() => submit('submit')}
              disabled={submitDisabled}
              className={cn(
                'inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition-[border-color,background-color,color,transform]',
                'hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-cyan-400/15',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0'
              )}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {editableRequest?.status === 'submitted' ? 'Update request' : 'Send request'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-white">
                <Clock3 className="h-5 w-5 text-cyan-300" />
                <h3 className="text-xl font-bold">Where this request stands</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                The latest active request stays here so the league always has one clear place to check progress.
              </p>
            </div>
            {activeRequest ? (
              <span className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold', STATUS_BADGE_STYLES[activeRequest.status])}>
                {MIGRATION_STATUS_META[activeRequest.status].label}
              </span>
            ) : latestRequest ? (
              <span className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold', STATUS_BADGE_STYLES[latestRequest.status])}>
                {MIGRATION_STATUS_META[latestRequest.status].label}
              </span>
            ) : null}
          </div>

          {activeRequest ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/8 p-4">
                <div className="flex flex-wrap items-center gap-2 text-white">
                  <Database className="h-4 w-4 text-cyan-200" />
                  <span className="font-semibold">Open migration request</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeRequest.scope.map((scope) => (
                    <span
                      key={scope}
                      className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-neutral-100"
                    >
                      {MIGRATION_SCOPE_META[scope].label}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <StatusDatum icon={<Calendar className="h-4 w-4" />} label="Sent to us" value={formatDateTime(activeRequest.submitted_at) ?? 'Not submitted yet'} />
                  <StatusDatum icon={<Flag className="h-4 w-4" />} label="Target go-live" value={formatDate(activeRequest.desired_launch_date) ?? 'No date set'} />
                  <StatusDatum icon={<FileStack className="h-4 w-4" />} label="Approx. size" value={activeRequest.estimated_item_count ? `${activeRequest.estimated_item_count.toLocaleString()} items` : 'Not provided'} />
                  <StatusDatum icon={<Link2 className="h-4 w-4" />} label="Links shared" value={activeRequest.asset_links.length ? `${activeRequest.asset_links.length} attached` : 'None attached'} />
                </div>
                {activeRequest.admin_notes && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Update from our team</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">{activeRequest.admin_notes}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/20 p-5">
              <p className="text-sm font-semibold text-white">No open request yet</p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Start with the short form on the left. The request will stay tied to this league instead of getting lost in email threads.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-white">
            <History className="h-5 w-5 text-rink-300" />
            <h3 className="text-xl font-bold">Past requests</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Every submission stays visible here so owners can see what was requested and when it moved.
          </p>

          <div className="mt-5 space-y-3">
            {requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-neutral-400">
                No migration requests have been created yet.
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', STATUS_BADGE_STYLES[request.status])}>
                          {MIGRATION_STATUS_META[request.status].label}
                        </span>
                        <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                          {formatDateTime(request.created_at) ?? 'Unknown date'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {request.scope.length > 0 ? (
                          request.scope.map((scope) => (
                            <span
                              key={scope}
                              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-neutral-200"
                            >
                              {MIGRATION_SCOPE_META[scope].label}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-neutral-500">No scopes selected yet</span>
                        )}
                      </div>
                    </div>
                    {request.quoted_price_cents !== null && request.quoted_price_cents !== undefined && (
                      <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200/80">Quoted</p>
                        <p className="mt-1 text-lg font-bold text-violet-50">
                          {new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: 'USD',
                            maximumFractionDigits: 0,
                          }).format(request.quoted_price_cents / 100)}
                        </p>
                      </div>
                    )}
                  </div>
                  {(request.source_system || request.source_url || request.notes) && (
                    <div className="mt-4 grid gap-3 text-sm text-neutral-300 md:grid-cols-2">
                      <HistoryDatum label="Original platform" value={request.source_system || 'Not provided'} />
                      <HistoryDatum label="Starting link" value={request.source_url || 'Not provided'} isLink={Boolean(request.source_url)} />
                    </div>
                  )}
                  {request.notes && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-neutral-300">
                      {request.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusDatum({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
        <span className="text-neutral-400">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function HistoryDatum({
  label,
  value,
  isLink = false,
}: {
  label: string;
  value: string;
  isLink?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">{label}</p>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-cyan-100"
        >
          {value}
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      ) : (
        <p className="mt-2 text-sm font-semibold text-white">{value}</p>
      )}
    </div>
  );
}
