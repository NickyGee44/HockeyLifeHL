// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

type ActivityItem = {
  id: string;
  type: "game" | "article" | "draft";
  title: string;
  description: string;
  date: string;
  link: string;
};

export function RecentActivityFeed({ userId }: { userId: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadRecentActivity();
    } else {
      setLoading(false);
    }
  }, [userId]);

  async function loadRecentActivity() {
    const supabase = createClient();

    // Get active season
    const { data: activeSeason } = await supabase
      .from("seasons")
      .select("id")
      .in("status", ["active", "playoffs"])
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    if (!activeSeason) {
      setLoading(false);
      return;
    }

    // Get player's team
    const { data: rosterEntry } = await supabase
      .from("team_rosters")
      .select("team_id")
      .eq("player_id", userId)
      .eq("season_id", activeSeason.id)
      .single();

    const activitiesList: ActivityItem[] = [];

    // Get recent games for player's team
    if (rosterEntry) {
      const { data: recentGames } = await supabase
        .from("games")
        .select(`
          id,
          scheduled_at,
          home_score,
          away_score,
          status,
          home_team:teams!games_home_team_id_fkey(name, short_name),
          away_team:teams!games_away_team_id_fkey(name, short_name)
        `)
        .eq("season_id", activeSeason.id)
        .or(`home_team_id.eq.${rosterEntry.team_id},away_team_id.eq.${rosterEntry.team_id}`)
        .eq("status", "completed")
        .order("scheduled_at", { ascending: false })
        .limit(5);

      (recentGames || []).forEach((game) => {
        activitiesList.push({
          id: game.id,
          type: "game",
          title: `${game.home_team?.name} ${game.home_score} - ${game.away_score} ${game.away_team?.name}`,
          description: `Game completed on ${new Date(game.scheduled_at).toLocaleDateString()}`,
          date: game.scheduled_at,
          link: "/schedule",
        });
      });
    }

    // Get recent articles
    const { data: recentArticles } = await supabase
      .from("articles")
      .select("id, title, type, published_at, created_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(3);

    (recentArticles || []).forEach((article) => {
      activitiesList.push({
        id: article.id,
        type: "article",
        title: article.title,
        description: `New ${article.type.replace("_", " ")} article published`,
        date: article.published_at || article.created_at,
        link: "/news",
      });
    });

    // Sort by date and take most recent 8
    activitiesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setActivities(activitiesList.slice(0, 8));
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Loading activity...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-4xl mb-4">🏒</p>
        <p>No recent activity yet.</p>
        <p className="text-sm">Activity will appear here once games are played!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <Link
          key={activity.id}
          href={activity.link}
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {activity.type === "game" && <Badge variant="outline">Game</Badge>}
              {activity.type === "article" && <Badge variant="outline">News</Badge>}
              {activity.type === "draft" && <Badge variant="outline">Draft</Badge>}
              <p className="font-medium">{activity.title}</p>
            </div>
            <p className="text-sm text-muted-foreground">{activity.description}</p>
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(activity.date).toLocaleDateString("en-CA", {
              month: "short",
              day: "numeric",
            })}
          </div>
        </Link>
      ))}
    </div>
  );
}
