import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getScorekeeperAssignments } from "@/lib/scorekeepers/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Calendar } from "lucide-react";

export default async function ScorekeeperAssignmentsPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get all scorekeeper assignments (wide date range)
  const { error, assignments } = await getScorekeeperAssignments({
    start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
    end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Next year
  });

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Assignments</CardTitle>
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

  const pastGames = assignments?.filter(a =>
    new Date(a.game.date_time) <= now || a.completed_at
  ) || [];

  const GameCard = ({ assignment }: { assignment: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-lg">
              {assignment.game.home_team?.name} vs {assignment.game.away_team?.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(assignment.game.date_time).toLocaleDateString()} at {new Date(assignment.game.date_time).toLocaleTimeString()}
            </p>
            {assignment.game.venue && (
              <p className="text-sm text-muted-foreground">{assignment.game.venue.name}</p>
            )}

            <div className="flex items-center gap-2 mt-3">
              {assignment.checked_in_at && (
                <Badge variant="secondary">Checked In</Badge>
              )}
              {assignment.started_at && !assignment.completed_at && (
                <Badge variant="default" className="bg-green-500">In Progress</Badge>
              )}
              {assignment.completed_at && (
                <Badge variant="outline">Completed</Badge>
              )}
              {assignment.payment_status && (
                <Badge
                  variant={
                    assignment.payment_status === 'paid' ? 'default' :
                    assignment.payment_status === 'approved' ? 'secondary' :
                    'outline'
                  }
                >
                  {assignment.payment_status}
                </Badge>
              )}
            </div>

            {assignment.duration_minutes && (
              <p className="text-sm mt-2">
                Duration: {Math.floor(assignment.duration_minutes / 60)}h {assignment.duration_minutes % 60}m
              </p>
            )}
            {assignment.payment_amount && (
              <p className="text-sm font-medium mt-1">
                Payment: ${parseFloat(assignment.payment_amount).toFixed(2)}
              </p>
            )}
          </div>

          <Button asChild>
            <Link href={`/scorekeeper/live-entry/${assignment.game_id}`}>
              {assignment.completed_at ? "View" : "Enter Stats"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Assignments</h1>
        <p className="text-muted-foreground">All games you're assigned to scorekeeper</p>
      </div>

      {/* Tabs for Upcoming vs Past */}
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingGames.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastGames.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-6">
          {upcomingGames.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming games assigned</p>
              </CardContent>
            </Card>
          ) : (
            upcomingGames.map((assignment) => (
              <GameCard key={assignment.id} assignment={assignment} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4 mt-6">
          {pastGames.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No past games</p>
              </CardContent>
            </Card>
          ) : (
            pastGames.map((assignment) => (
              <GameCard key={assignment.id} assignment={assignment} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
