"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function FeaturesSettingsPage() {
  const handleToggle = (feature: string, checked: boolean) => {
    toast.success(`${feature} ${checked ? "enabled" : "disabled"}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Feature Configuration</CardTitle>
          <CardDescription>
            Enable or disable specific functionality for your league.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="drafts" className="text-base">Live Draft System</Label>
              <span className="text-sm text-muted-foreground">
                Enable player ratings, rankings, and the live draft board.
              </span>
            </div>
            <Switch id="drafts" defaultChecked onCheckedChange={(c) => handleToggle("Drafts", c)} />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="trades" className="text-base">Player Trades</Label>
              <span className="text-sm text-muted-foreground">
                Allow captains to propose and accept trades between teams.
              </span>
            </div>
            <Switch id="trades" defaultChecked onCheckedChange={(c) => handleToggle("Trades", c)} />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="registration" className="text-base">Public Player Registration</Label>
              <span className="text-sm text-muted-foreground">
                Allow players to sign up for the league via the public registration page.
              </span>
            </div>
            <Switch id="registration" defaultChecked onCheckedChange={(c) => handleToggle("Registration", c)} />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="payments" className="text-base">Online Payments</Label>
              <span className="text-sm text-muted-foreground">
                Collect league fees via Stripe.
              </span>
            </div>
            <Switch id="payments" defaultChecked onCheckedChange={(c) => handleToggle("Payments", c)} />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="approvals" className="text-base">Require Admin Approval</Label>
              <span className="text-sm text-muted-foreground">
                New players must be approved by an admin before joining a team.
              </span>
            </div>
            <Switch id="approvals" onCheckedChange={(c) => handleToggle("Approvals", c)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
