"use client";

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
import { AlertTriangle, ShieldCheck, CreditCard } from "lucide-react";
import { StripeConnectDashboard } from "@/components/stripe/StripeConnectDashboard";

export default function GeneralSettingsPage({ params }: { params: { league: string } }) {
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
    </div>
  );
}