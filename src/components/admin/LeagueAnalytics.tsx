import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface LeagueAnalyticsProps {
  analytics: {
    users: {
      total: number;
      active_30d: number;
      new_30d: number;
      by_role: {
        owners: number;
        admins: number;
        captains: number;
        scorekeepers: number;
        players: number;
      };
    };
    teams: {
      total: number;
      active: number;
    };
    games: {
      total: number;
      completed: number;
      scheduled: number;
      this_season: number;
      completion_rate: number;
    };
    activity: {
      last_game: string | null;
      last_login: string | null;
      games_per_week: number;
      health_score: number;
    };
    growth: {
      users_trend: Array<{ date: string; count: number }>;
      games_trend: Array<{ date: string; count: number }>;
    };
  };
}

/**
 * Analytics dashboard for a league
 * Shows stats, health score, and activity metrics
 */
export function LeagueAnalytics({ analytics }: LeagueAnalyticsProps) {
  const { users, teams, games, activity } = analytics;

  // Calculate health score color
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 50) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{users.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              +{users.new_30d} in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Teams</CardDescription>
            <CardTitle className="text-3xl">{teams.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {teams.active} active this season
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Games Played</CardDescription>
            <CardTitle className="text-3xl">{games.completed}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {games.this_season} this season
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Health Score</CardDescription>
            <CardTitle className={`text-3xl ${getHealthColor(activity.health_score)}`}>
              {activity.health_score}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress
              value={activity.health_score}
              className="h-2"
              indicatorClassName={getHealthBgColor(activity.health_score)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* User Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>User Breakdown</CardTitle>
            <CardDescription>Users by role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Owners</span>
              <span className="font-medium">{users.by_role.owners}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Admins</span>
              <span className="font-medium">{users.by_role.admins}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Captains</span>
              <span className="font-medium">{users.by_role.captains}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Scorekeepers</span>
              <span className="font-medium">{users.by_role.scorekeepers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Players</span>
              <span className="font-medium">{users.by_role.players}</span>
            </div>
          </CardContent>
        </Card>

        {/* Game Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Game Statistics</CardTitle>
            <CardDescription>Game completion and activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Games</span>
              <span className="font-medium">{games.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Completed</span>
              <span className="font-medium">{games.completed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Scheduled</span>
              <span className="font-medium">{games.scheduled}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Completion Rate</span>
              <span className="font-medium">{games.completion_rate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Games/Week</span>
              <span className="font-medium">{activity.games_per_week}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>League engagement metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">Last Game Played</span>
            <span className="font-medium">
              {activity.last_game
                ? new Date(activity.last_game).toLocaleDateString('en-CA', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'No games yet'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Active in Last 30 Days</span>
            <span className="font-medium">{users.active_30d} users</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Average Games Per Week</span>
            <span className="font-medium">{activity.games_per_week.toFixed(1)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
