"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Check, ExternalLink, RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

type DNSInstructionsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  verificationStatus: "pending" | "verified" | "failed" | null;
  onRefresh?: () => Promise<void>;
};

export function DNSInstructionsModal({
  open,
  onOpenChange,
  domain,
  verificationStatus,
  onRefresh,
}: DNSInstructionsModalProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(30);

  // Platform domain from environment
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "beerleaguehockey.ca";
  const cnameTarget = `cname.vercel-dns.com`; // Vercel's CNAME target

  // Auto-refresh every 30 seconds if pending
  useEffect(() => {
    if (!open || verificationStatus !== "pending") return;

    const countdown = setInterval(() => {
      setAutoRefreshCountdown((prev) => {
        if (prev <= 1) {
          handleRefresh();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [open, verificationStatus]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      setAutoRefreshCountdown(30);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case "verified":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>DNS Configuration</DialogTitle>
            {getStatusBadge()}
          </div>
          <DialogDescription>
            Follow these steps to connect your custom domain: <strong>{domain}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2 mb-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Add CNAME Record</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Go to your DNS provider (e.g., GoDaddy, Namecheap, Cloudflare) and add a CNAME record:
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-muted p-3 rounded-md">
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Type</div>
                        <div className="font-mono font-medium">CNAME</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy("CNAME", "Record type")}
                      >
                        {copied === "Record type" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between bg-muted p-3 rounded-md">
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Name / Host</div>
                        <div className="font-mono font-medium break-all">
                          {domain.replace(/^https?:\/\//, '')}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(domain.replace(/^https?:\/\//, ''), "Domain name")}
                      >
                        {copied === "Domain name" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between bg-muted p-3 rounded-md">
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Value / Points to</div>
                        <div className="font-mono font-medium">{cnameTarget}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(cnameTarget, "CNAME target")}
                      >
                        {copied === "CNAME target" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    Note: Some DNS providers use "@" or "www" for the name field. Refer to your provider's documentation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Wait for DNS Propagation</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    DNS changes can take anywhere from a few minutes to 48 hours to propagate globally.
                    We'll automatically check the status periodically.
                  </p>

                  {verificationStatus === "pending" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RefreshCw className={`h-4 w-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                          <span className="text-sm text-blue-900">
                            Auto-refresh in {autoRefreshCountdown}s
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRefresh}
                          disabled={isRefreshing}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                          Check Now
                        </Button>
                      </div>
                    </div>
                  )}

                  {verificationStatus === "verified" && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-900 font-medium">
                          Domain verified! Your custom domain is now active.
                        </span>
                      </div>
                    </div>
                  )}

                  {verificationStatus === "failed" && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-900">
                          Verification failed. Please check your DNS settings and try again.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Help Links */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Need Help?</h4>
            <div className="space-y-2">
              <a
                href="https://www.godaddy.com/help/add-a-cname-record-19236"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                GoDaddy DNS Instructions
              </a>
              <a
                href="https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Namecheap DNS Instructions
              </a>
              <a
                href="https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Cloudflare DNS Instructions
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
