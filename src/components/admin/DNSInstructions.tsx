"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface DNSInstructionsProps {
  domain: string;
  recordType: "CNAME" | "A";
  targetValue: string;
  leagueName: string;
}

export function DNSInstructions({ domain, recordType, targetValue, leagueName }: DNSInstructionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              DNS Configuration Instructions
              <Badge variant="outline" className="font-mono text-xs">
                {recordType}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-2">
              Configure your domain registrar to point {domain} to {leagueName}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold mb-1">Important: DNS propagation may take up to 48 hours</p>
            <p>
              After adding these DNS records, it can take anywhere from a few minutes to 48 hours for the
              changes to take effect globally. Don&apos;t worry if verification doesn&apos;t work immediately.
            </p>
          </div>
        </div>

        {/* Step-by-step Instructions */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Step-by-Step Setup</h3>

          {/* Step 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-semibold">
                1
              </div>
              <h4 className="font-semibold">Log in to your domain registrar</h4>
            </div>
            <p className="text-sm text-muted-foreground ml-8">
              Go to the website where you purchased your domain (e.g., GoDaddy, Namecheap, Google Domains)
              and log in to your account.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-semibold">
                2
              </div>
              <h4 className="font-semibold">Find DNS management section</h4>
            </div>
            <p className="text-sm text-muted-foreground ml-8">
              Look for &quot;DNS Settings&quot;, &quot;DNS Management&quot;, &quot;Name Server
              Management&quot;, or similar. This is usually in the domain settings area.
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-semibold">
                3
              </div>
              <h4 className="font-semibold">Add a new DNS record</h4>
            </div>
            <div className="ml-8 space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a new {recordType} record with the following values:
              </p>

              {/* DNS Record Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                {/* Record Type */}
                <div className="grid grid-cols-3 gap-4 items-center">
                  <span className="text-sm font-semibold text-slate-700">Type:</span>
                  <div className="col-span-2 flex items-center justify-between gap-2">
                    <code className="font-mono text-sm bg-white px-3 py-1.5 rounded border flex-1">
                      {recordType}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(recordType, "Record type")}
                      className="shrink-0"
                    >
                      {copiedField === "Record type" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Host/Name */}
                <div className="grid grid-cols-3 gap-4 items-center">
                  <span className="text-sm font-semibold text-slate-700">Host/Name:</span>
                  <div className="col-span-2 flex items-center justify-between gap-2">
                    <code className="font-mono text-sm bg-white px-3 py-1.5 rounded border flex-1 truncate">
                      @ or {domain}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard("@", "Host")}
                      className="shrink-0"
                    >
                      {copiedField === "Host" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Value/Points to */}
                <div className="grid grid-cols-3 gap-4 items-start">
                  <span className="text-sm font-semibold text-slate-700 pt-1.5">
                    Value/Points to:
                  </span>
                  <div className="col-span-2 flex items-start justify-between gap-2">
                    <code className="font-mono text-sm bg-white px-3 py-1.5 rounded border flex-1 break-all">
                      {targetValue}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(targetValue, "Target value")}
                      className="shrink-0 mt-0.5"
                    >
                      {copiedField === "Target value" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* TTL */}
                <div className="grid grid-cols-3 gap-4 items-center">
                  <span className="text-sm font-semibold text-slate-700">TTL:</span>
                  <div className="col-span-2">
                    <code className="font-mono text-sm bg-white px-3 py-1.5 rounded border">
                      Auto or 3600
                    </code>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-900">
                  <strong>Note:</strong> Some registrars use &quot;@&quot; for the root domain, while
                  others require you to enter the full domain name. If one doesn&apos;t work, try the other.
                </p>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-semibold">
                4
              </div>
              <h4 className="font-semibold">Save your changes</h4>
            </div>
            <p className="text-sm text-muted-foreground ml-8">
              Save the DNS record and wait for propagation. This can take anywhere from a few minutes to 48
              hours.
            </p>
          </div>

          {/* Step 5 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-semibold">
                5
              </div>
              <h4 className="font-semibold">Verify your domain</h4>
            </div>
            <p className="text-sm text-muted-foreground ml-8">
              Once the DNS changes have propagated, click the &quot;Verify Domain&quot; button to
              complete the setup.
            </p>
          </div>
        </div>

        {/* Common Registrar Links */}
        <div className="pt-4 border-t">
          <h4 className="font-semibold mb-3 text-sm">Popular Registrar DNS Guides:</h4>
          <div className="grid sm:grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild className="justify-start">
              <a
                href="https://www.godaddy.com/help/manage-dns-records-680"
                target="_blank"
                rel="noopener noreferrer"
              >
                GoDaddy Guide
                <ExternalLink className="ml-auto h-3 w-3" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="justify-start">
              <a
                href="https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Namecheap Guide
                <ExternalLink className="ml-auto h-3 w-3" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="justify-start">
              <a
                href="https://support.google.com/domains/answer/3290350"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Domains Guide
                <ExternalLink className="ml-auto h-3 w-3" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="justify-start">
              <a
                href="https://www.cloudflare.com/learning/dns/dns-records/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cloudflare Guide
                <ExternalLink className="ml-auto h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
