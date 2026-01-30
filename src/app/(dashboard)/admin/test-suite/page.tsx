"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Mail,
  Settings,
  Database,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Play,
  TestTube,
  Clock,
  Users,
  MapPin,
  Shield,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateTestData, removeAllTestData } from "@/lib/admin/test-data-actions";
import { toast } from "sonner";
import { useActiveLeague } from "@/hooks/use-league";
import { getUserLeagues, setActiveLeagueId } from "@/lib/auth/league-context";
import { useRouter } from "next/navigation";

/**
 * Admin Test Suite
 *
 * Comprehensive testing page for all BMHL Phase 1A & 1B features.
 * Bypasses authentication for easy testing.
 *
 * Features:
 * - Direct links to all admin pages
 * - Test data generation
 * - Feature status indicators
 * - End-to-end workflow guides
 * - Quick access to test scenarios
 */

export default function AdminTestSuitePage() {
  const { leagueId, leagueSlug, leagueName, isLoading } = useActiveLeague();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);

  // Load user's leagues on mount
  useEffect(() => {
    async function loadLeagues() {
      const result = await getUserLeagues();
      setLeagues(result.leagues || []);
      setLoadingLeagues(false);
    }
    loadLeagues();
  }, []);

  const handleGenerateTestData = async () => {
    setGenerating(true);
    const result = await generateTestData();
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Test data generated! You can now test all features.");
    }
    setGenerating(false);
  };

  const handleRemoveTestData = async () => {
    if (!confirm("Are you sure? This will delete all test data!")) return;
    setRemoving(true);
    const result = await removeAllTestData();
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("All test data removed!");
    }
    setRemoving(false);
  };

  const handleLeagueChange = async (newLeagueId: string) => {
    const result = await setActiveLeagueId(newLeagueId);
    if (result.success) {
      toast.success("League switched successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to switch league");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <TestTube className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Test Suite</h1>
            <p className="text-muted-foreground">
              Testing environment for BMHL Phase 1A & 1B features
            </p>
          </div>
        </div>

        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Select Active League for Testing:</label>
                {loadingLeagues || isLoading ? (
                  <div className="h-10 bg-muted animate-pulse rounded-md" />
                ) : leagues.length === 0 ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No leagues found. Please create or join a league first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select value={leagueId || ""} onValueChange={handleLeagueChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a league..." />
                    </SelectTrigger>
                    <SelectContent>
                      {leagues.map((membership: any) => (
                        <SelectItem key={membership.league_id} value={membership.league_id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{membership.league.name}</span>
                            <span className="text-xs text-muted-foreground">({membership.league.slug})</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {membership.role}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {leagueId && (
                <div className="text-sm space-y-1 p-3 bg-background rounded-md border">
                  <p>
                    <strong>Active League:</strong> {leagueName || "Loading..."}
                  </p>
                  <p>
                    <strong>Slug:</strong> {leagueSlug || "N/A"}
                  </p>
                  <p>
                    <strong>League ID:</strong> <code className="text-xs bg-muted px-1 py-0.5 rounded">{leagueId}</code>
                  </p>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> This page is for testing only. All features bypass authentication.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Test Data Management
          </CardTitle>
          <CardDescription>Generate or remove test data for feature testing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handleGenerateTestData}
              disabled={generating || removing}
              className="bg-green-600 hover:bg-green-700"
            >
              {generating ? "Generating..." : "🎲 Generate Test Data"}
            </Button>
            <Button onClick={handleRemoveTestData} disabled={generating || removing} variant="destructive">
              {removing ? "Removing..." : "🗑️ Remove All Test Data"}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong>Generate Test Data:</strong> Creates teams, players, games, venues for testing
            </p>
            <p>
              <strong>Remove Test Data:</strong> Deletes all games, stats, and resets seasons
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Phase 1A: Scheduling Features */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Phase 1A: Scheduling & Rescheduling
              </CardTitle>
              <CardDescription>Bulk reschedule, conflict detection, postpone queue</CardDescription>
            </div>
            <Badge className="bg-green-600">100% Complete</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Schedule Manager */}
            <Link href="/admin/schedule-manager">
              <div className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Schedule Manager
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Main dashboard with day navigation, filters, game list
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    Filters
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Day Tabs
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Pagination
                  </Badge>
                </div>
              </div>
            </Link>

            {/* Bulk Reschedule */}
            <Link href="/admin/schedule-manager/bulk-reschedule">
              <div className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Bulk Reschedule Wizard
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      4-step wizard for weather cancellations (postpone multiple games)
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    Multi-Select
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Reason Input
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Review
                  </Badge>
                </div>
              </div>
            </Link>

            {/* Postponed Queue */}
            <Link href="/admin/schedule-manager/postponed-queue">
              <div className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Postponed Games Queue
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      View and reschedule all postponed games awaiting new dates
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    Urgency Filter
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Quick Reschedule
                  </Badge>
                </div>
              </div>
            </Link>

            {/* Game Detail */}
            <Link href="/admin/games">
              <div className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Game Detail View
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Comprehensive game page with stats, rosters, reschedule history
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    Player Stats
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Rosters
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    History
                  </Badge>
                </div>
              </div>
            </Link>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Key Features Implemented:</h4>
            <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Real-time conflict detection
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Severity-based alerts (error/warning/info)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Reschedule dialog with venue selection
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Cancel dialog with 2-step confirmation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Bulk postpone with atomic transactions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Postponed games queue with urgency indicators
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Phase 1B: Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-purple-600" />
                Phase 1B: Event-Driven Notifications
              </CardTitle>
              <CardDescription>Automatic emails, notification log, manual resend</CardDescription>
            </div>
            <Badge className="bg-green-600">100% Complete</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Notification Log */}
            <Link href="/admin/notifications">
              <div className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Notification Log
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      View all notifications sent, filter by status/type, manual resend
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    Status Filter
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Type Filter
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Resend
                  </Badge>
                </div>
              </div>
            </Link>

            {/* Configuration Needed */}
            <div className="p-4 border-2 border-dashed border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-400">
                    Email Configuration Required
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-500 mt-1">
                    Set up Resend API to test email sending
                  </p>
                </div>
              </div>
              <div className="mt-3 text-xs space-y-1 text-yellow-900 dark:text-yellow-500">
                <p>
                  <strong>1.</strong> Sign up at https://resend.com
                </p>
                <p>
                  <strong>2.</strong> Add to .env.local:
                </p>
                <pre className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-950/40 rounded text-xs">
                  RESEND_API_KEY=re_xxx...
                  {"\n"}FROM_EMAIL=noreply@yourdomain.com
                </pre>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Key Features Implemented:</h4>
            <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Event-driven architecture (EventBus)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Automatic captain resolution
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Template-based email rendering
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Resend API integration
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Delivery status tracking
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Manual resend for failures
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* End-to-End Test Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-orange-600" />
            End-to-End Test Scenarios
          </CardTitle>
          <CardDescription>Step-by-step workflows to test complete features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scenario 1 */}
          <div className="p-4 border rounded-lg bg-accent/50">
            <h3 className="font-semibold mb-2">
              Scenario 1: Weather Cancellation & Bulk Reschedule
            </h3>
            <ol className="text-sm space-y-2 text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">1</span>
                <span>
                  Go to{" "}
                  <Link href="/admin/schedule-manager" className="text-primary underline">
                    Schedule Manager
                  </Link>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">2</span>
                <span>Click "Bulk Reschedule" button in header</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">3</span>
                <span>Select 3-5 scheduled games with checkboxes</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">4</span>
                <span>Enter reason: "Weather cancellation - ice storm"</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">5</span>
                <span>Review and confirm postponement</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">6</span>
                <span>
                  Go to{" "}
                  <Link href="/admin/notifications" className="text-primary underline">
                    Notification Log
                  </Link>{" "}
                  → verify emails sent to captains
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">7</span>
                <span>
                  Go to{" "}
                  <Link href="/admin/schedule-manager/postponed-queue" className="text-primary underline">
                    Postponed Queue
                  </Link>{" "}
                  → see games awaiting reschedule
                </span>
              </li>
            </ol>
          </div>

          {/* Scenario 2 */}
          <div className="p-4 border rounded-lg bg-accent/50">
            <h3 className="font-semibold mb-2">Scenario 2: Single Game Reschedule with Conflicts</h3>
            <ol className="text-sm space-y-2 text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">1</span>
                <span>
                  Go to{" "}
                  <Link href="/admin/schedule-manager" className="text-primary underline">
                    Schedule Manager
                  </Link>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">2</span>
                <span>Click on any scheduled game</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">3</span>
                <span>Click "Reschedule Game" button</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">4</span>
                <span>Change date/time (try same venue, same time as another game)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">5</span>
                <span>Enter reason and attempt reschedule</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">6</span>
                <span>Observe conflict detection (red error or yellow warning)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">7</span>
                <span>Change to valid time → reschedule succeeds</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">8</span>
                <span>Check "Notifications Sent" section on game detail page</span>
              </li>
            </ol>
          </div>

          {/* Scenario 3 */}
          <div className="p-4 border rounded-lg bg-accent/50">
            <h3 className="font-semibold mb-2">Scenario 3: Notification Manual Resend</h3>
            <ol className="text-sm space-y-2 text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">1</span>
                <span>Ensure RESEND_API_KEY is NOT configured (to simulate failure)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">2</span>
                <span>Reschedule a game (notification will fail)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">3</span>
                <span>
                  Go to{" "}
                  <Link href="/admin/notifications" className="text-primary underline">
                    Notification Log
                  </Link>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">4</span>
                <span>Filter by status="failed"</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">5</span>
                <span>Configure RESEND_API_KEY in .env.local</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">6</span>
                <span>Click "Resend" button on failed notification</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">7</span>
                <span>Verify status changes to "sent"</span>
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access Links</CardTitle>
          <CardDescription>Direct navigation to all admin pages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            <Link
              href="/admin"
              className="p-3 text-sm border rounded hover:bg-accent transition-colors flex items-center justify-between"
            >
              <span>Admin Dashboard</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/admin/schedule-manager"
              className="p-3 text-sm border rounded hover:bg-accent transition-colors flex items-center justify-between"
            >
              <span>Schedule Manager</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/admin/schedule-manager/bulk-reschedule"
              className="p-3 text-sm border rounded hover:bg-accent transition-colors flex items-center justify-between"
            >
              <span>Bulk Reschedule</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/admin/schedule-manager/postponed-queue"
              className="p-3 text-sm border rounded hover:bg-accent transition-colors flex items-center justify-between"
            >
              <span>Postponed Queue</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/admin/notifications"
              className="p-3 text-sm border rounded hover:bg-accent transition-colors flex items-center justify-between"
            >
              <span>Notification Log</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/admin/games"
              className="p-3 text-sm border rounded hover:bg-accent transition-colors flex items-center justify-between"
            >
              <span>Games List</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/admin/teams"
              className="p-3 text-sm border rounded hover:bg-accent transition-colors flex items-center justify-between"
            >
              <span>Teams</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/admin/players"
              className="p-3 text-sm border rounded hover:bg-accent transition-colors flex items-center justify-between"
            >
              <span>Players</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/admin/leagues"
              className="p-3 text-sm border rounded hover:bg-accent transition-colors flex items-center justify-between"
            >
              <span>League Management</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm font-medium">Phase 1A: Scheduling</span>
              <Badge className="bg-green-600">Operational</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm font-medium">Phase 1B: Notifications</span>
              <Badge className="bg-green-600">Operational</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm font-medium">Conflict Detection Engine</span>
              <Badge className="bg-green-600">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm font-medium">Event Bus (Domain Events)</span>
              <Badge className="bg-green-600">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm font-medium">Email Service (Resend)</span>
              <Badge variant="secondary">Config Required</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm font-medium">Multi-Tenant RLS</span>
              <Badge className="bg-green-600">Enforced</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
