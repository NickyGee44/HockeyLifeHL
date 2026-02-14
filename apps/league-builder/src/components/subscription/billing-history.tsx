/**
 * Billing History Component
 *
 * Displays past invoices with download and view options.
 */

'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('subscription.billingHistory');
  const tStatus = useTranslations('subscription.billingHistory.statusLabels');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadInvoices() {
    setLoading(true);
    const result = await getBillingHistory();

    if (result.success) {
      setInvoices(result.data.invoices);
    } else {
      toast.error(t('failedLoad'), {
        description: result.error,
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: loadInvoices uses t() for error messages but t is a stable ref from next-intl
  }, []);

  function getStatusBadge(status: Invoice['status']) {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      paid: 'default',
      open: 'secondary',
      void: 'outline',
      uncollectible: 'destructive',
    };
    const variant = variants[status] || 'outline';
    const label = ['paid', 'open', 'void', 'uncollectible', 'draft'].includes(status)
      ? tStatus(status as 'paid' | 'open' | 'void' | 'uncollectible' | 'draft')
      : status;
    return <Badge variant={variant}>{label}</Badge>;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('loadingInvoices')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('noInvoices')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              {t('noInvoicesDesc')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('descriptionCol')}</TableHead>
                <TableHead>{t('amountCol')}</TableHead>
                <TableHead>{t('statusCol')}</TableHead>
                <TableHead className="text-right">{t('actionsCol')}</TableHead>
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
                    {invoice.description || t('subscriptionPayment')}
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
