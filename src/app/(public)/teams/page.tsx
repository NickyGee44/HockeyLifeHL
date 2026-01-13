import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";

async function getTeamsWithRosters() {
  const supabase = await createClient();
  
  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name")
    .in("status", ["active", "playoffs"])
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  // Get all teams with their captains
  const { data: teams } = await supabase
    .from("teams")
    .select(`
      *,
      captain:profiles!teams_captain_id_fkey(id, full_name, avatar_url, jersey_number)
    `)
    .order("name", { ascending: true });

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

  return { teams: teams || [], activeSeason, rosterCounts };
}

export default async function TeamsPage() {
  const { teams, activeSeason, rosterCounts } = await getTeamsWithRosters();

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
        {activeSeason && (
          <p className="text-muted-foreground">
            {activeSeason.name} Season
          </p>
        )}
      </div>
      
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
                    <div 
                      className="w-16 h-16 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg"
                      style={{ 
                        backgroundColor: team.primary_color,
                        color: team.secondary_color,
                      }}
                    >
                      {team.short_name}
                    </div>
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
