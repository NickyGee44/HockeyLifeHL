"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, Calendar, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";

/**
 * Bulk Reschedule Wizard Page
 *
 * Multi-step wizard for bulk postponing games (weather cancellations).
 * Uses POST /api/[tenant]/games/bulk-reschedule API.
 *
 * Steps:
 * 1. Select Games - Choose games to postpone (with filters)
 * 2. Provide Reason - Enter cancellation reason
 * 3. Review & Confirm - Summary and confirmation
 * 4. Results - Show success/failure results
 */

type Game = {
  id: string;
  scheduledAt: string;
  homeTeamName: string;
  awayTeamName: string;
  venueName?: string;
  divisionName?: string;
};

type BulkRescheduleResult = {
  success: boolean;
  postponedCount: number;
  failedGames: string[];
  errors: Array<{ gameId: string; error: string }>;
};

export default function BulkReschedulePage() {
  const router = useRouter();

  // Wizard step
  const [step, setStep] = useState(1);

  // Games data
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reschedule data
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Results
  const [result, setResult] = useState<BulkRescheduleResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tenantSlug = "pilot"; // TODO: Get from context

  /**
   * Fetch scheduled games
   */
  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch next 30 days of scheduled games
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch(
        `/api/${tenantSlug}/schedule?status=scheduled&start_date=${startDate}&end_date=${endDate}&limit=100`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch games");
      }

      const data = await response.json();
      setGames(
        data.games.map((g: any) => ({
          id: g.id,
          scheduledAt: g.scheduledAt,
          homeTeamName: g.homeTeam.name,
          awayTeamName: g.awayTeam.name,
          venueName: g.venue?.name,
          divisionName: g.division?.name,
        }))
      );
    } catch (err) {
      console.error("Error fetching games:", err);
      setError(err instanceof Error ? err.message : "Failed to load games");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle game selection
   */
  const toggleGameSelection = (gameId: string) => {
    const newSelection = new Set(selectedGameIds);
    if (newSelection.has(gameId)) {
      newSelection.delete(gameId);
    } else {
      newSelection.add(gameId);
    }
    setSelectedGameIds(newSelection);
  };

  /**
   * Select all games
   */
  const selectAllGames = () => {
    setSelectedGameIds(new Set(games.map((g) => g.id)));
  };

  /**
   * Deselect all games
   */
  const deselectAllGames = () => {
    setSelectedGameIds(new Set());
  };

  /**
   * Submit bulk reschedule
   */
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/${tenantSlug}/games/bulk-reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameIds: Array.from(selectedGameIds),
          reason,
          action: "postpone",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to postpone games");
      }

      setResult(data);
      setStep(4); // Move to results step
    } catch (err) {
      console.error("Error postponing games:", err);
      setError(err instanceof Error ? err.message : "Failed to postpone games");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Render step content
   */
  const renderStep = () => {
    switch (step) {
      case 1:
        return renderSelectGamesStep();
      case 2:
        return renderProvideReasonStep();
      case 3:
        return renderReviewStep();
      case 4:
        return renderResultsStep();
      default:
        return null;
    }
  };

  /**
   * Step 1: Select Games
   */
  const renderSelectGamesStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Select Games to Postpone</h2>
          <p className="text-muted-foreground">
            Choose games that need to be rescheduled due to weather or other reasons
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAllGames}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAllGames}>
            Deselect All
          </Button>
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 p-4">
        <p className="text-sm font-medium">
          {selectedGameIds.size} of {games.length} games selected
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading games...</p>
          </CardContent>
        </Card>
      ) : games.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No scheduled games found in the next 30 days</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {games.map((game) => (
            <Card
              key={game.id}
              className={`cursor-pointer transition-colors ${
                selectedGameIds.has(game.id) ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => toggleGameSelection(game.id)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <Checkbox
                  checked={selectedGameIds.has(game.id)}
                  onCheckedChange={() => toggleGameSelection(game.id)}
                />
                <div className="flex-1">
                  <p className="font-semibold">
                    {game.homeTeamName} vs {game.awayTeamName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(game.scheduledAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                  </p>
                  <div className="flex gap-2 mt-1">
                    {game.divisionName && (
                      <Badge variant="secondary" className="text-xs">
                        {game.divisionName}
                      </Badge>
                    )}
                    {game.venueName && (
                      <Badge variant="outline" className="text-xs">
                        {game.venueName}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button
          onClick={() => setStep(2)}
          disabled={selectedGameIds.size === 0}
        >
          Continue ({selectedGameIds.size} games)
        </Button>
      </div>
    </div>
  );

  /**
   * Step 2: Provide Reason
   */
  const renderProvideReasonStep = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Provide Cancellation Reason</h2>
        <p className="text-muted-foreground">
          Explain why these games are being postponed
        </p>
      </div>

      <div className="rounded-lg bg-slate-50 p-4">
        <p className="text-sm font-medium">
          Postponing {selectedGameIds.size} games
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">
          Reason <span className="text-red-600">*</span>
        </Label>
        <Input
          id="reason"
          placeholder="e.g., Weather cancellation - snow storm"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Provide additional context..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>What Happens Next</AlertTitle>
        <AlertDescription>
          Games will be marked as "postponed" and moved to the postponed queue.
          You can reschedule them individually later from the admin dashboard.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={() => setStep(3)} disabled={!reason.trim()}>
          Continue to Review
        </Button>
      </div>
    </div>
  );

  /**
   * Step 3: Review & Confirm
   */
  const renderReviewStep = () => {
    const selectedGames = games.filter((g) => selectedGameIds.has(g.id));

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Review & Confirm</h2>
          <p className="text-muted-foreground">
            Double-check the details before postponing games
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Postpone Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Games to Postpone</p>
              <p className="text-2xl font-bold">{selectedGameIds.size}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Reason</p>
              <p className="text-base">{reason}</p>
            </div>
            {notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-base">{notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Games</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
            {selectedGames.map((game) => (
              <div key={game.id} className="text-sm py-2 border-b last:border-0">
                <p className="font-medium">
                  {game.homeTeamName} vs {game.awayTeamName}
                </p>
                <p className="text-muted-foreground">
                  {format(parseISO(game.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            This will postpone {selectedGameIds.size} games. Teams and players will need to be
            notified separately. This action cannot be undone, but games can be rescheduled later.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            variant="destructive"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Postponing...
              </>
            ) : (
              `Confirm Postpone ${selectedGameIds.size} Games`
            )}
          </Button>
        </div>
      </div>
    );
  };

  /**
   * Step 4: Results
   */
  const renderResultsStep = () => {
    if (!result) return null;

    const hasFailures = result.failedGames.length > 0;

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Results</h2>
          <p className="text-muted-foreground">
            Bulk reschedule operation complete
          </p>
        </div>

        {result.success && !hasFailures ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success!</AlertTitle>
            <AlertDescription className="text-green-700">
              All {result.postponedCount} games have been postponed successfully.
            </AlertDescription>
          </Alert>
        ) : hasFailures ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Partial Success</AlertTitle>
            <AlertDescription>
              {result.postponedCount} games postponed, {result.failedGames.length} failed.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Successfully Postponed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{result.postponedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{result.failedGames.length}</div>
            </CardContent>
          </Card>
        </div>

        {result.errors && result.errors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Failed Games</CardTitle>
              <CardDescription>These games could not be postponed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.errors.map((err, index) => (
                <Alert key={index} variant="destructive">
                  <AlertDescription>
                    Game ID: {err.gameId} - {err.error}
                  </AlertDescription>
                </Alert>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/admin/schedule-manager")}>
            Back to Schedule
          </Button>
          <Button onClick={() => router.push("/admin/schedule-manager/postponed-queue")}>
            View Postponed Queue
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  s === step
                    ? "bg-primary text-white"
                    : s < step
                    ? "bg-green-600 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    s < step ? "bg-green-600" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between max-w-2xl mx-auto mt-2 text-sm text-muted-foreground">
          <span>Select</span>
          <span>Reason</span>
          <span>Review</span>
          <span>Results</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto">{renderStep()}</div>
    </div>
  );
}
