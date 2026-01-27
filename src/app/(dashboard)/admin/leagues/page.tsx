import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LeagueTable } from "@/components/admin/LeagueTable";
import { getAllLeagues } from "@/lib/admin/league-management";

/**
 * Admin Leagues Overview Page
 * Lists all leagues in the platform with stats and quick actions
 */
export default async function AdminLeaguesPage() {
  const result = await getAllLeagues();

  if (result.error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">League Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all leagues in the platform
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {result.error}
            </p>
            <Button asChild>
              <Link href="/admin/leagues">
                Try Again
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const leagues = result.leagues || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">League Management</h1>
          <p className="text-muted-foreground mt-2">
            {leagues.length} {leagues.length === 1 ? 'league' : 'leagues'} in the platform
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/leagues/create">
            Create League
          </Link>
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Leagues</CardDescription>
            <CardTitle className="text-3xl">{leagues.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Active: {leagues.filter(l => l.status === 'active').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Members</CardDescription>
            <CardTitle className="text-3xl">
              {leagues.reduce((sum, l) => sum + (l.stats?.members || 0), 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across all leagues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Teams</CardDescription>
            <CardTitle className="text-3xl">
              {leagues.reduce((sum, l) => sum + (l.stats?.teams || 0), 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across all leagues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Games</CardDescription>
            <CardTitle className="text-3xl">
              {leagues.reduce((sum, l) => sum + (l.stats?.games || 0), 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across all leagues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leagues Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Leagues</CardTitle>
          <CardDescription>
            Manage, view, and configure leagues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeagueTable leagues={leagues} />
        </CardContent>
      </Card>
    </div>
  );
}
