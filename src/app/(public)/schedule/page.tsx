import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamLogo } from "@/components/ui/team-logo";
import { getUpcomingGames, getRecentGames } from "@/lib/games/actions";

export default async function SchedulePage() {
  const [upcomingResult, recentResult] = await Promise.all([
    getUpcomingGames(20),
    getRecentGames(20),
  ]);

  const upcomingGames = upcomingResult.games || [];
  const recentGames = recentResult.games || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline">📅 Scheduled</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-600">⏱️ Live</Badge>;
      case "completed":
        return <Badge className="bg-green-600">✓ Final</Badge>;
      case "cancelled":
        return <Badge variant="destructive">❌ Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatGameDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-CA", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-CA", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">
          <span className="text-foreground">Game </span>
          <span className="text-canada-red">Schedule</span>
        </h1>
        <p className="text-muted-foreground">
          View upcoming games and recent results
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingGames.length})
          </TabsTrigger>
          <TabsTrigger value="recent">
            Recent Results ({recentGames.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingGames.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No upcoming games scheduled. Check back soon!
                </p>
              </CardContent>
            </Card>
          ) : (
            upcomingGames.map((game) => {
              const { date, time } = formatGameDate(game.scheduled_at);
              return (
                <Card key={game.id} className="hover:border-canada-red/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Date/Time */}
                      <div className="flex-shrink-0 text-center md:text-left">
                        <div className="text-sm text-muted-foreground">{date}</div>
                        <div className="text-lg font-semibold">{time}</div>
                        {game.location && (
                          <div className="text-xs text-muted-foreground mt-1">
                            📍 {game.location}
                          </div>
                        )}
                      </div>

                      {/* Teams & Score */}
                      <div className="flex-1 flex items-center gap-4">
                        <div className="flex-1 flex items-center justify-end gap-2">
                          {game.home_team ? (
                            <TeamLogo 
                              team={game.home_team} 
                              size="sm" 
                              showName 
                              nameClassName="text-lg font-semibold"
                            />
                          ) : (
                            <span className="font-semibold text-lg">TBD</span>
                          )}
                        </div>

                        <div className="text-center min-w-[80px]">
                          {game.status === "completed" ? (
                            <div className="font-mono font-bold text-xl">
                              {game.home_score} - {game.away_score}
                            </div>
                          ) : (
                            <div className="text-muted-foreground">vs</div>
                          )}
                        </div>

                        <div className="flex-1 flex items-center gap-2">
                          {game.away_team ? (
                            <TeamLogo 
                              team={game.away_team} 
                              size="sm" 
                              showName 
                              nameClassName="text-lg font-semibold"
                            />
                          ) : (
                            <span className="font-semibold text-lg">TBD</span>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex-shrink-0">
                        {getStatusBadge(game.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          {recentGames.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No recent games. Check back after games are played!
                </p>
              </CardContent>
            </Card>
          ) : (
            recentGames.map((game) => {
              const { date, time } = formatGameDate(game.scheduled_at);
              return (
                <Card key={game.id} className="hover:border-canada-red/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Date/Time */}
                      <div className="flex-shrink-0 text-center md:text-left">
                        <div className="text-sm text-muted-foreground">{date}</div>
                        <div className="text-lg font-semibold">{time}</div>
                        {game.location && (
                          <div className="text-xs text-muted-foreground mt-1">
                            📍 {game.location}
                          </div>
                        )}
                      </div>

                      {/* Teams & Score */}
                      <div className="flex-1 flex items-center gap-4">
                        <div className="flex-1 flex items-center justify-end gap-2">
                          {game.home_team ? (
                            <TeamLogo 
                              team={game.home_team} 
                              size="sm" 
                              showName 
                              nameClassName="text-lg font-semibold"
                            />
                          ) : (
                            <span className="font-semibold text-lg">TBD</span>
                          )}
                        </div>

                        <div className="text-center min-w-[80px]">
                          <div className="font-mono font-bold text-xl">
                            {game.home_score} - {game.away_score}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {game.home_score > game.away_score ? "W" : game.home_score < game.away_score ? "L" : "T"}
                          </div>
                        </div>

                        <div className="flex-1 flex items-center gap-2">
                          {game.away_team ? (
                            <TeamLogo 
                              team={game.away_team} 
                              size="sm" 
                              showName 
                              nameClassName="text-lg font-semibold"
                            />
                          ) : (
                            <span className="font-semibold text-lg">TBD</span>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex-shrink-0">
                        {getStatusBadge(game.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
