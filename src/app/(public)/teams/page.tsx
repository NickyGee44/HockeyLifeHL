// @ts-nocheck
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeamLogo } from "@/components/ui/team-logo";
import { createClient } from "@/lib/supabase/server";

// Cache this page for 60 seconds
export const revalidate = 60;

async function getTeamsWithRosters(divisionId?: string) {
  const supabase = await createClient();

  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name")
    .in("status", ["active", "playoffs"])
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  const { data: divisionsData } = await supabase
    .from("divisions")
    .select("id, name")
    .order("name", { ascending: true });

  const divisions = divisionsData || [];
  const selectedDivision =
    divisionId ? divisions.find((d) => d.id === divisionId) || null : null;

  const teamsQuery = divisionId
    ? supabase
        .from("teams")
        .select(`
        *,
        captain:profiles!teams_captain_id_fkey(id, full_name, avatar_url, jersey_number)
      `)
        .eq("division_id", divisionId)
    : supabase
        .from("teams")
        .select(`
        *,
        captain:profiles!teams_captain_id_fkey(id, full_name, avatar_url, jersey_number)
      `);

  const { data: teams } = await teamsQuery.order("name", { ascending: true });

  // Get roster counts for active season
  let rosterCounts: Record<string, number> = {};
  if (activeSeason) {
    const { data: rosters } = await supabase
      .from("team_rosters")
      .select("team_id")
      .eq("season_id", activeSeason.id);

    if (rosters) {
      rosterCounts = rosters.reduce((acc, r) => {
        acc[r.team_id] = (acc[r.team_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }
  }

  return { teams: teams || [], activeSeason, rosterCounts, divisions, selectedDivision };
}

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ division?: string }>;
}) {
  const params = await searchParams;
  const { teams, activeSeason, rosterCounts, divisions, selectedDivision } =
    await getTeamsWithRosters(params.division);

  const buildDivisionHref = (divisionId?: string) => {
    const query = new URLSearchParams();
    if (divisionId) query.set("division", divisionId);
    return query.toString() ? `?${query.toString()}` : ".";
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">
          <span className="text-foreground">League </span>
          <span className="text-rink-blue">Teams</span>
        </h1>
        {(selectedDivision || activeSeason) && (
          <p className="text-muted-foreground">
            {selectedDivision ? `${selectedDivision.name} Division` : null}
            {selectedDivision && activeSeason ? " • " : ""}
            {activeSeason ? `${activeSeason.name} Season` : null}
          </p>
        )}
      </div>

      {divisions.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href={buildDivisionHref()}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !params.division ? "bg-rink-blue text-white" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All Divisions
          </Link>
          {divisions.map((division) => (
            <Link
              key={division.id}
              href={buildDivisionHref(division.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                params.division === division.id ? "bg-rink-blue text-white" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {division.name}
            </Link>
          ))}
        </div>
      )}

      {teams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No teams have been created yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <Card className="overflow-hidden hover:border-canada-red/50 transition-colors cursor-pointer h-full">
                <div 
                  className="h-3"
                  style={{ backgroundColor: team.primary_color }}
                />
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <TeamLogo team={team} size="xl" clickable={false} />
                    <div>
                      <CardTitle>{team.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {rosterCounts[team.id] || 0} players
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Captain:</span>
                    {team.captain ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={team.captain.avatar_url || ""} />
                          <AvatarFallback className="text-xs" style={{ backgroundColor: team.primary_color, color: team.secondary_color }}>
                            {getInitials(team.captain.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {team.captain.full_name}
                          {team.captain.jersey_number !== null && (
                            <span className="text-muted-foreground ml-1">#{team.captain.jersey_number}</span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">TBD</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
