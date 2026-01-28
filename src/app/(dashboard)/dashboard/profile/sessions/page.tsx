"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Monitor,
  Smartphone,
  Tablet,
  Chrome,
  Globe,
  MapPin,
  Calendar,
  LogOut,
  Shield,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { UserSession } from "@/lib/session-tracking";
import {
  getActiveSessionsAction,
  revokeSessionAction,
  revokeAllOtherSessionsAction,
} from "@/lib/session-tracking/actions";

function getDeviceIcon(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return <Smartphone className="h-5 w-5" />;
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return <Tablet className="h-5 w-5" />;
  }
  return <Monitor className="h-5 w-5" />;
}

function getBrowserIcon(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome')) {
    return <Chrome className="h-4 w-4" />;
  }
  return <Globe className="h-4 w-4" />;
}

function getDeviceDescription(userAgent: string) {
  const ua = userAgent.toLowerCase();

  // Device type
  let device = 'Desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device = 'Tablet';
  }

  // Browser
  let browser = 'Unknown Browser';
  if (ua.includes('chrome')) {
    browser = 'Chrome';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('safari')) {
    browser = 'Safari';
  } else if (ua.includes('edge')) {
    browser = 'Edge';
  }

  // OS
  let os = '';
  if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('mac')) {
    os = 'macOS';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
  }

  return `${device} • ${browser}${os ? ` • ${os}` : ''}`;
}

export default function ActiveSessionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    const { sessions: fetchedSessions, error } = await getActiveSessionsAction();

    if (error) {
      toast.error("Failed to load sessions");
      console.error(error);
    } else {
      setSessions(fetchedSessions);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadSessions();
    }
  }, [user, authLoading]);

  const handleRevokeSession = async (sessionId: string) => {
    setRevoking(sessionId);

    const { success, error } = await revokeSessionAction(sessionId);

    if (success) {
      toast.success("Session signed out successfully");
      await loadSessions();
    } else {
      toast.error(error || "Failed to sign out session");
    }

    setRevoking(null);
  };

  const handleRevokeAllOthers = async () => {
    if (!sessions.length) return;

    // Assume current session is the most recent one
    const currentSession = sessions[0];

    setRevokingAll(true);

    const { count, error } = await revokeAllOtherSessionsAction(currentSession.id);

    if (error) {
      toast.error(error || "Failed to sign out other sessions");
    } else {
      toast.success(`Signed out ${count} ${count === 1 ? 'device' : 'devices'}`);
      await loadSessions();
    }

    setRevokingAll(false);
  };

  if (authLoading || loading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const hasMultipleSessions = sessions.length > 1;

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Active Sessions</h1>
        <p className="text-muted-foreground">
          Manage your active login sessions across all devices. You can sign out from any device at any time.
        </p>
      </div>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          For your security, you can have a maximum of 5 active sessions. If you see any unfamiliar sessions,
          sign them out immediately and consider changing your password.
        </AlertDescription>
      </Alert>

      {/* Session Limit Info */}
      <Card>
        <CardHeader>
          <CardTitle>Session Overview</CardTitle>
          <CardDescription>
            You have {sessions.length} of 5 active sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Active Sessions</p>
                <p className="text-sm text-muted-foreground">
                  {sessions.length === 1
                    ? "You're signed in on this device only"
                    : `You're signed in on ${sessions.length} devices`
                  }
                </p>
              </div>
              {hasMultipleSessions && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRevokeAllOthers}
                  disabled={revokingAll}
                >
                  {revokingAll ? "Signing Out..." : "Sign Out All Other Devices"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No active sessions found
            </CardContent>
          </Card>
        ) : (
          sessions.map((session, index) => {
            const isCurrentSession = index === 0; // Assume first is current

            return (
              <Card key={session.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Device Icon */}
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                        {getDeviceIcon(session.userAgent || '')}
                      </div>

                      {/* Session Info */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          {getBrowserIcon(session.userAgent || '')}
                          <h3 className="font-semibold">
                            {getDeviceDescription(session.userAgent || 'Unknown device')}
                          </h3>
                          {isCurrentSession && (
                            <Badge variant="secondary" className="ml-2">
                              Current Session
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          {session.ipAddress && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span>{session.ipAddress}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Last active {formatDistanceToNow(new Date(session.lastActive), { addSuffix: true })}
                            </span>
                          </div>

                          <div className="text-xs">
                            Created {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {!isCurrentSession && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revoking === session.id}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {revoking === session.id ? "Signing Out..." : "Sign Out"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Warning for suspicious activity */}
      {sessions.length >= 4 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You're approaching the maximum session limit. If you don't recognize some of these sessions,
            sign them out and change your password immediately.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
