"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, Mail, ArrowLeft, RefreshCw, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { useActiveLeague } from "@/hooks/use-league";
import { format, parseISO } from "date-fns";

/**
 * Admin Notification Log Page
 *
 * Features:
 * - View all notifications sent by the system
 * - Filter by status (pending, sent, failed)
 * - Filter by type (game_rescheduled, game_cancelled, etc.)
 * - View notification details
 * - Manually resend failed notifications
 * - Export to CSV (Phase 2)
 *
 * Uses GET /api/[tenant]/notifications API
 */

type Notification = {
  id: string;
  type: string;
  channel: string;
  status: "pending" | "sent" | "failed" | "bounced";
  subject?: string;
  body: string;
  recipientName?: string;
  recipientEmail?: string;
  sentAt?: string;
  failedAt?: string;
  failureReason?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: string;
};

export default function NotificationLogPage() {
  const router = useRouter();
  const { leagueSlug } = useActiveLeague();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Selected notification for details view
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  /**
   * Fetch notifications
   */
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);
      params.append("limit", "100");

      const response = await fetch(`/api/${leagueSlug}/notifications?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [statusFilter, typeFilter]);

  /**
   * Handle resend notification
   */
  const handleResend = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/${leagueSlug}/notifications/${notificationId}/resend`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to resend notification");
      }

      // Refresh list
      fetchNotifications();
    } catch (err) {
      console.error("Error resending notification:", err);
      alert(err instanceof Error ? err.message : "Failed to resend notification");
    }
  };

  /**
   * Get status badge variant
   */
  const getStatusBadge = (status: Notification["status"]) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "bounced":
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Bounced</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  /**
   * Get type display name
   */
  const getTypeDisplayName = (type: string) => {
    const typeMap: Record<string, string> = {
      game_rescheduled: "Game Rescheduled",
      game_cancelled: "Game Cancelled",
      score_submitted: "Score Submitted",
      payment_due: "Payment Due",
      payment_overdue: "Payment Overdue",
    };
    return typeMap[type] || type;
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="h-8 w-8" />
            Notification Log
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all notifications sent by the system
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchNotifications()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {notifications.filter((n) => n.status === "sent").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {notifications.filter((n) => n.status === "failed").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {notifications.filter((n) => n.status === "pending").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="game_rescheduled">Game Rescheduled</SelectItem>
                <SelectItem value="game_cancelled">Game Cancelled</SelectItem>
                <SelectItem value="score_submitted">Score Submitted</SelectItem>
                <SelectItem value="payment_due">Payment Due</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Notifications List */}
      {notifications.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
            <p className="text-muted-foreground">
              No notifications match your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Notification History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 rounded-lg border transition-colors hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Type and Status */}
                    <div className="flex items-center gap-2">
                      {getStatusBadge(notification.status)}
                      <Badge variant="outline">{getTypeDisplayName(notification.type)}</Badge>
                      <Badge variant="secondary">{notification.channel}</Badge>
                    </div>

                    {/* Subject */}
                    {notification.subject && (
                      <p className="font-medium">{notification.subject}</p>
                    )}

                    {/* Recipient */}
                    <p className="text-sm text-muted-foreground">
                      To: {notification.recipientEmail || notification.recipientName || "Unknown"}
                    </p>

                    {/* Timestamps */}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        Created: {format(parseISO(notification.createdAt), "MMM d, yyyy h:mm a")}
                      </span>
                      {notification.sentAt && (
                        <span>
                          Sent: {format(parseISO(notification.sentAt), "MMM d, yyyy h:mm a")}
                        </span>
                      )}
                      {notification.failedAt && (
                        <span>
                          Failed: {format(parseISO(notification.failedAt), "MMM d, yyyy h:mm a")}
                        </span>
                      )}
                    </div>

                    {/* Failure Reason */}
                    {notification.failureReason && (
                      <div className="text-sm text-red-600">
                        <span className="font-medium">Error: </span>
                        {notification.failureReason}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedNotification(notification)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Details
                    </Button>
                    {notification.status === "failed" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleResend(notification.id)}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Resend
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notification Details Modal (Phase 2) */}
      {/* TODO: Build modal with full notification details and body preview */}
    </div>
  );
}
