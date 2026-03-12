'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  getRefereePayrollReport,
  type RefereePayrollLineItem,
  type RefereePayrollSummary,
} from '@/lib/actions/referee-management';
import { Download, Loader2, RefreshCw } from 'lucide-react';

interface RefereePayrollReportProps {
  leagueId: string;
  seasons: Array<{ id: string; name: string }>;
  refreshNonce?: number;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}

export function RefereePayrollReport({
  leagueId,
  seasons,
  refreshNonce = 0,
}: RefereePayrollReportProps) {
  const [isPending, startTransition] = useTransition();
  const [seasonId, setSeasonId] = useState(seasons[0]?.id || 'all');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [lineItems, setLineItems] = useState<RefereePayrollLineItem[]>([]);
  const [summary, setSummary] = useState<RefereePayrollSummary[]>([]);
  const [totals, setTotals] = useState({
    assignments: 0,
    totalAmountCents: 0,
    paidAmountCents: 0,
    pendingAmountCents: 0,
  });
  const [unlinkedAssignments, setUnlinkedAssignments] = useState(0);

  const loadReport = () => {
    startTransition(async () => {
      const result = await getRefereePayrollReport({
        leagueId,
        seasonId: seasonId === 'all' ? undefined : seasonId,
        paymentStatus,
      });

      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to load referee payroll report.');
        return;
      }

      setLineItems(result.data.lineItems);
      setSummary(result.data.summary);
      setTotals(result.data.totals);
      setUnlinkedAssignments(result.data.unlinkedAssignments);
    });
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, seasonId, paymentStatus, refreshNonce]);

  const csvData = useMemo(() => {
    const header = [
      'Referee',
      'Referee ID',
      'Date',
      'Matchup',
      'Venue',
      'Role',
      'Rule',
      'Amount CAD',
      'Payment Status',
      'Jersey',
    ];

    const rows = lineItems.map((line) => [
      line.refereeName,
      line.refereeIdentifier || '',
      format(new Date(line.scheduledAt), 'yyyy-MM-dd HH:mm'),
      line.matchup,
      line.venue || '',
      line.role,
      line.paymentRuleApplied,
      (line.paymentAmountCents / 100).toFixed(2),
      line.paymentStatus,
      line.jerseyNumber || '',
    ]);

    return [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(',')
      )
      .join('\n');
  }, [lineItems]);

  const exportCsv = () => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'referee-payroll-report.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Referee Payroll Report</h2>
          <p className="text-sm text-neutral-400">
            Bookkeeper-ready assignment-to-pay summary using the configured referee pay rules.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={seasonId}
            onChange={(event) => setSeasonId(event.target.value)}
            className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white"
          >
            <option value="all">All seasons</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
          <select
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value as 'all' | 'pending' | 'paid')}
            className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={loadReport}
            disabled={isPending}
            className="border-white/10 text-neutral-300"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={lineItems.length === 0}
            className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {unlinkedAssignments > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {unlinkedAssignments} official assignment{unlinkedAssignments === 1 ? '' : 's'} could not be tied to a referee payroll record yet.
          Those assignments need to be re-assigned from the referee tools before they show up in payroll.
        </div>
      )}

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <SummaryCard label="Assignments" value={String(totals.assignments)} />
        <SummaryCard label="Total" value={formatCurrency(totals.totalAmountCents)} />
        <SummaryCard label="Pending" value={formatCurrency(totals.pendingAmountCents)} />
        <SummaryCard label="Paid" value={formatCurrency(totals.paidAmountCents)} />
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-2">
        {summary.map((row) => (
          <div key={row.refereeId} className="rounded-xl border border-white/10 bg-black/10 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white">{row.refereeName}</p>
                <p className="text-xs text-neutral-500">
                  {row.refereeIdentifier || 'No referee ID'} · {row.assignments} assignment{row.assignments === 1 ? '' : 's'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{formatCurrency(row.totalAmountCents)}</p>
                <p className="text-xs text-neutral-500">
                  Pending {formatCurrency(row.pendingAmountCents)}
                </p>
              </div>
            </div>
          </div>
        ))}
        {!isPending && summary.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-black/10 p-4 text-sm text-neutral-400">
            No referee payroll items matched this filter yet.
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/[0.03]">
            <tr className="text-left text-neutral-400">
              <th className="px-4 py-3 font-medium">Referee</th>
              <th className="px-4 py-3 font-medium">Game</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Rule</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((line) => (
              <tr key={line.officialId} className="border-t border-white/10 text-neutral-200">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{line.refereeName}</p>
                    <p className="text-xs text-neutral-500">
                      {line.refereeIdentifier || 'No ID'}{line.jerseyNumber ? ` · #${line.jerseyNumber}` : ''}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p>{line.matchup}</p>
                    <p className="text-xs text-neutral-500">
                      {format(new Date(line.scheduledAt), 'MMM d, yyyy h:mm a')}
                      {line.venue ? ` · ${line.venue}` : ''}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 capitalize">{line.role}</td>
                <td className="px-4 py-3 capitalize">{line.paymentRuleApplied.replaceAll('_', ' ')}</td>
                <td className="px-4 py-3 font-medium text-white">{formatCurrency(line.paymentAmountCents)}</td>
                <td className="px-4 py-3">
                  <span className={line.paymentStatus === 'paid' ? 'text-green-400' : 'text-amber-300'}>
                    {line.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
            {!isPending && lineItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  No payroll line items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-4">
      <p className="text-sm text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}
