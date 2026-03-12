'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  getCaptainTeamReturnRequests,
  respondToTeamReturnRequest,
  type CaptainTeamReturnEntry,
  type CaptainTeamReturnOverview,
} from '@/lib/actions/team-return';

interface CaptainTeamReturnPageProps {
  params: Promise<{ leagueSlug: string }>;
}

type ResponseStatus = 'interested' | 'confirmed' | 'declined';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function statusLabel(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'Confirmed returning';
    case 'declined':
      return 'Marked not returning';
    case 'interested':
      return 'Interested / likely returning';
    case 'follow_up_needed':
      return 'Follow-up requested';
    case 'contacted':
      return 'Awaiting your response';
    default:
      return 'Pending response';
  }
}

function statusClasses(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'border-green-500/20 bg-green-500/10 text-green-200';
    case 'declined':
      return 'border-red-500/20 bg-red-500/10 text-red-200';
    case 'interested':
      return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200';
    case 'follow_up_needed':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-100';
    default:
      return 'border-white/10 bg-white/5 text-neutral-200';
  }
}

function TeamReturnResponseCard({
  leagueSlug,
  seasonId,
  entry,
  onUpdated,
}: {
  leagueSlug: string;
  seasonId: string;
  entry: CaptainTeamReturnEntry;
  onUpdated: () => Promise<void>;
}) {
  const [note, setNote] = useState(entry.captainResponseNote || '');
  const [declinedReason, setDeclinedReason] = useState(entry.declinedReason || '');
  const [pendingStatus, setPendingStatus] = useState<ResponseStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNote(entry.captainResponseNote || '');
    setDeclinedReason(entry.declinedReason || '');
    setError(null);
  }, [entry.captainResponseNote, entry.declinedReason, entry.recordId]);

  const submit = async (status: ResponseStatus) => {
    if (status === 'declined' && !declinedReason.trim()) {
      setError('Please tell the league why the team is not returning.');
      return;
    }

    setPendingStatus(status);
    setError(null);

    const result = await respondToTeamReturnRequest({
      leagueSlug,
      seasonId,
      teamId: entry.teamId,
      status,
      note: note.trim() || null,
      declinedReason: status === 'declined' ? declinedReason.trim() || null : null,
    });

    setPendingStatus(null);

    if (!result.success) {
      setError(result.error);
      return;
    }

    await onUpdated();
  };

  return (
    <Card variant="glass" className="border-white/10" hover={false}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{entry.teamName}</h2>
              {entry.divisionName && (
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-[var(--color-text-secondary)]">
                  {entry.divisionName}
                </span>
              )}
              <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClasses(entry.status)}`}>
                {statusLabel(entry.status)}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Reply here so the league can hold your spot, align returning players, and keep registration moving cleanly.
            </p>
          </div>

          <div className="grid gap-2 text-sm text-[var(--color-text-secondary)] sm:grid-cols-2 lg:min-w-[280px]">
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Waiting players</div>
              <div className="font-semibold text-[var(--color-text-primary)]">{entry.waitingPlayerCount}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Already aligned</div>
              <div className="font-semibold text-[var(--color-text-primary)]">{entry.confirmedPlayerCount}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Last contact</div>
              <div className="font-semibold text-[var(--color-text-primary)]">{formatDate(entry.lastContactedAt)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Last response</div>
              <div className="font-semibold text-[var(--color-text-primary)]">{formatDate(entry.lastResponseAt)}</div>
            </div>
          </div>
        </div>

        {entry.sharedNote && (
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            <div className="mb-1 font-semibold">League note</div>
            <div>{entry.sharedNote}</div>
          </div>
        )}

        {entry.captainResponseNote && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <div className="mb-1 font-semibold">
              Your latest response {entry.captainResponseAt ? `(${formatDate(entry.captainResponseAt)})` : ''}
            </div>
            <div>{entry.captainResponseNote}</div>
          </div>
        )}

        {entry.status === 'declined' && entry.declinedReason && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <div className="mb-1 font-semibold">Current decline reason on file</div>
            <div>{entry.declinedReason}</div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
              Message to league admins
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--league-primary)] focus:outline-none"
              placeholder="Add context for the league office, like roster size, likely return timing, or what you still need."
            />
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              League admins will see this in their return campaign dashboard on refresh.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
              If not returning, why?
            </label>
            <textarea
              value={declinedReason}
              onChange={(event) => setDeclinedReason(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--league-primary)] focus:outline-none"
              placeholder="Optional unless you choose “Not returning”."
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => void submit('confirmed')}
            loading={pendingStatus === 'confirmed'}
            icon={<CheckCircle2 className="h-4 w-4" />}
          >
            We&apos;re returning
          </Button>
          <Button
            variant="secondary"
            onClick={() => void submit('interested')}
            loading={pendingStatus === 'interested'}
            icon={<Clock3 className="h-4 w-4" />}
          >
            We need a little more time
          </Button>
          <Button
            variant="outline"
            onClick={() => void submit('declined')}
            loading={pendingStatus === 'declined'}
            icon={<AlertTriangle className="h-4 w-4" />}
            className="border-red-500/20 text-red-200 hover:bg-red-500/10"
          >
            We&apos;re not returning
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function CaptainTeamReturnPage({ params }: CaptainTeamReturnPageProps) {
  const { leagueSlug } = use(params);
  const searchParams = useSearchParams();
  const seasonId = searchParams.get('seasonId') || undefined;
  const teamId = searchParams.get('teamId') || undefined;

  const [overview, setOverview] = useState<CaptainTeamReturnOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getCaptainTeamReturnRequests({
      leagueSlug,
      seasonId,
      teamId,
    });

    if (!result.success) {
      setError(result.error);
      setOverview(null);
      setIsLoading(false);
      return;
    }

    setOverview(result.data);
    setIsLoading(false);
  }, [leagueSlug, seasonId, teamId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const entryCountLabel = useMemo(() => {
    const count = overview?.entries.length ?? 0;
    return `${count} team${count === 1 ? '' : 's'}`;
  }, [overview?.entries.length]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading team return requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/${leagueSlug}/captain`}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-[var(--league-primary)]" />
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Team Return Status
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            Confirm whether your team is coming back so the league can line up registrations and planning.
          </p>
        </div>
        <Button variant="ghost" onClick={() => void loadOverview()} icon={<Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />}>
          Refresh
        </Button>
      </div>

      {error && (
        <Card hover={false} className="border-red-500/20 bg-red-500/10 mb-6">
          <div className="flex items-start gap-3 text-red-100">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <div className="font-semibold">We couldn&apos;t load your team return requests</div>
              <div className="text-sm mt-1">{error}</div>
            </div>
          </div>
        </Card>
      )}

      {!error && overview && (
        <>
          <Card hover={false} className="mb-6 border-white/10">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">League</div>
                <div className="mt-1 font-semibold text-[var(--color-text-primary)]">{overview.league.name}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Target season</div>
                <div className="mt-1 font-semibold text-[var(--color-text-primary)]">{overview.targetSeason?.name || 'Not set yet'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Source season</div>
                <div className="mt-1 font-semibold text-[var(--color-text-primary)]">{overview.sourceSeason?.name || '—'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Requests</div>
                <div className="mt-1 font-semibold text-[var(--color-text-primary)]">{entryCountLabel}</div>
              </div>
            </div>
          </Card>

          {overview.entries.length === 0 ? (
            <Card hover={false} className="border-white/10">
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-[var(--color-text-muted)] mb-4" />
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  No team return request is waiting on you right now
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)] max-w-2xl mx-auto">
                  Once the league opens its return campaign for the next season, this page will show your team status here. If you were expecting a request, let the league office know so they can sync the return list.
                </p>
                <div className="mt-6">
                  <Link
                    href={`/${leagueSlug}/captain`}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--league-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-text)]"
                  >
                    Back to captain dashboard
                  </Link>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card hover={false} className="border-cyan-500/20 bg-cyan-500/10">
                <div className="flex items-start gap-3 text-cyan-50">
                  <Calendar className="h-5 w-5 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-semibold">Why this matters</div>
                    <div className="mt-1 text-cyan-50/85">
                      Your response helps the league hold your spot, keep returning players attached to the right team, and avoid manual cleanup later.
                    </div>
                  </div>
                </div>
              </Card>

              {overview.entries.map((entry) => (
                <TeamReturnResponseCard
                  key={entry.recordId}
                  leagueSlug={leagueSlug}
                  seasonId={overview.targetSeason?.id || seasonId || ''}
                  entry={entry}
                  onUpdated={loadOverview}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
