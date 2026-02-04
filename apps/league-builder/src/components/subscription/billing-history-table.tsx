/**
 * Billing History Table Component
 *
 * Displays invoice history with status, amount, and download links.
 */

'use client';

import { format } from 'date-fns';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Invoice } from '@/lib/types/subscription';

interface BillingHistoryTableProps {
  invoices: Invoice[];
}

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function getStatusVariant(status: Invoice['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'open':
      return 'secondary';
    case 'uncollectible':
    case 'void':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getStatusLabel(status: Invoice['status']): string {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'open':
      return 'Open';
    case 'draft':
      return 'Draft';
    case 'uncollectible':
      return 'Uncollectible';
    case 'void':
      return 'Void';
    default:
      return status;
  }
}

export function BillingHistoryTable({ invoices }: BillingHistoryTableProps) {
  if (invoices.length === 0) {
    return (
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-neutral-100">Billing History</CardTitle>
          <CardDescription className="text-neutral-400">
            View your past invoices and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-400">No invoices yet</p>
            <p className="text-sm text-neutral-500 mt-2">
              Your billing history will appear here once you start a subscription
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-neutral-800/50 border-white/10">
      <CardHeader>
        <CardTitle className="text-neutral-100">Billing History</CardTitle>
        <CardDescription className="text-neutral-400">
          View and download your past invoices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-400">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-400">
                  Description
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-400">
                  Amount
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-400">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="py-3 px-4 text-sm text-neutral-200">
                    {invoice.paidAt
                      ? format(invoice.paidAt, 'MMM d, yyyy')
                      : invoice.dueDate
                        ? format(invoice.dueDate, 'MMM d, yyyy')
                        : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-neutral-200">
                    {invoice.description || 'Subscription payment'}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-neutral-100">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={getStatusVariant(invoice.status)}
                      className={
                        invoice.status === 'paid'
                          ? 'bg-green-500/20 text-green-300 border-green-500/30'
                          : invoice.status === 'open'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : invoice.status === 'uncollectible' || invoice.status === 'void'
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : ''
                      }
                    >
                      {getStatusLabel(invoice.status)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {invoice.invoiceUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="border-white/10 text-neutral-300 hover:bg-white/5"
                        >
                          <a href={invoice.invoiceUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </a>
                        </Button>
                      )}
                      {invoice.invoicePdf && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="border-white/10 text-neutral-300 hover:bg-white/5"
                        >
                          <a href={invoice.invoicePdf} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3 mr-1" />
                            PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
