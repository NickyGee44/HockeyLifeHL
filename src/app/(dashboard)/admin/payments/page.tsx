"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllPayments, createPayment, updatePayment, deletePayment } from "@/lib/payments/actions";
import { getAllPlayers } from "@/lib/admin/actions";
import { getAllSeasons } from "@/lib/seasons/actions";
import { toast } from "sonner";

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  e_transfer: "E-Transfer",
  stripe: "Stripe",
  check: "Check",
  other: "Other",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  completed: "Completed",
  refunded: "Refunded",
  failed: "Failed",
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [formData, setFormData] = useState({
    player_id: "",
    season_id: "none", // Use "none" instead of empty string for Select component
    amount: "",
    payment_method: "cash",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
    status: "completed",
  });

  useEffect(() => {
    loadData();
  }, [selectedSeason]);

  async function loadData() {
    const [paymentsResult, playersResult, seasonsResult] = await Promise.all([
      getAllPayments(selectedSeason === "all" ? undefined : selectedSeason),
      getAllPlayers(),
      getAllSeasons(),
    ]);
    
    if (paymentsResult.payments) {
      setPayments(paymentsResult.payments);
    }
    if (playersResult.players) {
      setPlayers(playersResult.players);
    }
    if (seasonsResult.seasons) {
      setSeasons(seasonsResult.seasons);
    }
    setLoading(false);
  }

  async function handleCreate() {
    const form = new FormData();
    form.set("player_id", formData.player_id);
    if (formData.season_id && formData.season_id !== "none") {
      form.set("season_id", formData.season_id);
    }
    form.set("amount", formData.amount);
    form.set("payment_method", formData.payment_method);
    form.set("payment_date", formData.payment_date);
    form.set("notes", formData.notes);
    form.set("status", formData.status);

    const result = await createPayment(form);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Payment recorded");
      setIsCreateOpen(false);
      setFormData({
        player_id: "",
        season_id: "none",
        amount: "",
        payment_method: "cash",
        payment_date: new Date().toISOString().split("T")[0],
        notes: "",
        status: "completed",
      });
      loadData();
    }
  }

  async function handleUpdate() {
    if (!editingPayment) return;
    
    const form = new FormData();
    form.set("amount", formData.amount);
    form.set("payment_method", formData.payment_method);
    form.set("payment_date", formData.payment_date);
    form.set("notes", formData.notes);
    form.set("status", formData.status);

    const result = await updatePayment(editingPayment.id, form);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Payment updated");
      setEditingPayment(null);
      loadData();
    }
  }

  async function handleDelete(paymentId: string) {
    if (!confirm("Are you sure you want to delete this payment?")) return;

    const result = await deletePayment(paymentId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Payment deleted");
      loadData();
    }
  }

  const totalAmount = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  const byMethod = payments
    .filter((p) => p.status === "completed")
    .reduce((acc: Record<string, number>, p) => {
      const method = p.payment_method;
      acc[method] = (acc[method] || 0) + parseFloat(p.amount.toString());
      return acc;
    }, {});

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments 💳</h1>
          <p className="text-muted-foreground mt-2">
            Track player payments and league fees
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-canada-red hover:bg-canada-red-dark">
              + Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Player *</Label>
                <Select value={formData.player_id} onValueChange={(v) => setFormData({ ...formData, player_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.full_name} {player.jersey_number ? `#${player.jersey_number}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Season</Label>
                <Select value={formData.season_id} onValueChange={(v) => setFormData({ ...formData, season_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select season (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No season</SelectItem>
                    {seasons.map((season) => (
                      <SelectItem key={season.id} value={season.id}>
                        {season.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount ($) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Date *</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="e_transfer">E-Transfer</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <textarea
                  className="w-full min-h-[80px] p-2 border rounded"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes about this payment..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} className="bg-canada-red hover:bg-canada-red-dark">Record Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Collected</CardDescription>
            <CardTitle className="text-2xl">${totalAmount.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Payments</CardDescription>
            <CardTitle className="text-2xl">{payments.filter((p) => p.status === "completed").length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>By Stripe</CardDescription>
            <CardTitle className="text-2xl">${(byMethod.stripe || 0).toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>By E-Transfer</CardDescription>
            <CardTitle className="text-2xl">${(byMethod.e_transfer || 0).toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedSeason} onValueChange={setSelectedSeason}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by season" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {seasons.map((season) => (
              <SelectItem key={season.id} value={season.id}>
                {season.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No payments recorded yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.player?.full_name} {payment.player?.jersey_number ? `#${payment.player.jersey_number}` : ""}
                    </TableCell>
                    <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                    <TableCell>${parseFloat(payment.amount.toString()).toFixed(2)}</TableCell>
                    <TableCell>{paymentMethodLabels[payment.payment_method] || payment.payment_method}</TableCell>
                    <TableCell>
                      <Badge
                        variant={payment.status === "completed" ? "default" : "outline"}
                        className={payment.status === "completed" ? "bg-green-600" : ""}
                      >
                        {statusLabels[payment.status] || payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.season?.name || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">{payment.notes || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPayment(payment);
                            setFormData({
                              player_id: payment.player_id,
                              season_id: payment.season_id || "none",
                              amount: payment.amount.toString(),
                              payment_method: payment.payment_method,
                              payment_date: payment.payment_date,
                              notes: payment.notes || "",
                              status: payment.status,
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(payment.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingPayment} onOpenChange={() => setEditingPayment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Date *</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="e_transfer">E-Transfer</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                className="w-full min-h-[80px] p-2 border rounded"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPayment(null)}>Cancel</Button>
            <Button onClick={handleUpdate} className="bg-canada-red hover:bg-canada-red-dark">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
