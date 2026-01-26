"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { setCustomDomain, verifyCustomDomain, removeCustomDomain } from "@/lib/admin/domain-verification";

interface DomainVerificationProps {
  leagueId: string;
  currentDomain?: string | null;
  verified?: boolean;
}

/**
 * Domain verification UI component
 * Allows setting, verifying, and removing custom domains
 */
export function DomainVerification({
  leagueId,
  currentDomain,
  verified = false,
}: DomainVerificationProps) {
  const [domain, setDomain] = useState(currentDomain || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(verified);

  const handleSetDomain = async () => {
    if (!domain || domain.trim() === '') {
      toast.error('Please enter a domain');
      return;
    }

    setIsLoading(true);
    const result = await setCustomDomain(leagueId, domain);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Domain set successfully. Please configure DNS and verify.');
      setIsVerified(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!domain || domain.trim() === '') {
      toast.error('Please enter a domain first');
      return;
    }

    setIsLoading(true);
    const result = await verifyCustomDomain(leagueId, domain);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.verified) {
      toast.success(result.message || 'Domain verified successfully!');
      setIsVerified(true);
    }
  };

  const handleRemoveDomain = async () => {
    if (!confirm('Are you sure you want to remove this custom domain?')) {
      return;
    }

    setIsLoading(true);
    const result = await removeCustomDomain(leagueId);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Custom domain removed');
      setDomain('');
      setIsVerified(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Domain Input */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Domain</CardTitle>
          <CardDescription>
            Connect a custom domain to this league instance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="yourleague.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={isLoading}
            />
            {isVerified ? (
              <Badge className="bg-green-600 self-center px-3">Verified</Badge>
            ) : (
              <Badge variant="outline" className="self-center px-3">Not Verified</Badge>
            )}
          </div>

          <div className="flex gap-2">
            {!currentDomain || domain !== currentDomain ? (
              <Button onClick={handleSetDomain} disabled={isLoading}>
                {isLoading ? 'Setting...' : 'Set Domain'}
              </Button>
            ) : (
              <>
                {!isVerified && (
                  <Button onClick={handleVerifyDomain} disabled={isLoading}>
                    {isLoading ? 'Verifying...' : 'Verify Domain'}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={handleRemoveDomain}
                  disabled={isLoading}
                >
                  Remove Domain
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DNS Instructions */}
      {domain && !isVerified && (
        <Card>
          <CardHeader>
            <CardTitle>DNS Configuration</CardTitle>
            <CardDescription>
              Add these DNS records to your domain registrar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
              <div className="grid grid-cols-4 gap-4 font-bold border-b border-border pb-2">
                <div>Type</div>
                <div>Name</div>
                <div>Value</div>
                <div>TTL</div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>CNAME</div>
                <div>@ or www</div>
                <div>cname.vercel-dns.com</div>
                <div>3600</div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>1. Log in to your domain registrar (GoDaddy, Namecheap, etc.)</p>
              <p>2. Navigate to DNS settings for {domain}</p>
              <p>3. Add a CNAME record with the values shown above</p>
              <p>4. Wait 5-60 minutes for DNS propagation</p>
              <p>5. Click Verify Domain button above</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> DNS propagation can take up to 48 hours in some cases, but typically completes within an hour.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Status */}
      {isVerified && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-600">Domain Verified!</CardTitle>
            <CardDescription>
              Your league is now accessible at {domain}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>✓ DNS records verified</p>
              <p>✓ Domain configured successfully</p>
              <p>✓ League accessible at custom domain</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
