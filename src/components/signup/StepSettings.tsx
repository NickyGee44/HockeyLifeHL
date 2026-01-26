"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StepSettings() {
  const { register, setValue, watch } = useFormContext();
  const statMode = watch("statMode");

  return (
    <Card>
      <CardHeader>
        <CardTitle>League Settings</CardTitle>
        <CardDescription>
          Configure how your league operates. You can change these later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base">Stat Entry Mode</Label>
          <RadioGroup 
            onValueChange={(val) => setValue("statMode", val)} 
            defaultValue="captain"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className={`flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 cursor-pointer ${statMode === 'captain' ? 'border-primary bg-muted/50' : ''}`}>
              <RadioGroupItem value="captain" id="captain" />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="captain" className="cursor-pointer font-bold">
                  Captain Entry (Free)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Team captains enter stats after each game. Free and simple.
                </p>
              </div>
            </div>
            <div className={`flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 cursor-pointer ${statMode === 'scorekeeper' ? 'border-primary bg-muted/50' : ''}`}>
              <RadioGroupItem value="scorekeeper" id="scorekeeper" />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="scorekeeper" className="cursor-pointer font-bold">
                  Scorekeeper Entry (Pro)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Hired scorekeepers use iPads to track stats live.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-base">Features</Label>
          <div className="grid gap-4">
            <div className="flex items-center space-x-2 border p-4 rounded-md">
              <Checkbox id="drafts" defaultChecked onCheckedChange={(c) => setValue("features.drafts", c)} />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="drafts" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Live Draft System
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable player ratings and draft tools.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 border p-4 rounded-md">
              <Checkbox id="payments" defaultChecked onCheckedChange={(c) => setValue("features.payments", c)} />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="payments" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  League Payments
                </Label>
                <p className="text-sm text-muted-foreground">
                  Collect fees online via Stripe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
