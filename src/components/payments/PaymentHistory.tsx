"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlayerPayments, getPlayerPaymentSummary } from "@/lib/payments/actions";
import { toast } from "sonner";

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  e_transfer: "E-Transfer",
  stripe: "Stripe",
  check: "Check",
  other: "Other",
};

export function PaymentHistory({ playerId }: { playerId: string }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [playerId]);

  async function loadData() {
    const [paymentsResult, summaryResult] = await Promise.all([
      getPlayerPayments(playerId),
      getPlayerPaymentSummary(playerId),
    ]);

    if (paymentsResult.payments) {
      setPayments(paymentsResult.payments);
    }
    if (summaryResult && !summaryResult.error) {
      setSummary(summaryResult);
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading payment history...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
        <CardDescription>Your league fee payments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && (
          <div className="grid gap-4 md:grid-cols-3 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold">${summary.totalPaid.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payments</p>
              <p className="text-2xl font-bold">{summary.paymentCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Payment</p>
              <p className="text-2xl font-bold">
                {payments.length > 0
                  ? new Date(payments[0].payment_date).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
        )}

        {payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No payments recorded yet
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">${parseFloat(payment.amount.toString()).toFixed(2)}</p>
                    <Badge
                      variant={payment.status === "completed" ? "default" : "outline"}
                      className={payment.status === "completed" ? "bg-green-600" : ""}
                    >
                      {payment.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethodLabels[payment.payment_method] || payment.payment_method} •{" "}
                    {new Date(payment.payment_date).toLocaleDateString()}
                    {payment.season && ` • ${payment.season.name}`}
                  </p>
                  {payment.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
