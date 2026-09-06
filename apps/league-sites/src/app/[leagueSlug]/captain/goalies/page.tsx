'use client';

import { useState, useEffect, use, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  Loader2,
  AlertCircle,
  Calendar,
  Star,
  Goal,
  CircleDollarSign,
  Mail,
  Phone,
  CheckCircle2,
  Clock3,
  XCircle,
  Wallet,
} from 'lucide-react';
import { useLeague } from '@/hooks/useLeague';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { GoalieRequestModal } from '@/components/captain/GoalieRequestModal';
import {
  cancelCaptainGoalieRequest,
  getCaptainGoalieDashboard,
  rateCaptainGoalie,
  recordCaptainGoaliePayment,
  type CaptainGoalieDashboardData,
  type CaptainGoalieMarketplaceItem,
  type CaptainGoalieRequestItem,
  type CaptainGoalieUpcomingGame,
} from '@/lib/actions/goalie-marketplace';

interface CaptainGoaliesPageProps {
  params: Promise<{ leagueSlug: string }>;
}

type PaymentMethod = 'e_transfer' | 'cash' | 'check' | 'other' | 'stripe';

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return 'TBD';
  return new Intl.DateTimeFormat('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function RequestStatusBadge({ status }: { status: string | null }) {
  const config =
    status === 'filled'
      ? {
          label: 'Filled',
          className: 'border-green-500/30 bg-green-500/10 text-green-400',
          Icon: CheckCircle2,
        }
      : status === 'open'
        ? {
            label: 'Open Request',
            className: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
            Icon: Clock3,
          }
        : status === 'cancelled'
          ? {
              label: 'Cancelled',
              className: 'border-neutral-700/30 bg-neutral-800/60 text-neutral-400',
              Icon: XCircle,
            }
          : {
              label: 'Expired',
              className: 'border-neutral-700/30 bg-neutral-800/60 text-neutral-400',
              Icon: AlertCircle,
            };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      <config.Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const config =
    status === 'paid'
      ? 'border-green-500/30 bg-green-500/10 text-green-400'
      : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${config}`}>
      <Wallet className="h-3.5 w-3.5" />
      {status === 'paid' ? 'Paid' : 'Unpaid'}
    </span>
  );
}

function RatingStars({ rating, count }: { rating: number; count: number }) {
  if (count === 0) {
    return <span className="text-xs text-[var(--color-text-muted)]">No ratings yet</span>;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1 text-amber-400">
        <Star className="h-4 w-4 fill-current" />
        <span className="font-semibold">{rating.toFixed(1)}</span>
      </div>
      <span className="text-[var(--color-text-muted)]">({count})</span>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-hover)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function GoalieRatingModal({
  request,
  teamId,
  onClose,
  onSaved,
}: {
  request: CaptainGoalieRequestItem | null;
  teamId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [stars, setStars] = useState(request?.userRatingStars || 5);
  const [note, setNote] = useState(request?.userRatingNote || '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!request || !request.filledGoalieId) return null;

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await rateCaptainGoalie(
        teamId,
        request.filledGoalieId as string,
        request.gameId,
        { stars, privateNote: note },
      );

      if (!result.success) {
        setError(result.error || 'Failed to save goalie rating');
        return;
      }

      onSaved();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
        <div className="border-b border-[var(--color-border)] p-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Rate Sub Goalie</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Private feedback for {request.filledGoalieName || 'this goalie'} after {request.gameLabel}.
          </p>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
              Rating
            </label>
            <div className="mt-3 flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStars(value)}
                  className="rounded-lg p-1 transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  <Star
                    className={`h-7 w-7 ${
                      value <= stars ? 'fill-current text-amber-400' : 'text-[var(--color-text-muted)]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
              Private Notes
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Reliable, communicated well, arrived late, etc."
              className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)]"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>
        <div className="flex gap-3 border-t border-[var(--color-border)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-[var(--color-surface-hover)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--league-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-accent-text)] disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Rating
          </button>
        </div>
      </div>
    </div>
  );
}

