'use client';

/**
 * Payment Report Export Component
 *
 * Allows league admins to export payment reports in various formats.
 * Includes filtering options and format selection.
 */

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, Filter, Calendar } from 'lucide-react';
import { exportPaymentReport } from '@/lib/payments/payment-actions';
import type { PaymentReportRow, PlayerPaymentStatus } from '@/lib/payments/types';

interface PaymentReportExportProps {
  leagueId: string;
  seasonId: string;
  seasonName: string;
  className?: string;
}

type ExportFormat = 'csv' | 'json';
type StatusFilter = PlayerPaymentStatus | 'all';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'paid', label: 'Paid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function PaymentReportExport({
  leagueId,
  seasonId,
  seasonName,
  className = '',
}: PaymentReportExportProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCSV = (data: PaymentReportRow[]): string => {
    const headers = [
      'Player Name',
      'Email',
      'Team',
      'Fee Name',
      'Payment Plan',
      'Total Amount',
      'Amount Paid',
      'Amount Outstanding',
      'Status',
      'Current Installment',
      'Total Installments',
      'Next Payment Date',
      'Created Date',
      'Paid Date',
    ];

    const rows = data.map((row) => [
      row.playerName,
      row.playerEmail,
      row.teamName || '',
      row.feeName,
      row.paymentPlan === 'full'
        ? 'Full'
        : row.paymentPlan === 'two_pay'
          ? '2-Pay'
          : '3-Pay',
      row.totalAmount.toFixed(2),
      row.amountPaid.toFixed(2),
      row.amountOutstanding.toFixed(2),
      row.status.replace('_', ' ').toUpperCase(),
      row.currentInstallment.toString(),
      row.totalInstallments.toString(),
      row.nextPaymentDate || '',
      row.createdAt,
      row.paidAt || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    return csvContent;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await exportPaymentReport(leagueId, seasonId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      let data = result.data;

      // Apply status filter
      if (statusFilter !== 'all') {
        data = data.filter((row) => row.status === statusFilter);
      }

      if (data.length === 0) {
        setError('No payments match the selected filters.');
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const sanitizedSeasonName = seasonName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const baseFilename = `payments-${sanitizedSeasonName}-${timestamp}`;

      if (format === 'csv') {
        const csvContent = generateCSV(data);
        downloadFile(csvContent, `${baseFilename}.csv`, 'text/csv;charset=utf-8');
      } else {
        const jsonContent = JSON.stringify(data, null, 2);
        downloadFile(jsonContent, `${baseFilename}.json`, 'application/json');
      }
    } catch (err) {
      setError('Failed to export report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-neutral-800 border border-gold-500/20 rounded-xl p-5 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gold-500/10 rounded-full flex items-center justify-center">
          <Download className="h-5 w-5 text-gold-500" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Export Payment Report</h3>
          <p className="text-sm text-neutral-400">{seasonName}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                format === 'csv'
                  ? 'bg-gold-500/10 border-gold-500/50 text-gold-500'
                  : 'bg-neutral-900/50 border-neutral-700 text-neutral-300 hover:border-gold-500/30'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="text-sm font-medium">CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setFormat('json')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                format === 'json'
                  ? 'bg-gold-500/10 border-gold-500/50 text-gold-500'
                  : 'bg-neutral-900/50 border-neutral-700 text-neutral-300 hover:border-gold-500/30'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">JSON</span>
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label
            htmlFor="statusFilter"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            Filter by Status
          </label>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full pl-10 pr-4 py-2.5 bg-black/50 border border-neutral-700 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-xl hover:shadow-[0_0_40px_rgba(212,175,55,0.2)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download {format.toUpperCase()} Report
            </>
          )}
        </button>

        {/* Info */}
        <p className="text-xs text-neutral-500 text-center">
          Report includes player details, payment amounts, and status for all fees
        </p>
      </div>
    </div>
  );
}

export default PaymentReportExport;
