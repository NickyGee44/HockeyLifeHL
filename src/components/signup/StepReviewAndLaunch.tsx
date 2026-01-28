"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Edit2,
  Mail,
  MapPin,
  Calendar,
  Users,
  CreditCard,
  Sparkles,
  Building2,
  Tag,
  Palette,
  FileText,
} from "lucide-react";

interface StepReviewAndLaunchProps {
  onEditStep: (step: number) => void;
}

export function StepReviewAndLaunch({ onEditStep }: StepReviewAndLaunchProps) {
  const { watch, formState } = useFormContext();
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Watch all form values
  const formData = watch();

  // Pricing tier labels
  const tierLabels = {
    starter: { name: "Starter", price: "$29/month" },
    pro: { name: "Pro", price: "$79/month" },
    enterprise: { name: "Enterprise", price: "Custom Pricing" },
  };

  const selectedTier = tierLabels[formData.subscriptionTier as keyof typeof tierLabels] || tierLabels.pro;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-3xl font-bold">Review & Launch</h2>
        </div>
        <p className="text-muted-foreground text-lg">
          Review your league details before launching. You can edit any section below.
        </p>
      </div>

      {/* Step 1: League Basics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">League Basics</CardTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEditStep(1)}
              className="text-primary hover:text-primary"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">League Name</p>
              <p className="font-semibold">{formData.leagueName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">URL Slug</p>
              <p className="font-mono text-sm">{formData.leagueSlug}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sport</p>
              <p className="font-semibold capitalize">{formData.sport}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tagline</p>
              <p className="italic">{formData.tagline || "None"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Contact Email
              </p>
              <p>{formData.contactEmail}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Location
              </p>
              <p>
                {formData.city}
                {formData.region && `, ${formData.region}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Template Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Design Template</CardTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEditStep(2)}
              className="text-primary hover:text-primary"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Selected Template ID:</p>
            <Badge variant="outline">{formData.templateId || "Not selected"}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Brand Customization */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Brand Customization</CardTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEditStep(3)}
              className="text-primary hover:text-primary"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Color Preset</p>
            <Badge variant="secondary">{formData.colorPresetName || "Default"}</Badge>
          </div>
          {formData.customColors && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Custom Colors</p>
              <div className="flex gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded border"
                    style={{ backgroundColor: formData.customColors.primary }}
                  />
                  <span className="text-xs">Primary</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded border"
                    style={{ backgroundColor: formData.customColors.secondary }}
                  />
                  <span className="text-xs">Secondary</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded border"
                    style={{ backgroundColor: formData.customColors.accent }}
                  />
                  <span className="text-xs">Accent</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 4: League Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">League Details</CardTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEditStep(4)}
              className="text-primary hover:text-primary"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
              <FileText className="h-3 w-3" /> Description
            </p>
            <p className="text-sm">{formData.description || "None provided"}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> Teams
              </p>
              <p className="font-semibold">{formData.teamCountEstimate || 8}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Season
              </p>
              <p className="font-semibold capitalize">{formData.seasonFormat?.replace(/-/g, " ")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" /> Type
              </p>
              <p className="font-semibold capitalize">{formData.leagueType}</p>
            </div>
          </div>
          {formData.expectedStartDate && (
            <div>
              <p className="text-sm text-muted-foreground">Expected Start Date</p>
              <p>{new Date(formData.expectedStartDate).toLocaleDateString()}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 5: Pricing & Features */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Subscription Plan</CardTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEditStep(5)}
              className="text-primary hover:text-primary"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-lg">{selectedTier.name} Plan</p>
                <p className="text-sm text-muted-foreground">{selectedTier.price}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              14-day free trial
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Step 6: Owner Account */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Owner Account</CardTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEditStep(6)}
              className="text-primary hover:text-primary"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-semibold">{formData.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p>{formData.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-semibold capitalize">{formData.ownerRole}</p>
            </div>
            {formData.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p>{formData.phone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Terms & Conditions */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I agree to the Terms & Conditions
              </Label>
              <p className="text-sm text-muted-foreground">
                By creating your league, you agree to our{" "}
                <a href="/terms" target="_blank" className="underline hover:text-primary">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" target="_blank" className="underline hover:text-primary">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Launch Button */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={!agreedToTerms || !formState.isValid}
          className="w-full md:w-auto px-12 py-6 text-lg font-semibold"
        >
          <Building2 className="h-5 w-5 mr-2" />
          Launch My League
        </Button>
        <p className="text-sm text-muted-foreground text-center">
          Your league will be created immediately and you'll be redirected to the onboarding process.
        </p>
      </div>
    </div>
  );
}
