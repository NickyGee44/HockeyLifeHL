import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { redirect } from "next/navigation";

/**
 * Scorekeeper Payment Dashboard
 *
 * Displays all payment information for the logged-in scorekeeper:
 * - Total earned
 * - Paid amount
 * - Pending payments
 * - Payment history with game details
 */

interface PageProps {
  params: {
    league: string;
  };
}

export default async function PaymentsPage({ params }: PageProps) {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get scorekeeper profile
  const { data: scorekeeper } = await (supabase as any)
    .from('league_scorekeepers')
    .select('*, profile:profiles(*)')
    .eq('user_id', user.id)
    .single();

  if (!scorekeeper) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Not a Scorekeeper</h2>
          <p className="text-muted-foreground">
            You are not registered as a scorekeeper for this league.
          </p>
        </div>
      </div>
    );
  }

  // Get all game assignments for this scorekeeper
  const { data: assignments } = await supabase
    .from('game_scorekeeper_assignments')
    .select(`
      *,
      game:games(
        *,
        home_team:teams!games_home_team_id_fkey(name),
        away_team:teams!games_away_team_id_fkey(name)
      )
    `)
    .eq('scorekeeper_id', user.id)
    .eq('league_id', params.league)
    .order('created_at', { ascending: false });

  // Calculate payment totals
  const totalEarned = assignments?.reduce((sum, a) => sum + (a.payment_amount || 0), 0) || 0;
  const totalPaid = assignments?.filter(a => a.payment_status === 'paid').reduce((sum, a) => sum + (a.payment_amount || 0), 0) || 0;
  const totalPending = assignments?.filter(a => a.payment_status === 'pending' || a.payment_status === 'approved').reduce((sum, a) => sum + (a.payment_amount || 0), 0) || 0;

  // Stats by status
  const completedGames = assignments?.filter(a => a.completed_at).length || 0;
  const pendingPayments = assignments?.filter(a => a.payment_status === 'pending').length || 0;
  const approvedPayments = assignments?.filter(a => a.payment_status === 'approved').length || 0;
  const paidPayments = assignments?.filter(a => a.payment_status === 'paid').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Payments</h1>
          <p className="text-muted-foreground mt-1">
            Track your scorekeeper earnings and payment status
          </p>
        </div>
        <Button variant="outline">
          <DollarSign className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalEarned.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedGames} games completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">${totalPaid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {paidPayments} payments received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">${totalPending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingPayments} pending, {approvedPayments} approved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Rate Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold">${scorekeeper.hourly_rate || 0}/hour</p>
              <p className="text-sm text-muted-foreground">Base hourly rate</p>
            </div>
            <div className="border-l pl-4">
              <p className="text-sm text-muted-foreground">
                Payment is calculated based on game duration (check-in to completion time)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {!assignments || assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No game assignments yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  const game = assignment.game as any;
                  const duration = assignment.duration_minutes
                    ? `${Math.floor(assignment.duration_minutes / 60)}h ${assignment.duration_minutes % 60}m`
                    : 'N/A';

                  let statusBadge;
                  switch (assignment.payment_status) {
                    case 'paid':
                      statusBadge = <Badge className="bg-green-500">Paid</Badge>;
                      break;
                    case 'approved':
                      statusBadge = <Badge className="bg-blue-500">Approved</Badge>;
                      break;
                    case 'pending':
                      statusBadge = <Badge variant="secondary">Pending</Badge>;
                      break;
                    default:
                      statusBadge = <Badge variant="outline">Unknown</Badge>;
                  }

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        {game?.date_time
                          ? new Date(game.date_time).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {game?.home_team?.name || 'Unknown'} vs{' '}
                          {game?.away_team?.name || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>{duration}</TableCell>
                      <TableCell className="font-medium">
                        {assignment.payment_amount
                          ? `$${assignment.payment_amount.toFixed(2)}`
                          : '-'}
                      </TableCell>
                      <TableCell>{statusBadge}</TableCell>
                      <TableCell>
                        {assignment.paid_at
                          ? new Date(assignment.paid_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong>Payment Schedule:</strong> Payments are processed monthly by the league administrator.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Status:</strong> Pending → Approved → Paid
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Questions?</strong> Contact your league administrator for payment inquiries.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
