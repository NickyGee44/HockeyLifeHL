"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { currentLeague } from "@/lib/league-config";
import Image from "next/image";
import { AlertTriangle, ShieldCheck, CreditCard, Globe, ExternalLink } from "lucide-react";
import { StripeConnectDashboard } from "@/components/stripe/StripeConnectDashboard";
import { DNSInstructionsModal } from "@/components/domains/dns-instructions-modal";
import { initiateDomainVerification, verifyDomainOwnership } from "@/lib/domains/domain-verification";

export default function GeneralSettingsPage({ params }: { params: { league: string } }) {
  const [showDNSModal, setShowDNSModal] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [domainVerificationStatus, setDomainVerificationStatus] = useState<"pending" | "verified" | "failed" | null>(null);

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: "HockeyLifeHL",
      description: "The ultimate men's recreational hockey league.",
      contactEmail: "commissioner@hockeylifehl.com",
      primaryColor: "#E31837",
      secondaryColor: "#0066CC",
      status: "active"
    }
  });

  const primaryColor = watch("primaryColor");
  const leagueName = watch("name");

  const onSubmit = async (data: any) => {
    console.log("Updating league:", data);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("League settings updated");
  };

  const handleVerifyDomain = async () => {
    if (!customDomain) {
      toast.error("Please enter a domain first");
      return;
    }

    toast.info("Initiating domain verification...");

    const result = await initiateDomainVerification(params.league, customDomain);

    if (result.error) {
      toast.error(result.error);
      setDomainVerificationStatus("failed");
      return;
    }

    setDomainVerificationStatus("pending");
    setShowDNSModal(true);
    toast.success("Verification initiated. Please add the TXT record to your DNS.");
  };

  const handleRefreshDomainStatus = async () => {
    toast.info("Checking DNS configuration...");

    const result = await verifyDomainOwnership(params.league);

    if (result.error) {
      toast.error(result.error);
      setDomainVerificationStatus("failed");
      return;
    }

    if (result.status === "verified") {
      setDomainVerificationStatus("verified");
      toast.success("Domain verified successfully!");
    } else {
      setDomainVerificationStatus("failed");
      toast.error("Domain verification failed. Please check your DNS settings.");
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">General Settings</h2>
          <p className="text-muted-foreground">Manage your league profile and core configuration.</p>
        </div>
      </div>

      <Separator />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>League Profile</CardTitle>
            <CardDescription>Public identity of your league.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="space-y-2">
                <Label>League Logo</Label>
                <div className="relative h-24 w-24 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden">
                  <Image src="/logo.png" alt="Logo" width={64} height={64} className="object-contain" />
                </div>
                <Button variant="outline" size="sm" type="button" className="w-24 text-[10px]">Change</Button>
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">League Name</Label>
                  <Input id="name" {...register("name", { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" {...register("description")} rows={3} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input id="contactEmail" type="email" {...register("contactEmail")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">League Status</Label>
                <Select defaultValue="active">
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Branding & Colors</CardTitle>
            <CardDescription>Custom theme for your league dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input type="color" className="w-12 h-10 p-1 cursor-pointer" {...register("primaryColor")} />
                  <Input {...register("primaryColor")} className="font-mono uppercase" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input type="color" className="w-12 h-10 p-1 cursor-pointer" {...register("secondaryColor")} />
                  <Input {...register("secondaryColor")} className="font-mono uppercase" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Domain */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Custom Domain
                </CardTitle>
                <CardDescription>Use your own domain for your league (e.g., yourleague.com)</CardDescription>
              </div>
              {domainVerificationStatus && (
                <Badge
                  variant={domainVerificationStatus === "verified" ? "default" : domainVerificationStatus === "failed" ? "destructive" : "secondary"}
                  className={domainVerificationStatus === "verified" ? "bg-green-600" : ""}
                >
                  {domainVerificationStatus === "verified" && "Verified"}
                  {domainVerificationStatus === "pending" && "Pending"}
                  {domainVerificationStatus === "failed" && "Failed"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customDomain">Domain Name</Label>
              <div className="flex gap-2">
                <Input
                  id="customDomain"
                  type="text"
                  placeholder="yourdomain.com"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerifyDomain}
                  disabled={!customDomain}
                >
                  Configure DNS
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your custom domain and we'll guide you through the DNS configuration.
              </p>
            </div>

            {domainVerificationStatus === "verified" && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">Domain Active</p>
                  <p className="text-xs text-green-700">
                    Your custom domain is configured and active. Your league is accessible at{" "}
                    <a href={`https://${customDomain}`} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                      {customDomain}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              </div>
            )}

            {domainVerificationStatus === "pending" && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2">
                <Globe className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Verification Pending</p>
                  <p className="text-xs text-blue-700">
                    Follow the DNS instructions to complete domain verification. This can take up to 48 hours.
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-blue-600"
                    onClick={() => setShowDNSModal(true)}
                  >
                    View DNS Instructions
                  </Button>
                </div>
              </div>
            )}

            {domainVerificationStatus === "failed" && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Verification Failed</p>
                  <p className="text-xs text-red-700">
                    We couldn't verify your domain. Please check your DNS settings and try again.
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-red-600"
                    onClick={() => setShowDNSModal(true)}
                  >
                    Review DNS Instructions
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription & Payments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Plan</span>
                  <Badge variant="default" className="bg-canada-red">PRO PLAN</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium text-green-500">Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Next Renewal</span>
                  <span className="text-sm font-medium">Feb 25, 2026</span>
                </div>
                <Button variant="outline" className="w-full mt-2" type="button">Manage Billing</Button>
              </div>
            </CardContent>
          </Card>

          <StripeConnectDashboard leagueId={params.league} leagueName={leagueName} />
        </div>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
            {isSubmitting ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </form>

      {/* Danger Zone */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions for your league.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator className="bg-destructive/20" />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Archive League</p>
              <p className="text-xs text-muted-foreground">Temporarily disable all activities.</p>
            </div>
            <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">Archive</Button>
          </div>
          <Separator className="bg-destructive/20" />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Delete League</p>
              <p className="text-xs text-muted-foreground">Permanently remove all data, teams, and stats.</p>
            </div>
            <Button variant="destructive">Delete League</Button>
          </div>
        </CardContent>
      </Card>

      {/* DNS Instructions Modal */}
      <DNSInstructionsModal
        open={showDNSModal}
        onOpenChange={setShowDNSModal}
        domain={customDomain}
        verificationStatus={domainVerificationStatus}
        onRefresh={handleRefreshDomainStatus}
      />
    </div>
  );
}