"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export type VerificationStatus = "pending" | "verified" | "failed" | "verifying";

interface DomainVerificationStatusProps {
  domain: string;
  status: VerificationStatus;
  onVerify?: () => Promise<void>;
  autoPolling?: boolean;
  pollingInterval?: number;
}

export function DomainVerificationStatus({
  domain,
  status: initialStatus,
  onVerify,
  autoPolling = false,
  pollingInterval = 30000, // 30 seconds
}: DomainVerificationStatusProps) {
  const [status, setStatus] = useState<VerificationStatus>(initialStatus);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Auto-polling effect
  useEffect(() => {
    if (!autoPolling || status === "verified" || !onVerify) return;

    const interval = setInterval(async () => {
      try {
        setStatus("verifying");
        await onVerify();
        setLastChecked(new Date());
      } catch (error) {
        // Silently fail during auto-polling
        console.error("Auto-verification failed:", error);
      } finally {
        setStatus((prev) => (prev === "verifying" ? "pending" : prev));
      }
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [autoPolling, status, onVerify, pollingInterval]);

  const handleVerify = async () => {
    if (!onVerify) return;

    setIsVerifying(true);
    try {
      await onVerify();
      setStatus("verified");
      setLastChecked(new Date());
      toast.success("Domain verified successfully!");
    } catch (error) {
      setStatus("failed");
      setLastChecked(new Date());
      toast.error("Domain verification failed. Please check your DNS settings.");
      console.error("Verification error:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case "verifying":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Verifying...
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "verified":
        return (
          <p className="text-sm text-green-700">
            Your domain <span className="font-semibold">{domain}</span> has been successfully verified
            and is now active.
          </p>
        );
      case "failed":
        return (
          <p className="text-sm text-destructive">
            We couldn&apos;t verify <span className="font-semibold">{domain}</span>. Please check that
            your DNS records are configured correctly and have had time to propagate.
          </p>
        );
      case "verifying":
        return (
          <p className="text-sm text-muted-foreground">
            Checking DNS records for <span className="font-semibold">{domain}</span>...
          </p>
        );
      case "pending":
      default:
        return (
          <p className="text-sm text-muted-foreground">
            Waiting for DNS verification for <span className="font-semibold">{domain}</span>. This can
            take up to 48 hours after configuring your DNS records.
          </p>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm">Domain Status</span>
            {getStatusBadge()}
          </div>
          {getStatusMessage()}
          {lastChecked && (
            <p className="text-xs text-muted-foreground mt-2">
              Last checked: {lastChecked.toLocaleString()}
            </p>
          )}
        </div>

        {onVerify && status !== "verified" && (
          <Button
            onClick={handleVerify}
            disabled={isVerifying || status === "verifying"}
            size="sm"
            variant={status === "failed" ? "destructive" : "default"}
            className="shrink-0"
          >
            {isVerifying || status === "verifying" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {status === "failed" ? "Retry Verification" : "Verify Domain"}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Auto-polling indicator */}
      {autoPolling && status !== "verified" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-900 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Automatic verification is enabled. We&apos;ll check your DNS records every{" "}
            {pollingInterval / 1000} seconds until verified.
          </p>
        </div>
      )}

      {/* Help text for failed status */}
      {status === "failed" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900 font-semibold mb-2">Troubleshooting Tips:</p>
          <ul className="text-sm text-amber-900 space-y-1 list-disc list-inside">
            <li>Verify that your DNS records are configured exactly as shown in the instructions</li>
            <li>DNS propagation can take up to 48 hours - please be patient</li>
            <li>
              Check your DNS records using a tool like{" "}
              <a
                href={`https://dnschecker.org/#A/${domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold hover:text-amber-950"
              >
                DNS Checker
              </a>
            </li>
            <li>Some registrars require you to remove existing records before adding new ones</li>
            <li>Make sure there are no conflicting CNAME or A records for the same domain</li>
          </ul>
        </div>
      )}

      {/* Success message with next steps */}
      {status === "verified" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-900 font-semibold mb-2">What&apos;s next?</p>
          <ul className="text-sm text-green-900 space-y-1 list-disc list-inside">
            <li>Your custom domain is now active and ready to use</li>
            <li>SSL certificate will be automatically provisioned (may take a few minutes)</li>
            <li>Your league will be accessible at https://{domain}</li>
            <li>The default subdomain will still work as a backup</li>
          </ul>
        </div>
      )}
    </div>
  );
}