function GoaliePaymentModal({
  request,
  teamId,
  onClose,
  onSaved,
}: {
  request: CaptainGoalieRequestItem | null;
  teamId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(
    request && request.paidAmountCents > 0 ? (request.paidAmountCents / 100).toFixed(2) : '',
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (request?.paymentMethod as PaymentMethod) || 'e_transfer',
  );
  const [reference, setReference] = useState(request?.paymentReference || '');
  const [notes, setNotes] = useState(request?.paymentNotes || '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!request) return null;

  const handleSubmit = () => {
    const numericAmount = Math.round(Number.parseFloat(amount || '0') * 100);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setError('Enter a valid amount.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await recordCaptainGoaliePayment(teamId, request.id, {
        amountCents: numericAmount,
        paymentMethod,
        referenceNumber: reference,
        notes,
      });

      if (!result.success) {
        setError(result.error || 'Failed to mark goalie payment');
        return;
      }

      onSaved();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
        <div className="border-b border-[var(--color-border)] p-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Mark Goalie as Paid</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Track how you settled {request.filledGoalieName || 'this goalie'} for {request.gameLabel}.
          </p>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
              Amount Paid
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
              className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)]"
            >
              <option value="e_transfer">e-Transfer</option>
              <option value="cash">Cash</option>
              <option value="check">Cheque</option>
              <option value="stripe">Stripe</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
              Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="e-Transfer reference, cheque #, etc."
              className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Optional payout notes or confirmation details."
              className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--league-primary)]"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>
        <div className="flex gap-3 border-t border-[var(--color-border)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-[var(--color-surface-hover)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--league-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-accent-text)] disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Payment
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CaptainGoaliesPage({ params }: CaptainGoaliesPageProps) {
  const { leagueSlug } = use(params);
  const { league, isLoading: leagueLoading } = useLeague();
  const { currentTeam, isLoading: profileLoading } = usePlayerProfile(
    league?.id,
    league?.current_season_id
  );
  const [dashboard, setDashboard] = useState<CaptainGoalieDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [requestGame, setRequestGame] = useState<CaptainGoalieUpcomingGame | null>(null);
  const [ratingRequest, setRatingRequest] = useState<CaptainGoalieRequestItem | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<CaptainGoalieRequestItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const isCaptain = currentTeam?.is_captain || currentTeam?.is_alternate;

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!currentTeam?.team_id || !isCaptain) {
        setIsLoading(false);
        return;
      }

      const result = await getCaptainGoalieDashboard(currentTeam.team_id);
      if (!result.success) {
        setError(result.error || 'Failed to load goalie marketplace');
      } else {
        setDashboard(result.data);
        setError(null);
      }
      setIsLoading(false);
    };

    if (!leagueLoading && !profileLoading) {
      fetchDashboard();
    }
  }, [currentTeam, isCaptain, leagueLoading, profileLoading, refreshKey]);

  const refresh = () => setRefreshKey((value) => value + 1);

  const handleCancelRequest = (requestId: string) => {
    if (!currentTeam?.team_id) return;

    startTransition(async () => {
      const result = await cancelCaptainGoalieRequest(requestId, currentTeam.team_id);
      if (!result.success) {
        setError(result.error || 'Failed to cancel goalie request');
        return;
      }
      refresh();
    });
  };

  if (profileLoading || leagueLoading || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading goalie marketplace...</p>
        </div>
      </div>
    );
  }

  if (!currentTeam?.team || !isCaptain) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-amber-400" />
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
            Captain Access Required
          </h2>
          <p className="mb-4 text-[var(--color-text-secondary)]">
            Only captains and alternate captains can manage goalie requests.
          </p>
          <Link
            href={`/${leagueSlug}/captain`}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-surface-hover)] px-4 py-2 text-[var(--color-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Captain Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const requests = dashboard?.requests || [];
  const activeGoalies = dashboard?.activeGoalies || [];
  const upcomingGames = dashboard?.upcomingGames || [];
  const filledRequests = requests.filter((request) => request.status === 'filled');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href={`/${leagueSlug}/captain`}
          className="rounded-lg p-2 transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--color-text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Goalie Marketplace</h1>
          <p className="text-[var(--color-text-secondary)]">
            Request a sub goalie, track filled requests, rate them after the game, and keep payout notes in one place.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard
          label="Active Goalies"
          value={activeGoalies.length}
          hint="Available in your league pool right now"
          icon={<Goal className="h-5 w-5 text-[var(--league-primary)]" />}
        />
        <SummaryCard
          label="Open Requests"
          value={requests.filter((request) => request.status === 'open').length}
          hint="Still looking for coverage"
          icon={<Clock3 className="h-5 w-5 text-blue-400" />}
        />
        <SummaryCard
          label="Filled Requests"
          value={filledRequests.length}
          hint="Goalies confirmed by email"
          icon={<CheckCircle2 className="h-5 w-5 text-green-400" />}
        />
        <SummaryCard
          label="Unpaid Goalies"
          value={dashboard?.unpaidFilledRequests || 0}
          hint="Filled requests still marked unpaid"
          icon={<CircleDollarSign className="h-5 w-5 text-yellow-400" />}
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-8">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Upcoming Games</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Request a sub goalie before puck drop when you need coverage.
                </p>
              </div>
            </div>

            {upcomingGames.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                No upcoming games are scheduled for your team yet.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingGames.map((game) => (
                  <div
                    key={game.id}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-[var(--color-text-primary)]">
                          vs {game.opponentName}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDateTime(game.scheduledAt)}
                          </span>
                          {game.location && <span>{game.location}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {game.existingRequestStatus ? (
                          <RequestStatusBadge status={game.existingRequestStatus} />
                        ) : null}
                        {game.existingRequestStatus === 'open' ? (
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(game.existingRequestId as string)}
                            disabled={isPending}
                            className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 disabled:opacity-60"
                          >
                            Cancel Request
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRequestGame(game)}
                            className="rounded-full bg-[var(--league-primary)] px-3 py-2 text-sm font-medium text-[var(--color-accent-text)]"
                          >
                            Request Sub Goalie
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Your Goalie Requests</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Track open requests, see who filled them, log payment, and leave captain feedback after the game.
              </p>
            </div>

            {requests.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                No goalie requests yet. When you send one, it will show up here.
              </p>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-[var(--color-text-primary)]">
                            {request.gameLabel}
                          </p>
                          <RequestStatusBadge status={request.status} />
                          {request.status === 'filled' ? (
                            <PaymentStatusBadge status={request.paymentStatus} />
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--color-text-secondary)]">
                          <span>Needed: {request.skillLevelNeeded}</span>
                          {request.compensation ? <span>Comp: {request.compensation}</span> : null}
                          {request.location ? <span>{request.location}</span> : null}
                        </div>
                        {request.notes ? (
                          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{request.notes}</p>
                        ) : null}
                      </div>
                      {request.status === 'open' ? (
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(request.id)}
                          disabled={isPending}
                          className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>

                    {request.filledGoalieName ? (
                      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                              Filled by {request.filledGoalieName}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--color-text-secondary)]">
                              {request.filledGoalieEmail ? (
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  {request.filledGoalieEmail}
                                </span>
                              ) : null}
                              {request.filledGoaliePhone ? (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  {request.filledGoaliePhone}
                                </span>
                              ) : null}
                              {request.filledAt ? <span>Accepted {formatDateTime(request.filledAt)}</span> : null}
                            </div>
                            {request.paidAt ? (
                              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                                Paid {formatCurrency(request.paidAmountCents)} via {request.paymentMethod || 'manual'} on{' '}
                                {formatDateTime(request.paidAt)}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setRatingRequest(request)}
                              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)]"
                            >
                              {request.userRatingStars ? `Update ${request.userRatingStars}★ Rating` : 'Rate Goalie'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentRequest(request)}
                              className="rounded-full bg-[var(--league-primary)] px-3 py-2 text-sm font-medium text-[var(--color-accent-text)]"
                            >
                              {request.paymentStatus === 'paid' ? 'Update Payment' : 'Mark Paid'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Available Goalie Pool</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Browse active goalies in your league marketplace before you send a request.
              </p>
            </div>

            {activeGoalies.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                No active goalies are in the league pool yet.
              </p>
            ) : (
              <div className="space-y-3">
                {activeGoalies.map((goalie) => (
                  <GoaliePoolCard key={goalie.id} goalie={goalie} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {requestGame && currentTeam?.team_id ? (
        <GoalieRequestModal
          isOpen={!!requestGame}
          onClose={() => {
            setRequestGame(null);
            refresh();
          }}
          gameId={requestGame.id}
          teamId={currentTeam.team_id}
          gameDateLabel={`${formatDateTime(requestGame.scheduledAt)}${requestGame.location ? ` • ${requestGame.location}` : ''}`}
        />
      ) : null}

      {ratingRequest ? (
        <GoalieRatingModal
        request={ratingRequest}
        teamId={currentTeam.team_id}
        onClose={() => setRatingRequest(null)}
        onSaved={refresh}
        />
      ) : null}

      {paymentRequest ? (
        <GoaliePaymentModal
        request={paymentRequest}
        teamId={currentTeam.team_id}
        onClose={() => setPaymentRequest(null)}
        onSaved={refresh}
        />
      ) : null}
    </div>
  );
}

function GoaliePoolCard({ goalie }: { goalie: CaptainGoalieMarketplaceItem }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-[var(--color-text-primary)]">{goalie.name}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--color-text-secondary)]">
            <span className="capitalize">{goalie.skillLevel}</span>
            <span>{goalie.hasFullGear ? 'Full gear' : 'Gear status unknown'}</span>
            <span>{goalie.ratePerGame > 0 ? `${formatCurrency(Math.round(goalie.ratePerGame * 100))}/game` : 'Rate TBD'}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-4 w-4" />
              {goalie.email}
            </span>
            {goalie.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {goalie.phone}
              </span>
            ) : null}
          </div>
          {goalie.preferredArenas.length > 0 ? (
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Preferred arenas: {goalie.preferredArenas.join(', ')}
            </p>
          ) : null}
        </div>
        <RatingStars rating={goalie.averageRating} count={goalie.ratingCount} />
      </div>
    </div>
  );
}
