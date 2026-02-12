/**
 * Payment History Table Component
 *
 * Displays paginated list of Connect payments with filtering.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { getLeaguePayments, refundPayment } from '@/lib/actions/stripe-connect-payments';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Payment {
  id: string;
  stripe_payment_intent_id: string;
  amount_cents: number;
  application_fee_cents: number;
  currency: string;
  status: string;
  description: string | null;
  customer_email: string | null;
  created_at: string;
}

interface PaymentHistoryTableProps {
  leagueId: string;
  isConnected: boolean;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; labelKey: string }> = {
  pending: {
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    labelKey: 'pending',
  },
  succeeded: {
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    labelKey: 'succeeded',
  },
  failed: {
    icon: XCircle,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    labelKey: 'failed',
  },
  refunded: {
    icon: RotateCcw,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    labelKey: 'refunded',
  },
  partially_refunded: {
    icon: RotateCcw,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    labelKey: 'partialRefund',
  },
};

const PAGE_SIZE = 10;

export function PaymentHistoryTable({ leagueId, isConnected }: PaymentHistoryTableProps) {
  const t = useTranslations('billing.paymentHistory');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Refund dialog state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refunding, setRefunding] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!isConnected) {
      setLoading(false);
      return;
    }

    const result = await getLeaguePayments(leagueId, {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });

    if (result.success) {
      setPayments(result.data.payments);
      setTotal(result.data.total);
    } else {
      toast.error('Failed to load payments', {
        description: result.error,
      });
    }

    setLoading(false);
    setRefreshing(false);
  }, [leagueId, isConnected, page, statusFilter]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  function handleRefresh() {
    setRefreshing(true);
    loadPayments();
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value);
    setPage(0);
  }

  function handleRefundClick(payment: Payment) {
    setSelectedPayment(payment);
    setRefundDialogOpen(true);
  }

  async function handleRefundConfirm() {
    if (!selectedPayment) return;

    setRefunding(true);

    const result = await refundPayment(
      leagueId,
      selectedPayment.id,
      undefined, // Full refund
      'requested_by_customer'
    );

    if (result.success) {
      toast.success('Refund initiated', {
        description: `Refunded ${formatCurrency(result.data.amount)}`,
      });
      setRefundDialogOpen(false);
      loadPayments();
    } else {
      toast.error('Refund failed', {
        description: result.error,
      });
    }

    setRefunding(false);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('completeSetup')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('setupPayments')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>
                {t('totalPayments', { count: total })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t('filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="succeeded">{t('succeeded')}</SelectItem>
                  <SelectItem value="pending">{t('pending')}</SelectItem>
                  <SelectItem value="failed">{t('failed')}</SelectItem>
                  <SelectItem value="refunded">{t('refunded')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('noPayments')}</p>
              {statusFilter !== 'all' && (
                <Button
                  variant="link"
                  onClick={() => setStatusFilter('all')}
                  className="mt-2"
                >
                  {t('clearFilter')}
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('description')}</TableHead>
                    <TableHead>{t('customer')}</TableHead>
                    <TableHead>{t('amount')}</TableHead>
                    <TableHead>{t('fee')}</TableHead>
                    <TableHead>{t('net')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const statusConfig = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;
                    const netAmount = payment.amount_cents - payment.application_fee_cents;

                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(payment.created_at), 'MMM d, yyyy')}
                          <span className="block text-xs text-muted-foreground">
                            {format(new Date(payment.created_at), 'h:mm a')}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {payment.description || 'Payment'}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          {payment.customer_email || '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amount_cents)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatCurrency(payment.application_fee_cents)}
                        </TableCell>
                        <TableCell className="font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(netAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${statusConfig.color} gap-1`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {t(statusConfig.labelKey)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.status === 'succeeded' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRefundClick(payment)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              {t('refund')}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    {t('showing', { start: page * PAGE_SIZE + 1, end: Math.min((page + 1) * PAGE_SIZE, total), total })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {t('page', { current: page + 1, total: totalPages })}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Refund Confirmation Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmRefund')}</DialogTitle>
            <DialogDescription>
              {t('confirmRefundDesc')}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-2 py-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('amount')}</span>
                <span className="font-medium">
                  {formatCurrency(selectedPayment.amount_cents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('customer')}</span>
                <span>{selectedPayment.customer_email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('description')}</span>
                <span>{selectedPayment.description || 'Payment'}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundDialogOpen(false)}
              disabled={refunding}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefundConfirm}
              disabled={refunding}
            >
              {refunding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('refundPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
