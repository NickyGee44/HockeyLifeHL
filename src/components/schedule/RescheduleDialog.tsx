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
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

/**
 * Reschedule Dialog Component
 *
 * Modal for rescheduling a game with conflict detection.
 * Integrates with POST /api/[tenant]/games/[gameId]/reschedule API.
 *
 * Features:
 * - Date/time picker for new schedule
 * - Optional venue/scorekeeper changes
 * - Reason text field
 * - Real-time conflict detection
 * - Severity-based conflict display (error/warning/info)
 * - Block reschedule if error-level conflicts exist
 * - Allow reschedule with warnings (show user)
 */

type Conflict = {
  type: string;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
};

type RescheduleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  currentScheduledAt: string;
  currentVenue?: { id: string; name: string };
  onSuccess: () => void;
  tenantSlug: string;
};

export function RescheduleDialog({
  open,
  onOpenChange,
  gameId,
  currentScheduledAt,
  currentVenue,
  onSuccess,
  tenantSlug,
}: RescheduleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [newScheduledAt, setNewScheduledAt] = useState("");
  const [reason, setReason] = useState("");
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasErrorConflicts = conflicts.some((c) => c.severity === "error");
  const hasWarningConflicts = conflicts.some((c) => c.severity === "warning");
  const hasInfoConflicts = conflicts.some((c) => c.severity === "info");

  /**
   * Handle reschedule submission
   */
  const handleReschedule = async () => {
    if (!newScheduledAt || !reason.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    if (hasErrorConflicts) {
      setError("Cannot reschedule: There are scheduling conflicts that must be resolved");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/${tenantSlug}/games/${gameId}/reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newScheduledAt,
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Conflict detected
          setConflicts(data.conflicts || []);
          setError("Scheduling conflicts detected. Please review and adjust.");
        } else {
          throw new Error(data.error || "Failed to reschedule game");
        }
        return;
      }

      // Success
      setSuccess(true);
      setConflicts(data.conflicts || []); // May include warnings/info
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        resetForm();
      }, 2000);
    } catch (err) {
      console.error("Error rescheduling game:", err);
      setError(err instanceof Error ? err.message : "Failed to reschedule game");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check for conflicts (preview mode)
   */
  const checkConflicts = async () => {
    if (!newScheduledAt) return;

    setCheckingConflicts(true);
    setConflicts([]);
    setError(null);

    try {
      const response = await fetch(`/api/${tenantSlug}/games/${gameId}/check-conflicts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newScheduledAt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConflicts(data.conflicts || []);
      }
    } catch (err) {
      console.error("Error checking conflicts:", err);
    } finally {
      setCheckingConflicts(false);
    }
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setNewScheduledAt("");
    setReason("");
    setConflicts([]);
    setError(null);
    setSuccess(false);
  };

  /**
   * Get conflict icon by severity
   */
  const getConflictIcon = (severity: "error" | "warning" | "info") => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  /**
   * Get conflict variant by severity
   */
  const getConflictVariant = (severity: "error" | "warning" | "info") => {
    switch (severity) {
      case "error":
        return "destructive";
      case "warning":
        return "default";
      case "info":
        return "secondary";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Game</DialogTitle>
          <DialogDescription>
            Change the game date and time. Conflict detection will ensure no scheduling issues.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Schedule */}
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700 mb-1">Current Schedule</p>
            <p className="text-lg font-semibold">
              {format(new Date(currentScheduledAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </p>
            {currentVenue && (
              <p className="text-sm text-slate-600 mt-1">Venue: {currentVenue.name}</p>
            )}
          </div>

          {/* New Schedule Date/Time */}
          <div className="space-y-2">
            <Label htmlFor="newScheduledAt">
              New Date & Time <span className="text-red-600">*</span>
            </Label>
            <Input
              id="newScheduledAt"
              type="datetime-local"
              value={newScheduledAt}
              onChange={(e) => setNewScheduledAt(e.target.value)}
              onBlur={checkConflicts}
            />
            <p className="text-xs text-muted-foreground">
              Select a new date and time for the game
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Reschedule <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="e.g., Venue unavailable, Weather cancellation, Team request"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Conflict Detection Results */}
          {checkingConflicts && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Checking for conflicts...</AlertTitle>
              <AlertDescription>
                Validating new schedule against league rules and availability
              </AlertDescription>
            </Alert>
          )}

          {conflicts.length > 0 && !checkingConflicts && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Conflict Detection Results</p>
              {conflicts.map((conflict, index) => (
                <Alert key={index} variant={getConflictVariant(conflict.severity)}>
                  <div className="flex items-start gap-2">
                    {getConflictIcon(conflict.severity)}
                    <div className="flex-1 space-y-1">
                      <AlertTitle className="text-sm capitalize">
                        {conflict.severity} - {conflict.type.replace(/_/g, " ")}
                      </AlertTitle>
                      <AlertDescription className="text-xs">
                        {conflict.message}
                      </AlertDescription>
                      {conflict.suggestion && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          💡 {conflict.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success!</AlertTitle>
              <AlertDescription className="text-green-700">
                Game rescheduled successfully. The page will refresh automatically.
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

          {/* Conflict Summary */}
          {conflicts.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              {hasErrorConflicts && (
                <Badge variant="destructive">
                  {conflicts.filter((c) => c.severity === "error").length} Errors
                </Badge>
              )}
              {hasWarningConflicts && (
                <Badge variant="secondary">
                  {conflicts.filter((c) => c.severity === "warning").length} Warnings
                </Badge>
              )}
              {hasInfoConflicts && (
                <Badge variant="outline">
                  {conflicts.filter((c) => c.severity === "info").length} Info
                </Badge>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={loading || hasErrorConflicts || !newScheduledAt || !reason.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rescheduling...
              </>
            ) : (
              "Confirm Reschedule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
