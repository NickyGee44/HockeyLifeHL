"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

/**
 * Cancel Game Dialog Component
 *
 * Modal for permanently cancelling a game.
 * Integrates with POST /api/[tenant]/games/[gameId]/cancel API.
 *
 * Features:
 * - Reason dropdown (team_forfeit, venue_unavailable, weather, other)
 * - Optional notes field
 * - Confirmation prompt
 * - Idempotent (safe to cancel already-cancelled games)
 */

type CancelGameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  scheduledAt: string;
  homeTeamName: string;
  awayTeamName: string;
  onSuccess: () => void;
  tenantSlug: string;
};

const CANCEL_REASONS = [
  { value: "team_forfeit", label: "Team Forfeit" },
  { value: "venue_unavailable", label: "Venue Unavailable" },
  { value: "weather", label: "Weather Conditions" },
  { value: "insufficient_players", label: "Insufficient Players" },
  { value: "league_decision", label: "League Decision" },
  { value: "other", label: "Other" },
];

export function CancelGameDialog({
  open,
  onOpenChange,
  gameId,
  scheduledAt,
  homeTeamName,
  awayTeamName,
  onSuccess,
  tenantSlug,
}: CancelGameDialogProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  /**
   * Handle cancel game submission
   */
  const handleCancel = async () => {
    if (!reason) {
      setError("Please select a reason for cancellation");
      return;
    }

    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/${tenantSlug}/games/${gameId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel game");
      }

      // Success
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        resetForm();
      }, 2000);
    } catch (err) {
      console.error("Error cancelling game:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel game");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setReason("");
    setNotes("");
    setError(null);
    setSuccess(false);
    setConfirmed(false);
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {confirmed ? "Confirm Cancellation" : "Cancel Game"}
          </DialogTitle>
          <DialogDescription>
            {confirmed
              ? "This action cannot be undone. The game will be permanently cancelled."
              : "Permanently cancel this game. This cannot be undone."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Game Details */}
          <div className="rounded-lg bg-slate-50 p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">Game Details</p>
            <p className="text-lg font-semibold">
              {homeTeamName} vs {awayTeamName}
            </p>
            <p className="text-sm text-slate-600">
              {format(new Date(scheduledAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>

          {!confirmed ? (
            <>
              {/* Reason Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason for Cancellation <span className="text-red-600">*</span>
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCEL_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Optional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g., Team did not show up, Facility closed due to power outage"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Provide additional context if needed
                </p>
              </div>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning: Permanent Action</AlertTitle>
              <AlertDescription>
                This game will be permanently cancelled. Players and team captains will need to
                be notified separately. This cannot be undone.
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success!</AlertTitle>
              <AlertDescription className="text-green-700">
                Game cancelled successfully. The page will refresh automatically.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {confirmed ? "Go Back" : "Cancel"}
          </Button>
          <Button
            variant={confirmed ? "destructive" : "default"}
            onClick={handleCancel}
            disabled={loading || !reason}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : confirmed ? (
              "Yes, Cancel Game"
            ) : (
              "Continue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
