"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Target, User, Shield } from "lucide-react";

interface StatSummaryProps {
  gameId: string;
}

export function StatSummary({ gameId }: StatSummaryProps) {
  const [stats, setStats] = useState<any>({
    homeGoals: 0,
    awayGoals: 0,
    homeShots: 0,
    awayShots: 0,
    homePIM: 0,
    awayPIM: 0,
  });

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial stats
    const fetchStats = async () => {
      const { data } = await supabase.from('game_stats').select('*').eq('game_id', gameId);

      if (data) {
        // Calculate totals (simplified - would need proper aggregation)
        const stats = data as any[];
        const homeGoals = stats.filter(s => s.stat_type === 'Goal' && s.team_type === 'home').length;
        const awayGoals = stats.filter(s => s.stat_type === 'Goal' && s.team_type === 'away').length;
        const homeShots = stats.filter(s => s.stat_type === 'Shot' && s.team_type === 'home').length;
        const awayShots = stats.filter(s => s.stat_type === 'Shot' && s.team_type === 'away').length;
        const homePIM = stats.filter(s => s.stat_type === 'PIM' && s.team_type === 'home').reduce((sum, s) => sum + (s.value || 0), 0);
        const awayPIM = stats.filter(s => s.stat_type === 'PIM' && s.team_type === 'away').reduce((sum, s) => sum + (s.value || 0), 0);

        setStats({
          homeGoals,
          awayGoals,
          homeShots,
          awayShots,
          homePIM,
          awayPIM,
        });
      }
    };

    fetchStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('game-stats')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_stats',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          fetchStats(); // Refetch stats on new entry
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Live Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Home</p>
            <p className="text-5xl font-bold">{stats.homeGoals}</p>
          </div>
          <span className="text-2xl text-muted-foreground">-</span>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Away</p>
            <p className="text-5xl font-bold">{stats.awayGoals}</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Shots</p>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{stats.homeShots}</span>
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{stats.awayShots}</span>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">PIM</p>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{stats.homePIM}</span>
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{stats.awayPIM}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
