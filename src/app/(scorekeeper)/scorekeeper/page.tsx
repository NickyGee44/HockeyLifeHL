import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getScorekeeperAssignments } from "@/lib/scorekeepers/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Calendar, Clock, DollarSign, CheckCircle2, PlayCircle, History } from "lucide-react";

export default async function ScorekeeperDashboardPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get scorekeeper assignments
  const { error, assignments } = await getScorekeeperAssignments({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
    end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // Next 90 days
  });

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const now = new Date();

  // Categorize assignments
  const upcomingGames = assignments?.filter(a =>
    new Date(a.game.date_time) > now && !a.completed_at
  ) || [];

  const liveGames = assignments?.filter(a =>
    a.started_at && !a.completed_at
  ) || [];

  const completedGames = assignments?.filter(a =>
    a.completed_at
  ) || [];

  // Calculate payment summary
  const totalHours = completedGames.reduce((sum, a) =>
    sum + (a.duration_minutes || 0) / 60, 0
  );

  const totalEarnings = completedGames.reduce((sum, a) =>
    sum + (parseFloat(a.payment_amount) || 0), 0
  );

  const pendingPayment = completedGames
    .filter(a => a.payment_status === 'pending')
    .reduce((sum, a) => sum + (parseFloat(a.payment_amount) || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Scorekeeper Dashboard</h1>
        <p className="text-muted-foreground">Manage your game assignments and track payments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Games</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingGames.length}</div>
            <p className="text-xs text-muted-foreground">
              Next 90 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              {completedGames.length} games completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${pendingPayment.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Games Section */}
      {liveGames.length > 0 && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-green-500" />
              Live Games
            </CardTitle>
            <CardDescription>Games in progress - Continue entering stats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {liveGames.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                <div>
                  <p className="font-medium">{assignment.game.home_team?.name} vs {assignment.game.away_team?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Started {new Date(assignment.started_at).toLocaleTimeString()}
                  </p>
                </div>
                <Button asChild>
                  <Link href={`/scorekeeper/live-entry/${assignment.game_id}`}>
                    Continue Entry
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Games */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Assignments
          </CardTitle>
          <CardDescription>Games you're assigned to scorekeeper</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingGames.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No upcoming games assigned</p>
          ) : (
            <div className="space-y-4">
              {upcomingGames.slice(0, 5).map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent">
                  <div className="flex-1">
                    <p className="font-medium">{assignment.game.home_team?.name} vs {assignment.game.away_team?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(assignment.game.date_time).toLocaleDateString()} at {new Date(assignment.game.date_time).toLocaleTimeString()}
                    </p>
                    {assignment.game.venue && (
                      <p className="text-sm text-muted-foreground">{assignment.game.venue.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {assignment.checked_in_at && (
                      <Badge variant="secondary">Checked In</Badge>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/scorekeeper/live-entry/${assignment.game_id}`}>
                        View Game
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              {upcomingGames.length > 5 && (
                <div className="text-center pt-2">
                  <Button variant="link" asChild>
                    <Link href="/scorekeeper/assignments">
                      View All {upcomingGames.length} Upcoming Games
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Completed Games */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Completed Games
          </CardTitle>
          <CardDescription>Your scorekeeper history and payment status</CardDescription>
        </CardHeader>
        <CardContent>
          {completedGames.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No completed games yet</p>
          ) : (
            <div className="space-y-4">
              {completedGames.slice(0, 10).map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{assignment.game.home_team?.name} vs {assignment.game.away_team?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(assignment.game.date_time).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {assignment.duration_minutes ? `${Math.floor(assignment.duration_minutes / 60)}h ${assignment.duration_minutes % 60}m` : 'Duration not recorded'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {assignment.payment_amount && (
                      <div className="text-right">
                        <p className="font-medium">${parseFloat(assignment.payment_amount).toFixed(2)}</p>
                        <Badge
                          variant={
                            assignment.payment_status === 'paid' ? 'default' :
                            assignment.payment_status === 'approved' ? 'secondary' :
                            'outline'
                          }
                        >
                          {assignment.payment_status}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
