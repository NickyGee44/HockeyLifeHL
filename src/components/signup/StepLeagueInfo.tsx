"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StepLeagueInfo() {
  const { register, formState: { errors } } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>League Details</CardTitle>
        <CardDescription>
          Let&apos;s start with the basics. What should we call your league?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="leagueName">League Name</Label>
          <Input 
            id="leagueName" 
            placeholder="e.g. Sunday Night Beer League" 
            {...register("leagueName", { required: "League name is required" })}
          />
          {errors.leagueName && (
            <p className="text-sm text-destructive">{errors.leagueName.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="leagueSlug">League URL (Slug)</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">hockeylifehl.app/leagues/</span>
            <Input 
              id="leagueSlug" 
              placeholder="sunday-beer-league" 
              {...register("leagueSlug", { 
                required: "Slug is required",
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message: "Only lowercase letters, numbers, and hyphens allowed"
                }
              })}
            />
          </div>
          {errors.leagueSlug && (
            <p className="text-sm text-destructive">{errors.leagueSlug.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="leagueDescription">Description (Optional)</Label>
          <Textarea 
            id="leagueDescription" 
            placeholder="Briefly describe your league..." 
            {...register("leagueDescription")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
