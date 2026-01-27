"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  getUnpaidAssignments,
  markAssignmentPaid,
} from "@/lib/scorekeepers/actions";
import { ArrowLeft, CheckCircle, DollarSign, Calendar, Download } from "lucide-react";

type Assignment = any;

export default function ScorekeeperPaymentsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingAssignmentId, setPayingAssignmentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, []);

  async function loadAssignments() {
    setLoading(true);
    const result = await getUnpaidAssignments();

    if (result.error) {
      toast.error(result.error);
    } else {
      setAssignments(result.assignments);
    }

    setLoading(false);
  }

  async function handleMarkPaid(assignmentId: string) {
    setIsProcessing(true);
    const result = await markAssignmentPaid(assignmentId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Payment marked as paid!");
      setPayingAssignmentId(null);
      loadAssignments();
    }
    setIsProcessing(false);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const totalUnpaid = assignments.reduce((sum, a) => sum + (a.payment_amount || 0), 0);

  const exportToCSV = () => {
    // Create CSV content
    const headers = ['Date', 'Time', 'Scorekeeper', 'Home Team', 'Away Team', 'Amount'];
    const rows = assignments.map(a => [
      a.game?.game_date || '',
      a.game?.game_time ? formatTime(a.game.game_time) : '',
      a.scorekeeper_profile?.full_name || '',
      a.game?.home_team?.name || '',
      a.game?.away_team?.name || '',
      formatCurrency(a.payment_amount || 0),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `unpaid-scorekeepers-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Exported to CSV!');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("../scorekeepers")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Scorekeepers
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Scorekeeper Payments</h1>
        <p className="text-muted-foreground mt-2">
          Track and manage unpaid scorekeeper assignments.
        </p>
      </div>

      {/* Summary Card */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unpaid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalUnpaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {assignments.length} unpaid assignment{assignments.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Scorekeepers</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(assignments.map(a => a.scorekeeper_id)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              With pending payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={exportToCSV}
          disabled={assignments.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {/* Payments Table */}
      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">All caught up!</p>
            <p className="text-muted-foreground">No unpaid scorekeeper assignments at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Unpaid Assignments ({assignments.length})</CardTitle>
            <CardDescription>
              Review and mark assignments as paid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Scorekeeper</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {assignment.game?.game_date ? formatDate(assignment.game.game_date) : '-'}
                          </span>
                          {assignment.game?.game_time && (
                            <span className="text-sm text-muted-foreground">
                              {formatTime(assignment.game.game_time)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={assignment.scorekeeper_profile?.avatar_url} />
                            <AvatarFallback>
                              {assignment.scorekeeper_profile?.full_name?.substring(0, 2).toUpperCase() || "SK"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {assignment.scorekeeper_profile?.full_name || "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {assignment.scorekeeper_profile?.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {assignment.game?.home_team?.name || '?'} vs {assignment.game?.away_team?.name || '?'}
                          </span>
                          {assignment.completed_at && (
                            <span className="text-xs text-muted-foreground">
                              Completed {formatDate(assignment.completed_at)}
                            </span>
                          )}
                          {!assignment.completed_at && assignment.checked_in_at && (
                            <Badge variant="outline" className="text-xs w-fit mt-1">In Progress</Badge>
                          )}
                          {!assignment.completed_at && !assignment.checked_in_at && (
                            <Badge variant="secondary" className="text-xs w-fit mt-1">Pending</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-orange-600">
                          {formatCurrency(assignment.payment_amount || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setPayingAssignmentId(assignment.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Paid
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Payment Dialog */}
      <AlertDialog open={!!payingAssignmentId} onOpenChange={(open) => !open && setPayingAssignmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Assignment as Paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the assignment as paid and record the payment timestamp.
              Make sure you have completed the actual payment to the scorekeeper before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => payingAssignmentId && handleMarkPaid(payingAssignmentId)}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? "Processing..." : "Confirm Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
