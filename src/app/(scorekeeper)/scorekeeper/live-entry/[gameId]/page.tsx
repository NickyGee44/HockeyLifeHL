import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GameClock } from "@/components/scorekeeper/GameClock";
import { StatEntryPad } from "@/components/scorekeeper/StatEntryPad";
import { GameRoster } from "@/components/scorekeeper/GameRoster";
import { StatSummary } from "@/components/scorekeeper/StatSummary";
import { SyncStatusIndicator } from "@/components/scorekeeper/SyncStatusIndicator";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: {
    gameId: string;
  };
}

export default async function LiveStatEntryPage({ params }: PageProps) {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get game details
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, logo_url),
      league:leagues(id, name)
    `)
    .eq('id', params.gameId)
    .single();

  if (gameError || !game) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Game Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">The game you're looking for doesn't exist.</p>
            <Button asChild>
              <Link href="/scorekeeper/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is assigned to this game
  const { data: assignment } = await supabase
    .from('game_scorekeeper_assignments')
    .select('*')
    .eq('game_id', params.gameId)
    .eq('scorekeeper_id', user.id)
    .single();

  if (!assignment) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You are not assigned to scorekeeper this game. Contact your league administrator.
            </p>
            <Button asChild>
              <Link href="/scorekeeper/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get team rosters
  // @ts-ignore - Complex Supabase query types cause TS depth error
  const { data: homeRosterRaw } = await supabase
    .from('team_rosters')
    .select(`
      id,
      player:profiles(id, full_name, jersey_number, position),
      team:teams(id, name)
    `)
    .eq('team_id', game.home_team_id);

  const { data: awayRosterRaw } = await supabase
    .from('team_rosters')
    .select(`
      id,
      player:profiles(id, full_name, jersey_number, position),
      team:teams(id, name)
    `)
    .eq('team_id', game.away_team_id);

  // Transform roster data to match component interface
  const homeRoster = homeRosterRaw?.map((r: any) => ({
    id: r.id,
    jersey_number: r.player?.jersey_number || 0,
    position: r.player?.position || 'F',
    player: {
      id: r.player?.id || '',
      full_name: r.player?.full_name || 'Unknown',
    },
  })) || [];

  const awayRoster = awayRosterRaw?.map((r: any) => ({
    id: r.id,
    jersey_number: r.player?.jersey_number || 0,
    position: r.player?.position || 'F',
    player: {
      id: r.player?.id || '',
      full_name: r.player?.full_name || 'Unknown',
    },
  })) || [];

  return (
    <>
      {/* iPad-optimized meta tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

      <div className="min-h-screen bg-background p-2 md:p-4">
        {/* Header - Compact for iPad */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/scorekeeper/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <SyncStatusIndicator />
        </div>

        {/* Game Info Card - Compact */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold">
                    {game.home_team?.name} vs {game.away_team?.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {new Date(game.scheduled_at).toLocaleDateString()} • {game.location || 'TBD'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {assignment.checked_in_at && (
                  <Badge variant="secondary">Checked In</Badge>
                )}
                {assignment.started_at && !assignment.completed_at && (
                  <Badge variant="default" className="bg-green-500">Live</Badge>
                )}
                {assignment.completed_at && (
                  <Badge variant="outline">Completed</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Stat Entry Interface - iPad Landscape Optimized */}
        <div className="grid lg:grid-cols-[1fr_400px] gap-4">
          {/* Left Column: Stat Entry */}
          <div className="space-y-4">
            {/* Game Clock */}
            <GameClock
              gameId={params.gameId}
              assignmentId={assignment.id}
              gameStatus={game.status}
              checkedInAt={assignment.checked_in_at}
              startedAt={assignment.started_at}
              completedAt={assignment.completed_at}
            />

            {/* Stat Entry Pad - Large Buttons for iPad */}
            <StatEntryPad
              gameId={params.gameId}
              homeTeamId={game.home_team_id}
              awayTeamId={game.away_team_id}
              homeTeamName={game.home_team?.name || ''}
              awayTeamName={game.away_team?.name || ''}
              homeRoster={homeRoster}
              awayRoster={awayRoster}
            />
          </div>

          {/* Right Column: Rosters & Summary */}
          <div className="space-y-4">
            {/* Stat Summary */}
            <StatSummary gameId={params.gameId} />

            {/* Team Rosters */}
            <GameRoster
              homeTeam={game.home_team?.name || ''}
              awayTeam={game.away_team?.name || ''}
              homeRoster={homeRoster}
              awayRoster={awayRoster}
            />
          </div>
        </div>
      </div>
    </>
  );
}
