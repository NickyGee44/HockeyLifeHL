"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LeagueStatusBadge } from "@/components/admin/LeagueStatusBadge";
import { LeagueAnalytics } from "@/components/admin/LeagueAnalytics";
import { BrandingPreview } from "@/components/admin/BrandingPreview";
import { getLeagueDetails, updateLeagueStatus } from "@/lib/admin/league-management";
import { getLeagueAnalytics } from "@/lib/admin/league-analytics";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * League Details Page
 * Shows comprehensive information about a specific league
 */
export default function LeagueDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params.leagueId as string;

  const [league, setLeague] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<'active' | 'suspended' | 'archived'>('active');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    loadLeagueData();
  }, [leagueId]);

  async function loadLeagueData() {
    setLoading(true);

    // Load league details
    const detailsResult = await getLeagueDetails(leagueId);
    if (detailsResult.error) {
      toast.error(detailsResult.error);
      setLoading(false);
      return;
    }

    setLeague(detailsResult.league);

    // Load analytics
    const analyticsResult = await getLeagueAnalytics(leagueId);
    if (!analyticsResult.error && analyticsResult.analytics) {
      setAnalytics(analyticsResult.analytics);
    }

    setLoading(false);
  }

  async function handleStatusChange() {
    setIsUpdatingStatus(true);
    const result = await updateLeagueStatus(leagueId, newStatus);
    setIsUpdatingStatus(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('League status updated');
      setIsStatusDialogOpen(false);
      loadLeagueData();
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-96" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">League not found</p>
            <Button asChild variant="outline">
              <Link href="/admin/leagues">Back to Leagues</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{league.name}</h1>
            <LeagueStatusBadge status={league.status} />
          </div>
          <p className="text-muted-foreground">
            {league.slug} • Created {new Date(league.created_at).toLocaleDateString('en-CA')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/leagues/${leagueId}/branding`}>
              Edit Branding
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/admin/leagues/${leagueId}/domain`}>
              Configure Domain
            </Link>
          </Button>
          <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Change Status</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change League Status</DialogTitle>
                <DialogDescription>
                  Update the status of this league
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStatusChange} disabled={isUpdatingStatus}>
                  {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Members</CardDescription>
            <CardTitle className="text-3xl">{league.stats?.members || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Teams</CardDescription>
            <CardTitle className="text-3xl">{league.stats?.teams || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Games</CardDescription>
            <CardTitle className="text-3xl">{league.stats?.games || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {league.stats?.completedGames || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sport</CardDescription>
            <CardTitle className="text-2xl capitalize">{league.sport}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* League Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>League Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Slug</span>
              <span className="font-medium">{league.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Subdomain</span>
              <span className="font-medium">
                {league.subdomain}.beerleaguehockey.ca
              </span>
            </div>
            {league.custom_domain && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Custom Domain</span>
                <div className="text-right">
                  <div className="font-medium">{league.custom_domain}</div>
                  {league.custom_domain_verified ? (
                    <Badge className="bg-green-600 text-xs">Verified</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Pending</Badge>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Description</span>
              <span className="font-medium text-right max-w-xs">
                {league.description || 'No description'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Owner Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {league.owner ? (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="font-medium">{league.owner.full_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="font-medium">{league.owner.email}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No owner assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Branding Preview */}
      <BrandingPreview
        branding={{
          name: league.name,
          logo_url: league.logo_url,
          primary_color: league.primary_color,
          secondary_color: league.secondary_color,
          accent_color: league.accent_color,
          tagline: league.tagline,
          font_family: league.font_family,
        }}
      />

      {/* Analytics */}
      {analytics && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Analytics</h2>
          <LeagueAnalytics analytics={analytics} />
        </div>
      )}

      {/* Recent Activity */}
      {league.recentActivity && league.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Games</CardTitle>
            <CardDescription>Last 5 games played</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {league.recentActivity.map((game: any) => (
                <div key={game.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {game.home_team?.name} vs {game.away_team?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(game.scheduled_at).toLocaleDateString('en-CA', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  {game.status === 'completed' && (
                    <div className="font-medium">
                      {game.home_score} - {game.away_score}
                    </div>
                  )}
                  <Badge variant="outline">{game.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
