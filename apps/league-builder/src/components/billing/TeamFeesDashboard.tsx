'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  DollarSign,
  Users,
  TrendingUp,
  AlertCircle,
  FileText,
  CreditCard,
  XCircle,
} from 'lucide-react';
import {
  getTeamInvoices,
  generateTeamInvoices,
  recordTeamPayment,
  updateTeamInvoice,
  getTeamBillingSummary,
} from '@/lib/actions/team-billing';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface TeamFeesDashboardProps {
  leagueId: string;
  seasonId: string;
}

interface TeamInvoice {
  id: string;
  team_id: string;
  total_players: number;
  fee_basis?: 'player' | 'team';
  fee_per_player_cents: number;
  total_amount_cents: number;
  amount_paid_cents: number;
  status: string;
  payment_deadline: string | null;
  notes: string | null;
  team?: { id: string; name: string } | null;
  player_target_total_cents?: number;
  player_paid_cents?: number;
  team_payment_total_cents?: number;
  unallocated_target_cents?: number;
}

interface BillingSummary {
  total_invoiced_cents: number;
  total_collected_cents: number;
  outstanding_cents: number;
  team_count: number;
  paid_count: number;
  overdue_count: number;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}

function getInvoiceFeeSetup(invoice: TeamInvoice): string {
  if (invoice.fee_basis === 'team') {
    return 'Flat team fee';
  }

  return formatCurrency(invoice.fee_per_player_cents);
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  partial: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  paid: 'bg-green-500/10 text-green-500 border-green-500/30',
  overdue: 'bg-red-500/10 text-red-500 border-red-500/30',
  waived: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30',
};

