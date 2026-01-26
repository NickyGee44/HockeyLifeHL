"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { createLeagueAsAdmin } from "@/lib/admin/league-management";
import { generateSlug } from "@/lib/leagues/slug-utils";

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface LeagueFormData {
  // Step 1: Basic Info
  name: string;
  slug: string;
  description: string;
  sport: string;

  // Step 2: Branding
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;

  // Step 3: Domain
  subdomain: string;

  // Step 4: Owner
  ownerEmail: string;
}

/**
 * Multi-step wizard for creating a new league
 * Steps: Basic Info -> Branding -> Domain -> Owner -> Review
 */
export function LeagueCreationWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<LeagueFormData>({
    name: '',
    slug: '',
    description: '',
    sport: 'hockey',
    logoUrl: '',
    primaryColor: '#FF0000',
    secondaryColor: '#000000',
    accentColor: '#FFD700',
    subdomain: '',
    ownerEmail: '',
  });

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const updateFormData = (updates: Partial<LeagueFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1) {
      if (!formData.name || formData.name.length < 3) {
        toast.error('League name must be at least 3 characters');
        return;
      }
      // Auto-generate slug if not set
      if (!formData.slug) {
        const generatedSlug = generateSlug(formData.name);
        updateFormData({ slug: generatedSlug, subdomain: generatedSlug });
      }
    }

    if (currentStep === 3) {
      if (!formData.subdomain || formData.subdomain.length < 2) {
        toast.error('Subdomain is required');
        return;
      }
    }

    if (currentStep === 4) {
      if (!formData.ownerEmail || !formData.ownerEmail.includes('@')) {
        toast.error('Valid owner email is required');
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep((currentStep + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const result = await createLeagueAsAdmin({
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      sport: formData.sport,
      subdomain: formData.subdomain,
      ownerEmail: formData.ownerEmail,
      primaryColor: formData.primaryColor,
      secondaryColor: formData.secondaryColor,
      accentColor: formData.accentColor,
      logoUrl: formData.logoUrl || undefined,
    });

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('League created successfully!');
      router.push(`/admin/leagues/${result.leagueId}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential details about the league</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">League Name *</Label>
              <Input
                id="name"
                placeholder="Ottawa Hockey League"
                value={formData.name}
                onChange={(e) => {
                  updateFormData({ name: e.target.value });
                  // Auto-generate slug as user types
                  if (!formData.slug || formData.slug === generateSlug(formData.name)) {
                    const newSlug = generateSlug(e.target.value);
                    updateFormData({ slug: newSlug, subdomain: newSlug });
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="ottawa-hockey"
                value={formData.slug}
                onChange={(e) => updateFormData({ slug: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from name. Used in URLs.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Ottawa's premier beer league for hockey enthusiasts"
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sport">Sport</Label>
              <Input
                id="sport"
                placeholder="hockey"
                value={formData.sport}
                onChange={(e) => updateFormData({ sport: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Branding */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Visual identity for the league</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                placeholder="https://example.com/logo.png"
                value={formData.logoUrl}
                onChange={(e) => updateFormData({ logoUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Optional. Upload to storage first, then paste URL here.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => updateFormData({ primaryColor: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) => updateFormData({ primaryColor: e.target.value })}
                    placeholder="#FF0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => updateFormData({ secondaryColor: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.secondaryColor}
                    onChange={(e) => updateFormData({ secondaryColor: e.target.value })}
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={formData.accentColor}
                    onChange={(e) => updateFormData({ accentColor: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.accentColor}
                    onChange={(e) => updateFormData({ accentColor: e.target.value })}
                    placeholder="#FFD700"
                  />
                </div>
              </div>
            </div>

            {/* Color Preview */}
            <div className="border border-border rounded-lg p-4 bg-muted/50">
              <p className="text-sm font-medium mb-2">Preview</p>
              <div
                className="text-2xl font-bold mb-2"
                style={{ color: formData.primaryColor }}
              >
                {formData.name || 'League Name'}
              </div>
              <button
                className="px-4 py-2 rounded-md font-medium text-white"
                style={{ backgroundColor: formData.primaryColor }}
              >
                Sample Button
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Domain */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Domain Configuration</CardTitle>
            <CardDescription>How users will access this league</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  placeholder="ottawa"
                  value={formData.subdomain}
                  onChange={(e) => updateFormData({ subdomain: e.target.value.toLowerCase() })}
                />
                <span className="text-sm text-muted-foreground">.beerleaguehockey.ca</span>
              </div>
              <p className="text-xs text-muted-foreground">
                League will be accessible at: {formData.subdomain || 'subdomain'}.beerleaguehockey.ca
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> Custom domains can be configured after league creation from the league settings.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Owner */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>League Owner</CardTitle>
            <CardDescription>Assign ownership of this league</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Owner Email *</Label>
              <Input
                id="ownerEmail"
                type="email"
                placeholder="owner@example.com"
                value={formData.ownerEmail}
                onChange={(e) => updateFormData({ ownerEmail: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                User must already have an account. They will become the league owner.
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                <strong>Important:</strong> Make sure this email matches an existing user account. If the user doesn't exist, league creation will fail.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Review */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
            <CardDescription>Verify all details before creating the league</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Basic Information</h4>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Name:</dt>
                <dd className="font-medium">{formData.name}</dd>
                <dt className="text-muted-foreground">Slug:</dt>
                <dd className="font-medium">{formData.slug}</dd>
                <dt className="text-muted-foreground">Sport:</dt>
                <dd className="font-medium">{formData.sport}</dd>
              </dl>
            </div>

            <div>
              <h4 className="font-medium mb-2">Branding</h4>
              <div className="flex gap-2 mb-2">
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: formData.primaryColor }} />
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: formData.secondaryColor }} />
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: formData.accentColor }} />
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Domain</h4>
              <p className="text-sm">
                <strong>{formData.subdomain}.beerleaguehockey.ca</strong>
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Owner</h4>
              <p className="text-sm">{formData.ownerEmail}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || isSubmitting}
        >
          Back
        </Button>

        {currentStep < totalSteps ? (
          <Button onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create League'}
          </Button>
        )}
      </div>
    </div>
  );
}
