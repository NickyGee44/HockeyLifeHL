/**
 * Billing History Component
 *
 * Displays past invoices with download and view options.
 */

'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { getBillingHistory } from '@/lib/actions/subscription';
import type { Invoice } from '@/lib/types/subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function BillingHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadInvoices() {
    setLoading(true);
    const result = await getBillingHistory();

    if (result.success) {
      setInvoices(result.data.invoices);
    } else {
      toast.error('Failed to load billing history', {
        description: result.error,
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  function getStatusBadge(status: Invoice['status']) {
    switch (status) {
      case 'paid':
        return <Badge variant="default">Paid</Badge>;
      case 'open':
        return <Badge variant="secondary">Open</Badge>;
      case 'void':
        return <Badge variant="outline">Void</Badge>;
      case 'uncollectible':
        return <Badge variant="destructive">Uncollectible</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Loading invoices...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>No invoices found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Your billing history will appear here once you have invoices.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
        <CardDescription>View and download your past invoices</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.paidAt
                      ? format(invoice.paidAt, 'MMM d, yyyy')
                      : invoice.dueDate
                      ? format(invoice.dueDate, 'MMM d, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {invoice.description || 'Subscription payment'}
                  </TableCell>
                  <TableCell>
                    ${(invoice.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {invoice.invoiceUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          title="View invoice"
                        >
                          <a
                            href={invoice.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {invoice.invoicePdf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          title="Download PDF"
                        >
                          <a
                            href={invoice.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