export function TeamFeesDashboard({ leagueId, seasonId }: TeamFeesDashboardProps) {
  const t = useTranslations('teamBilling');
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<TeamInvoice[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; invoiceId: string | null; teamId: string | null }>({
    open: false,
    invoiceId: null,
    teamId: null,
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'e_transfer',
    reference: '',
    notes: '',
    playerAttribution: '', // 'captain', a player ID, or '' for team-level
  });
  const [teamPlayers, setTeamPlayers] = useState<{ id: string; name: string }[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  async function loadData() {
    setLoading(true);
    const [invoicesResult, summaryResult] = await Promise.all([
      getTeamInvoices(leagueId, seasonId),
      getTeamBillingSummary(leagueId, seasonId),
    ]);

    if (invoicesResult.success) {
      setInvoices(invoicesResult.data || []);
    }
    if (summaryResult.success) {
      setSummary(summaryResult.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData is a data-fetching function that depends on leagueId and seasonId; also called from event handlers
  }, [leagueId, seasonId]);

  async function loadTeamPlayers(teamId: string) {
    setLoadingPlayers(true);
    try {
      const supabase = createClient();
      const { data } = await (supabase as any)
        .from('season_registrations')
        .select('player_id, profiles:player_id(id, first_name, last_name)')
        .eq('season_id', seasonId)
        .eq('team_id', teamId);

      const players = (data ?? [])
        .map((r: any) => ({
          id: r.profiles?.id ?? r.player_id,
          name: `${r.profiles?.first_name ?? ''} ${r.profiles?.last_name ?? ''}`.trim() || 'Unknown Player',
        }))
        .filter((p: any) => p.id)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      setTeamPlayers(players);
    } catch {
      setTeamPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  }

  function handleGenerateInvoices() {
    startTransition(async () => {
      const result = await generateTeamInvoices(leagueId, seasonId);
      if (result.success) {
        toast.success(t('invoicesGenerated', { count: result.data?.generated || 0 }));
        loadData();
      } else {
        toast.error(result.error || 'Failed to generate invoices');
      }
    });
  }

  function handleRecordPayment() {
    if (!paymentModal.invoiceId || !paymentForm.amount) return;

    const amountCents = Math.round(parseFloat(paymentForm.amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Build notes with player attribution
    let combinedNotes = '';
    if (paymentForm.playerAttribution === 'captain') {
      combinedNotes = '[Submitted by team captain]';
    } else if (paymentForm.playerAttribution && paymentForm.playerAttribution !== '') {
      const player = teamPlayers.find(p => p.id === paymentForm.playerAttribution);
      if (player) {
        combinedNotes = `[Recorded for: ${player.name}]`;
      }
    }
    if (paymentForm.notes) {
      combinedNotes = combinedNotes ? `${combinedNotes} ${paymentForm.notes}` : paymentForm.notes;
    }

    startTransition(async () => {
      const result = await recordTeamPayment(paymentModal.invoiceId!, {
        amount_cents: amountCents,
        payment_method: paymentForm.method,
        reference_number: paymentForm.reference || undefined,
        notes: combinedNotes || undefined,
      });

      if (result.success) {
        toast.success(t('paymentRecorded'));
        setPaymentModal({ open: false, invoiceId: null, teamId: null });
        setPaymentForm({ amount: '', method: 'e_transfer', reference: '', notes: '', playerAttribution: '' });
        setTeamPlayers([]);
        loadData();
      } else {
        toast.error(result.error || 'Failed to record payment');
      }
    });
  }

  function handleWaiveFee(invoiceId: string) {
    startTransition(async () => {
      const result = await updateTeamInvoice(invoiceId, { status: 'waived' });
      if (result.success) {
        toast.success(t('feeWaived'));
        loadData();
      } else {
        toast.error(result.error || 'Failed to waive fee');
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-rink-500" />
      </div>
    );
  }

  const collectionRate = summary && summary.total_invoiced_cents > 0
    ? Math.round((summary.total_collected_cents / summary.total_invoiced_cents) * 100)
    : 0;
  const contributionInvoices = invoices.filter((invoice) => invoice.fee_basis === 'team');
  const contributionTargets = contributionInvoices.reduce(
    (sum, invoice) => sum + (invoice.player_target_total_cents || 0),
    0
  );
  const contributionPaid = contributionInvoices.reduce(
    (sum, invoice) => sum + (invoice.player_paid_cents || 0),
    0
  );
  const contributionUnallocated = contributionInvoices.reduce(
    (sum, invoice) => sum + (invoice.unallocated_target_cents || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div
          className={cn(
            'grid gap-4',
            contributionInvoices.length > 0 ? 'md:grid-cols-4 xl:grid-cols-7' : 'md:grid-cols-4'
          )}
        >
          <SummaryCard
            label={t('totalInvoiced')}
            value={formatCurrency(summary.total_invoiced_cents)}
            icon={<FileText className="w-5 h-5 text-rink-500" />}
          />
          <SummaryCard
            label={t('totalCollected')}
            value={formatCurrency(summary.total_collected_cents)}
            icon={<DollarSign className="w-5 h-5 text-green-500" />}
          />
          <SummaryCard
            label={t('outstanding')}
            value={formatCurrency(summary.outstanding_cents)}
            icon={<AlertCircle className="w-5 h-5 text-yellow-500" />}
          />
          <SummaryCard
            label={t('collectionRate')}
            value={`${collectionRate}%`}
            icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
          />
          {contributionInvoices.length > 0 && (
            <>
              <SummaryCard
                label="Player Targets"
                value={formatCurrency(contributionTargets)}
                icon={<Users className="w-5 h-5 text-sky-400" />}
              />
              <SummaryCard
                label="Player Paid"
                value={formatCurrency(contributionPaid)}
                icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
              />
              <SummaryCard
                label="Unallocated"
                value={formatCurrency(contributionUnallocated)}
                icon={<AlertCircle className="w-5 h-5 text-amber-400" />}
              />
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{t('teamFeeSummary')}</h3>
        <Button
          onClick={handleGenerateInvoices}
          disabled={isPending}
          className={cn(
            'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold',
            'hover:shadow-lg hover:shadow-rink-500/20'
          )}
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <FileText className="w-4 h-4 mr-2" />
          {t('generateInvoices')}
        </Button>
      </div>

      {/* Invoices Table */}
      {invoices.length === 0 ? (
        <div className="text-center py-12 bg-white/[0.04] border border-white/10 rounded-xl">
          <Users className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-400">{t('noInvoices')}</p>
          <p className="text-sm text-neutral-500">{t('noInvoicesDescription')}</p>
        </div>
      ) : (
        <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {t('teamName')}
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {t('players')}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Fee setup
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {t('total')}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {t('paid')}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {t('balance')}
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invoices.map((invoice) => {
                  const balance = invoice.total_amount_cents - invoice.amount_paid_cents;
                  const isZeroBalancePlaceholder =
                    invoice.status === 'waived' &&
                    invoice.total_amount_cents === 0 &&
                    invoice.total_players === 0;
                  return (
                    <tr key={invoice.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-white">
                        {invoice.team?.name || 'Unknown Team'}
                      </td>
                      <td className="px-4 py-3 text-center text-neutral-300">
                        {invoice.total_players}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-300">
                        {getInvoiceFeeSetup(invoice)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white">
                        {formatCurrency(invoice.total_amount_cents)}
                        {invoice.fee_basis === 'team' && (
                          <p className="mt-1 text-xs text-neutral-500">
                            Player targets:{' '}
                            {formatCurrency(invoice.player_target_total_cents || 0)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-green-500">
                        {formatCurrency(invoice.amount_paid_cents)}
                        {invoice.fee_basis === 'team' && (
                          <p className="mt-1 text-xs text-neutral-500">
                            Players {formatCurrency(invoice.player_paid_cents || 0)} • Team{' '}
                            {formatCurrency(invoice.team_payment_total_cents || 0)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white">
                        {formatCurrency(balance)}
                        {invoice.fee_basis === 'team' && (
                          <p className="mt-1 text-xs text-neutral-500">
                            Unallocated:{' '}
                            {formatCurrency(invoice.unallocated_target_cents || 0)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                            STATUS_STYLES[invoice.status] || STATUS_STYLES.pending
                          )}
                        >
                          {isZeroBalancePlaceholder
                            ? 'No Balance Yet'
                            : t(`status${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {invoice.status !== 'paid' && invoice.status !== 'waived' && (
                            <>
                              <button
                                onClick={() => {
                                  setPaymentModal({ open: true, invoiceId: invoice.id, teamId: invoice.team_id });
                                  if (invoice.team_id) loadTeamPlayers(invoice.team_id);
                                }}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-green-500 transition-colors"
                                title={t('recordPayment')}
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleWaiveFee(invoice.id)}
                                disabled={isPending}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-yellow-500 transition-colors"
                                title={t('waiveFee')}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Dialog
        open={paymentModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentModal({ open: false, invoiceId: null, teamId: null });
            setPaymentForm({ amount: '', method: 'e_transfer', reference: '', notes: '', playerAttribution: '' });
            setTeamPlayers([]);
          }
        }}
      >
        <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('recordPayment')}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Record a payment received for this team invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm text-neutral-300">{t('amount')}</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="pl-7 bg-neutral-800 border-white/10 text-white"
                />
              </div>
            </div>

            {/* Player Attribution */}
            <div>
              <Label className="text-sm text-neutral-300">Recorded for</Label>
              <p className="text-xs text-neutral-500 mt-0.5 mb-1.5">
                Which player is this payment for, or was it submitted by a team captain?
              </p>
              <Select
                value={paymentForm.playerAttribution}
                onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, playerAttribution: value }))}
              >
                <SelectTrigger className="mt-1 bg-neutral-800 border-white/10 text-white">
                  <SelectValue placeholder="Select player or captain..." />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-white/10 max-h-60">
                  <SelectItem value="team_level" className="text-white">Team-level payment (no specific player)</SelectItem>
                  <SelectItem value="captain" className="text-white">Submitted by team captain</SelectItem>
                  {loadingPlayers ? (
                    <SelectItem value="loading" disabled className="text-neutral-500">
                      Loading players...
                    </SelectItem>
                  ) : (
                    teamPlayers.map((player) => (
                      <SelectItem key={player.id} value={player.id} className="text-white">
                        {player.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm text-neutral-300">{t('paymentMethod')}</Label>
              <Select
                value={paymentForm.method}
                onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, method: value }))}
              >
                <SelectTrigger className="mt-1 bg-neutral-800 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-white/10">
                  <SelectItem value="stripe" className="text-white">{t('stripe')}</SelectItem>
                  <SelectItem value="e_transfer" className="text-white">{t('eTransfer')}</SelectItem>
                  <SelectItem value="cash" className="text-white">{t('cash')}</SelectItem>
                  <SelectItem value="check" className="text-white">{t('check')}</SelectItem>
                  <SelectItem value="other" className="text-white">{t('other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm text-neutral-300">{t('referenceNumber')}</Label>
              <Input
                placeholder="e.g. e-Transfer confirmation #"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
                className="mt-1 bg-neutral-800 border-white/10 text-white placeholder:text-neutral-500"
              />
            </div>

            <div>
              <Label className="text-sm text-neutral-300">{t('notes')}</Label>
              <Textarea
                placeholder="Optional notes..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="mt-1 bg-neutral-800 border-white/10 text-white placeholder:text-neutral-500 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentModal({ open: false, invoiceId: null, teamId: null });
                setTeamPlayers([]);
              }}
              className="border-white/10 text-neutral-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={isPending || !paymentForm.amount}
              className="bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('recordPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <div className="shrink-0">{icon}</div>
        <span className="text-xs sm:text-sm text-neutral-400 truncate">{label}</span>
      </div>
      <p className="text-lg sm:text-2xl font-bold text-white truncate">{value}</p>
    </div>
  );
}
