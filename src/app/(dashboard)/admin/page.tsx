"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getLeagueStats } from "@/lib/admin/stats-actions";
import { generateTestData, removeAllTestData, makeCurrentUserOwner } from "@/lib/admin/test-data-actions";
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadStats();
    // Make current user owner on mount
    makeCurrentUserOwner();
  }, []);

  async function loadStats() {
    const result = await getLeagueStats();
    setStats(result);
    setLoading(false);
  }

  async function handleGenerateTestData() {
    setIsGenerating(true);
    const result = await generateTestData();
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || "Test data generated successfully!");
      loadStats(); // Reload stats
    }
    setIsGenerating(false);
  }

  async function handleRemoveTestData() {
    setIsRemoving(true);
    setIsDeleteDialogOpen(false);
    const result = await removeAllTestData();
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || "Test data removed successfully!");
      loadStats(); // Reload stats
    }
    setIsRemoving(false);
  }

  const gamesUntilDraft = stats?.activeSeason 
    ? (stats.activeSeason.games_per_cycle || 13) - (stats.activeSeason.current_game_count || 0)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">League Admin 👑</h1>
        <p className="text-muted-foreground mt-2">
          Manage your hockey empire from here.
        </p>
      </div>

      {/* League Stats */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Players</CardDescription>
              <CardTitle className="text-3xl">{stats?.totalPlayers || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Across {stats?.totalTeams || 0} teams</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Games Played</CardDescription>
              <CardTitle className="text-3xl">{stats?.gamesPlayed || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {gamesUntilDraft !== null 
                  ? `${gamesUntilDraft} until next draft`
                  : "No active season"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Goals</CardDescription>
              <CardTitle className="text-3xl text-canada-red">{stats?.totalGoals || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {stats?.activeSeason ? stats.activeSeason.name : "This season"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Suspensions</CardDescription>
              <CardTitle className="text-3xl text-destructive">{stats?.activeSuspensions || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Penalty box</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common admin tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button className="h-auto py-4 flex-col gap-2 bg-canada-red hover:bg-canada-red-dark" asChild>
              <Link href="/admin/seasons">
                <span className="text-2xl">📆</span>
                <span>Manage Seasons</span>
              </Link>
            </Button>
            <Button className="h-auto py-4 flex-col gap-2" variant="outline" asChild>
              <Link href="/admin/teams">
                <span className="text-2xl">🏆</span>
                <span>Manage Teams</span>
              </Link>
            </Button>
            <Button className="h-auto py-4 flex-col gap-2" variant="outline" asChild>
              <Link href="/admin/players">
                <span className="text-2xl">👥</span>
                <span>Manage Players</span>
              </Link>
            </Button>
            <Button className="h-auto py-4 flex-col gap-2" variant="outline" asChild>
              <Link href="/admin/payments">
                <span className="text-2xl">💳</span>
                <span>Payments</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Test Data Management</CardTitle>
          <CardDescription>Generate or remove test data for development</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={handleGenerateTestData}
              disabled={isGenerating || isRemoving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isGenerating ? "Generating..." : "🎲 Generate Test Data"}
            </Button>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isGenerating || isRemoving}
                >
                  {isRemoving ? "Removing..." : "🗑️ Remove All Test Data"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete all games, stats, rosters, and reset seasons.
                    This action cannot be undone. Only use this in development!
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRemoveTestData}
                  >
                    Yes, Delete All Test Data
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Pending Verifications */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Stat Verifications</CardTitle>
          <CardDescription>Games waiting for captain confirmation</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : stats?.pendingVerifications && stats.pendingVerifications.length > 0 ? (
            <div className="space-y-4">
              {stats.pendingVerifications.map((game: any) => (
                <div key={game.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {game.home_team?.name} vs {game.away_team?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(game.scheduled_at).toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })} - Score: {game.home_score}-{game.away_score}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {game.home_captain_verified ? (
                      <Badge className="bg-green-600">✓ Home verified</Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600">⏳ Home pending</Badge>
                    )}
                    {game.away_captain_verified ? (
                      <Badge className="bg-green-600">✓ Away verified</Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600">⏳ Away pending</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No games pending verification
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
