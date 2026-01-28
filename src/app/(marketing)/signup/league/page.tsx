"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, Sparkles, Check, Zap, Crown, Building, Upload, Palette } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  trackSignupStarted,
  trackSignupStepCompleted,
  trackSignupAbandoned,
  trackTemplateSelected,
  trackSignupCompleted,
} from "@/lib/analytics";
import { TemplateSelector } from "@/components/signup/TemplateSelector";
import { StepReviewAndLaunch } from "@/components/signup/StepReviewAndLaunch";
import { getAllTemplates } from "@/lib/templates/actions";
import type { SiteTemplate } from "@/types/site-templates";

type FormData = {
  // Step 1: League Basics
  leagueName: string;
  leagueSlug: string;
  sport: string;
  tagline: string;
  contactEmail: string;
  city: string;
  region: string;

  // Step 2: Template Selection
  templateId: string;

  // Step 3: Brand Customization
  colorPresetName: string;
  customColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logoFile?: File | null;

  // Step 4: League Details
  description: string;
  teamCountEstimate: number;
  seasonFormat: string;
  expectedStartDate: string;
  leagueType: string;

  // Step 5: Features & Pricing
  subscriptionTier: string;

  // Step 6: Owner Account
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  ownerRole: string;
};

/**
 * Helper function to get step name for analytics
 */
const getStepName = (stepNumber: number): string => {
  const stepNames: Record<number, string> = {
    1: "League Basics",
    2: "Template Selection",
    3: "Brand Customization",
    4: "League Details",
    5: "Features & Pricing",
    6: "Owner Account",
    7: "Review & Launch",
  };
  return stepNames[stepNumber] || `Step ${stepNumber}`;
};

export default function LeagueSignupPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [signupCompleted, setSignupCompleted] = useState(false);
  const [templates, setTemplates] = useState<SiteTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const router = useRouter();

  const methods = useForm<FormData>({
    mode: "onChange",
    defaultValues: {
      // Step 1: League Basics
      leagueName: "",
      leagueSlug: "",
      sport: "hockey",
      tagline: "",
      contactEmail: "",
      city: "",
      region: "",

      // Step 2: Template Selection
      templateId: "",

      // Step 3: Brand Customization
      colorPresetName: "",
      customColors: undefined,
      logoFile: null,

      // Step 4: League Details
      description: "",
      teamCountEstimate: 8,
      seasonFormat: "fall-winter",
      expectedStartDate: "",
      leagueType: "recreational",

      // Step 5: Features & Pricing
      subscriptionTier: "pro",

      // Step 6: Owner Account
      fullName: "",
      email: "",
      password: "",
      phone: "",
      ownerRole: "owner",
    },
  });

  const totalSteps = 7;
  const progress = step > totalSteps ? 100 : ((step - 1) / totalSteps) * 100;

  // Track signup started on component mount
  useEffect(() => {
    trackSignupStarted();
  }, []);

  // Fetch templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setTemplatesLoading(true);
        const result = await getAllTemplates();
        if (result.success && result.data) {
          setTemplates(result.data);
        } else {
          toast.error("Failed to load templates");
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
        toast.error("Failed to load templates");
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // Track abandonment when user leaves without completing
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!signupCompleted) {
        trackSignupAbandoned(step, getStepName(step));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Track abandonment on unmount if not completed
      if (!signupCompleted) {
        trackSignupAbandoned(step, getStepName(step));
      }
    };
  }, [step, signupCompleted]);

  // Template selection is tracked in the TemplateSelector onSelect callback
  // with proper template details (slug, name) from the templates array

  const handleNext = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];

    // Define required fields for each step
    switch (step) {
      case 1: // League Basics
        fieldsToValidate = ["leagueName", "leagueSlug", "sport", "contactEmail", "city"];
        break;
      case 2: // Template Selection
        fieldsToValidate = ["templateId"];
        break;
      case 3: // Brand Customization
        fieldsToValidate = ["colorPresetName"];
        break;
      case 4: // League Details
        fieldsToValidate = ["description", "teamCountEstimate", "seasonFormat", "leagueType"];
        break;
      case 5: // Features & Pricing
        fieldsToValidate = ["subscriptionTier"];
        break;
      case 6: // Owner Account
        fieldsToValidate = ["fullName", "email", "password"];
        break;
      default:
        break;
    }

    const isValid = await methods.trigger(fieldsToValidate);
    if (isValid) {
      // Track step completion before advancing
      const currentStepName = getStepName(step);
      const formValues = methods.getValues();

      // Build analytics properties based on current step
      const analyticsProps: any = {};

      if (step === 1) {
        analyticsProps.sport = formValues.sport;
        analyticsProps.city = formValues.city;
        analyticsProps.region = formValues.region;
      } else if (step === 2 && formValues.templateId) {
        analyticsProps.templateId = formValues.templateId;
      } else if (step === 4) {
        analyticsProps.teamCount = formValues.teamCountEstimate;
        analyticsProps.seasonFormat = formValues.seasonFormat;
        analyticsProps.leagueType = formValues.leagueType;
      } else if (step === 5) {
        analyticsProps.subscriptionTier = formValues.subscriptionTier;
      }

      trackSignupStepCompleted(step, currentStepName, analyticsProps);

      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Step 1: Create user account
      const signUpFormData = new globalThis.FormData();
      signUpFormData.append('email', data.email);
      signUpFormData.append('password', data.password);
      signUpFormData.append('fullName', data.fullName);
      signUpFormData.append('jerseyNumber', ''); // Not required for league owner
      signUpFormData.append('position', ''); // Not required for league owner

      const { signUp } = await import('@/lib/auth/actions');
      const signUpResult = await signUp(signUpFormData);

      if (signUpResult.error) {
        toast.error(signUpResult.error);
        setIsSubmitting(false);
        return;
      }

      // Step 2: Sign in the new user
      const signInFormData = new globalThis.FormData();
      signInFormData.append('email', data.email);
      signInFormData.append('password', data.password);

      const { signIn } = await import('@/lib/auth/actions');
      try {
        await signIn(signInFormData);
      } catch (error) {
        // Sign in redirects on success, so catch the redirect
        // User is now authenticated
      }

      // Small delay to ensure auth session is set
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Create the league with all enhanced fields
      const leagueFormData = new globalThis.FormData();

      // Basic fields
      leagueFormData.append('name', data.leagueName);
      leagueFormData.append('slug', data.leagueSlug || '');
      leagueFormData.append('sport', data.sport);
      leagueFormData.append('description', data.description || `${data.leagueName} - A ${data.sport} league`);

      // Enhanced league fields
      if (data.tagline) leagueFormData.append('tagline', data.tagline);
      if (data.contactEmail) leagueFormData.append('contactEmail', data.contactEmail);
      if (data.city) leagueFormData.append('city', data.city);
      if (data.region) leagueFormData.append('region', data.region);
      if (data.teamCountEstimate) leagueFormData.append('teamCountEstimate', data.teamCountEstimate.toString());
      if (data.seasonFormat) leagueFormData.append('seasonFormat', data.seasonFormat);
      if (data.expectedStartDate) leagueFormData.append('expectedStartDate', data.expectedStartDate);
      if (data.leagueType) leagueFormData.append('leagueType', data.leagueType);
      if (data.subscriptionTier) leagueFormData.append('subscriptionTier', data.subscriptionTier);

      // Template and branding fields
      if (data.templateId) leagueFormData.append('templateId', data.templateId);
      if (data.colorPresetName) leagueFormData.append('colorPresetName', data.colorPresetName);
      if (data.customColors?.primary) leagueFormData.append('customColors.primary', data.customColors.primary);
      if (data.customColors?.secondary) leagueFormData.append('customColors.secondary', data.customColors.secondary);
      if (data.customColors?.accent) leagueFormData.append('customColors.accent', data.customColors.accent);

      // Owner role
      if (data.ownerRole) leagueFormData.append('ownerRole', data.ownerRole);

      const { createLeague } = await import('@/lib/leagues/actions');
      const leagueResult = await createLeague(leagueFormData);

      if (leagueResult.error) {
        toast.error(leagueResult.error);
        setIsSubmitting(false);
        return;
      }

      // Track successful signup completion
      trackSignupCompleted({
        leagueId: leagueResult.league?.id,
        leagueName: data.leagueName,
        sport: data.sport,
        leagueType: data.leagueType,
        subscriptionTier: data.subscriptionTier,
        templateId: data.templateId,
        teamCount: data.teamCountEstimate,
        hasLogo: !!data.logoFile,
        hasCustomColors: data.colorPresetName === 'Custom',
        selectedPreset: data.colorPresetName,
      });

      // Mark signup as completed to prevent abandonment tracking
      setSignupCompleted(true);

      toast.success("League created successfully!");
      setStep(8); // Success step

      // Redirect to league onboarding after countdown
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // Redirect to league onboarding page
            const slug = leagueResult.league?.slug || data.leagueSlug || 'league';
            router.push(`/${slug}/onboarding`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create league. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Watch leagueName to auto-generate slug
  const leagueName = methods.watch("leagueName");
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50);
  };

  // Auto-generate slug when league name changes
  if (leagueName && !methods.formState.dirtyFields.leagueSlug) {
    const slug = generateSlug(leagueName);
    if (slug !== methods.getValues("leagueSlug")) {
      methods.setValue("leagueSlug", slug, { shouldValidate: true });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex flex-col">
      <MarketingHeader />

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              Create Your League
            </h1>
          </div>
          <p className="text-slate-600 text-lg">
            Step {step > totalSteps ? totalSteps : step} of {totalSteps}
          </p>
          <Progress value={progress} className="mt-4" />
        </div>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            {/* Step 1: League Info */}
            {step === 1 && (
              <Card className="shadow-lg border-slate-200">
                <CardHeader>
                  <CardTitle className="text-2xl">League Information</CardTitle>
                  <CardDescription className="text-base">
                    Tell us about your league. Choose a unique name and URL.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="leagueName" className="text-base font-semibold">
                      League Name
                    </Label>
                    <Input
                      id="leagueName"
                      placeholder="e.g. Sunday Night Beer League"
                      className="h-11 text-base"
                      {...methods.register("leagueName", {
                        required: "League name is required",
                        minLength: {
                          value: 3,
                          message: "League name must be at least 3 characters",
                        },
                      })}
                    />
                    {methods.formState.errors.leagueName && (
                      <p className="text-sm text-destructive">
                        {methods.formState.errors.leagueName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leagueSlug" className="text-base font-semibold">
                      League URL
                    </Label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <span className="text-muted-foreground text-sm whitespace-nowrap">
                        https://
                      </span>
                      <Input
                        id="leagueSlug"
                        placeholder="sunday-beer-league"
                        className="h-11 text-base flex-1"
                        {...methods.register("leagueSlug", {
                          required: "URL slug is required",
                          pattern: {
                            value: /^[a-z0-9-]+$/,
                            message: "Only lowercase letters, numbers, and hyphens allowed",
                          },
                          minLength: {
                            value: 3,
                            message: "URL must be at least 3 characters",
                          },
                        })}
                      />
                      <span className="text-muted-foreground text-sm whitespace-nowrap">
                        .beerleaguehockey.ca
                      </span>
                    </div>
                    {methods.formState.errors.leagueSlug && (
                      <p className="text-sm text-destructive">
                        {methods.formState.errors.leagueSlug.message}
                      </p>
                    )}
                    {methods.getValues("leagueSlug") && !methods.formState.errors.leagueSlug && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Your league will be available at:{" "}
                        <span className="font-mono font-semibold">
                          https://{methods.getValues("leagueSlug")}.beerleaguehockey.ca
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sport" className="text-base font-semibold">
                      Sport
                    </Label>
                    <Select
                      value={methods.watch("sport")}
                      onValueChange={(value) => methods.setValue("sport", value)}
                    >
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder="Select sport" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hockey">Hockey</SelectItem>
                        <SelectItem value="soccer">Soccer</SelectItem>
                        <SelectItem value="basketball">Basketball</SelectItem>
                        <SelectItem value="baseball">Baseball</SelectItem>
                        <SelectItem value="softball">Softball</SelectItem>
                        <SelectItem value="volleyball">Volleyball</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {methods.formState.errors.sport && (
                      <p className="text-sm text-destructive">
                        {methods.formState.errors.sport.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tagline" className="text-base font-semibold">
                      League Tagline <span className="text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="tagline"
                      placeholder="e.g. Where legends are made"
                      className="h-11 text-base"
                      {...methods.register("tagline")}
                    />
                    <p className="text-sm text-muted-foreground">
                      A catchy phrase that describes your league
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail" className="text-base font-semibold">
                      League Contact Email
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="info@yourleague.com"
                      className="h-11 text-base"
                      {...methods.register("contactEmail", {
                        required: "Contact email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address",
                        },
                      })}
                    />
                    {methods.formState.errors.contactEmail && (
                      <p className="text-sm text-destructive">
                        {methods.formState.errors.contactEmail.message}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Public email for league inquiries
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-base font-semibold">
                        City
                      </Label>
                      <Input
                        id="city"
                        placeholder="e.g. Toronto"
                        className="h-11 text-base"
                        {...methods.register("city", {
                          required: "City is required",
                          minLength: {
                            value: 2,
                            message: "City must be at least 2 characters",
                          },
                        })}
                      />
                      {methods.formState.errors.city && (
                        <p className="text-sm text-destructive">
                          {methods.formState.errors.city.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="region" className="text-base font-semibold">
                        Province/State <span className="text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Input
                        id="region"
                        placeholder="e.g. ON"
                        className="h-11 text-base"
                        {...methods.register("region")}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Template Selection */}
            {step === 2 && (
              <Card className="shadow-lg border-slate-200">
                <CardHeader>
                  <CardTitle className="text-2xl">Choose Your Design</CardTitle>
                  <CardDescription className="text-base">
                    Select a template that best matches your league&apos;s style. Each template comes with customizable colors and layouts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {templatesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <span className="ml-3 text-muted-foreground">Loading templates...</span>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-lg">No templates available</p>
                      <p className="text-sm mt-2">Please contact support if this issue persists.</p>
                    </div>
                  ) : (
                    <>
                      <TemplateSelector
                        templates={templates}
                        selectedTemplateId={methods.watch("templateId")}
                        onSelect={(templateId) => {
                          methods.setValue("templateId", templateId);
                          // Find the template to get its details for analytics
                          const selectedTemplate = templates.find(t => t.id === templateId);
                          if (selectedTemplate) {
                            trackTemplateSelected(
                              templateId,
                              selectedTemplate.slug,
                              selectedTemplate.name,
                              step
                            );
                          }
                        }}
                        showFeaturedBadge={true}
                        columns={3}
                      />
                      {!methods.watch("templateId") && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                          <p className="text-sm text-blue-900">
                            <strong>Tip:</strong> Choose a template that reflects your league&apos;s personality. You can customize colors in the next step.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Brand Customization */}
            {step === 3 && (
              <Card className="shadow-lg border-slate-200">
                <CardHeader>
                  <CardTitle className="text-2xl">Customize Your Brand</CardTitle>
                  <CardDescription className="text-base">
                    Choose colors and upload your logo to personalize your league site.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Template Not Selected Warning */}
                  {!methods.watch("templateId") && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-900">
                        <strong>Note:</strong> Please select a template in Step 2 first. You can go back to select a template.
                      </p>
                    </div>
                  )}

                  {/* Color Presets Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-slate-600" />
                      <Label className="text-base font-semibold">Color Scheme</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Choose from pre-designed color presets or customize your own
                    </p>

                    {/* Color Preset Options - These will be populated when template is selected */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* Placeholder presets - will be replaced with template's actual presets */}
                      {['Primary Blue', 'Classic Red', 'Forest Green', 'Royal Purple', 'Sunset Orange', 'Custom'].map((presetName, index) => {
                        const isSelected = methods.watch("colorPresetName") === presetName;
                        const isCustom = presetName === 'Custom';

                        return (
                          <button
                            key={presetName}
                            type="button"
                            className={`relative border-2 rounded-lg p-3 text-left transition-all ${
                              isSelected
                                ? "border-blue-600 bg-blue-50"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                            onClick={() => methods.setValue("colorPresetName", presetName)}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2">
                                <Check className="h-4 w-4 text-blue-600" />
                              </div>
                            )}
                            <div className="text-sm font-semibold mb-2">{presetName}</div>
                            {!isCustom && (
                              <div className="flex gap-1">
                                <div className="w-6 h-6 rounded-full bg-blue-600 border border-slate-200" />
                                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-200" />
                                <div className="w-6 h-6 rounded-full bg-amber-500 border border-slate-200" />
                              </div>
                            )}
                            {isCustom && (
                              <div className="flex gap-1">
                                <Palette className="h-5 w-5 text-slate-400" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Color Pickers */}
                  {methods.watch("colorPresetName") === 'Custom' && (
                    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm font-semibold">Custom Colors</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="customPrimary" className="text-sm font-medium">
                            Primary Color
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="customPrimary"
                              type="color"
                              className="w-16 h-11 p-1 cursor-pointer"
                              {...methods.register("customColors.primary")}
                            />
                            <Input
                              type="text"
                              placeholder="#0066CC"
                              className="h-11 flex-1 font-mono text-sm"
                              {...methods.register("customColors.primary")}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="customSecondary" className="text-sm font-medium">
                            Secondary Color
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="customSecondary"
                              type="color"
                              className="w-16 h-11 p-1 cursor-pointer"
                              {...methods.register("customColors.secondary")}
                            />
                            <Input
                              type="text"
                              placeholder="#1F2937"
                              className="h-11 flex-1 font-mono text-sm"
                              {...methods.register("customColors.secondary")}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="customAccent" className="text-sm font-medium">
                            Accent Color
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="customAccent"
                              type="color"
                              className="w-16 h-11 p-1 cursor-pointer"
                              {...methods.register("customColors.accent")}
                            />
                            <Input
                              type="text"
                              placeholder="#F59E0B"
                              className="h-11 flex-1 font-mono text-sm"
                              {...methods.register("customColors.accent")}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-slate-600" />
                      <Label className="text-base font-semibold">League Logo</Label>
                      <span className="text-sm text-muted-foreground">(Optional)</span>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                      <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-medium mb-1">Upload your league logo</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        PNG, JPG or SVG • Max 2MB • Recommended: 512x512px
                      </p>
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        className="hidden"
                        id="logoUpload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            methods.setValue("logoFile", file);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('logoUpload')?.click()}
                      >
                        Choose File
                      </Button>
                      {methods.watch("logoFile") && (
                        <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
                          <Check className="h-4 w-4" />
                          {(methods.watch("logoFile") as File)?.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Live Preview Note */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Live Preview:</strong> The TemplatePreview component will be integrated here to show your customizations in real-time. (Task 3.3 in progress)
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: League Details */}
            {step === 4 && (
              <Card className="shadow-lg border-slate-200">
                <CardHeader>
                  <CardTitle className="text-2xl">League Details</CardTitle>
                  <CardDescription className="text-base">
                    Tell us more about your league structure and format.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-base font-semibold">
                      League Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your league, its history, and what makes it special..."
                      className="min-h-[100px] text-base resize-none"
                      maxLength={500}
                      {...methods.register("description", {
                        required: "League description is required",
                        minLength: {
                          value: 20,
                          message: "Description must be at least 20 characters",
                        },
                        maxLength: {
                          value: 500,
                          message: "Description must not exceed 500 characters",
                        },
                      })}
                    />
                    <div className="flex justify-between items-center">
                      {methods.formState.errors.description ? (
                        <p className="text-sm text-destructive">
                          {methods.formState.errors.description.message}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          This will appear on your league's homepage
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {methods.watch("description")?.length || 0}/500
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="teamCountEstimate" className="text-base font-semibold">
                        Number of Teams
                      </Label>
                      <Select
                        value={methods.watch("teamCountEstimate")?.toString()}
                        onValueChange={(value) => methods.setValue("teamCountEstimate", parseInt(value))}
                      >
                        <SelectTrigger className="h-11 text-base">
                          <SelectValue placeholder="Select team count" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4 Teams</SelectItem>
                          <SelectItem value="6">6 Teams</SelectItem>
                          <SelectItem value="8">8 Teams</SelectItem>
                          <SelectItem value="10">10 Teams</SelectItem>
                          <SelectItem value="12">12 Teams</SelectItem>
                          <SelectItem value="16">16+ Teams</SelectItem>
                        </SelectContent>
                      </Select>
                      {methods.formState.errors.teamCountEstimate && (
                        <p className="text-sm text-destructive">
                          {methods.formState.errors.teamCountEstimate.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="leagueType" className="text-base font-semibold">
                        League Type
                      </Label>
                      <Select
                        value={methods.watch("leagueType")}
                        onValueChange={(value) => methods.setValue("leagueType", value)}
                      >
                        <SelectTrigger className="h-11 text-base">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recreational">Recreational</SelectItem>
                          <SelectItem value="competitive">Competitive</SelectItem>
                          <SelectItem value="co-ed">Co-ed</SelectItem>
                          <SelectItem value="youth">Youth</SelectItem>
                          <SelectItem value="adult">Adult</SelectItem>
                          <SelectItem value="mixed">Mixed Age/Skill</SelectItem>
                        </SelectContent>
                      </Select>
                      {methods.formState.errors.leagueType && (
                        <p className="text-sm text-destructive">
                          {methods.formState.errors.leagueType.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="seasonFormat" className="text-base font-semibold">
                        Season Format
                      </Label>
                      <Select
                        value={methods.watch("seasonFormat")}
                        onValueChange={(value) => methods.setValue("seasonFormat", value)}
                      >
                        <SelectTrigger className="h-11 text-base">
                          <SelectValue placeholder="Select season" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fall">Fall (Sep-Nov)</SelectItem>
                          <SelectItem value="winter">Winter (Dec-Feb)</SelectItem>
                          <SelectItem value="spring">Spring (Mar-May)</SelectItem>
                          <SelectItem value="summer">Summer (Jun-Aug)</SelectItem>
                          <SelectItem value="fall-winter">Fall-Winter</SelectItem>
                          <SelectItem value="spring-summer">Spring-Summer</SelectItem>
                          <SelectItem value="year-round">Year-Round</SelectItem>
                        </SelectContent>
                      </Select>
                      {methods.formState.errors.seasonFormat && (
                        <p className="text-sm text-destructive">
                          {methods.formState.errors.seasonFormat.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expectedStartDate" className="text-base font-semibold">
                        Expected Start Date <span className="text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Input
                        id="expectedStartDate"
                        type="date"
                        className="h-11 text-base"
                        min={new Date().toISOString().split('T')[0]}
                        {...methods.register("expectedStartDate")}
                      />
                      {methods.formState.errors.expectedStartDate && (
                        <p className="text-sm text-destructive">
                          {methods.formState.errors.expectedStartDate.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Tip:</strong> You can always update these details later from your league dashboard.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Features & Pricing */}
            {step === 5 && (
              <Card className="shadow-lg border-slate-200">
                <CardHeader>
                  <CardTitle className="text-2xl">Choose Your Plan</CardTitle>
                  <CardDescription className="text-base">
                    Select the features and pricing tier that works best for your league.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Starter Tier */}
                    <div
                      className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
                        methods.watch("subscriptionTier") === "starter"
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => methods.setValue("subscriptionTier", "starter")}
                    >
                      {methods.watch("subscriptionTier") === "starter" && (
                        <div className="absolute top-4 right-4">
                          <div className="bg-blue-600 rounded-full p-1">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-5 w-5 text-slate-600" />
                        <h3 className="text-xl font-bold">Starter</h3>
                      </div>
                      <div className="mb-4">
                        <span className="text-3xl font-bold">$29</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Perfect for small leagues getting started
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Up to 8 teams</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Schedule management</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Basic stats tracking</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Team communication</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Mobile app access</span>
                        </li>
                      </ul>
                    </div>

                    {/* Pro Tier - Recommended */}
                    <div
                      className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
                        methods.watch("subscriptionTier") === "pro"
                          ? "border-blue-600 bg-blue-50 shadow-lg"
                          : "border-blue-600 hover:shadow-lg"
                      }`}
                      onClick={() => methods.setValue("subscriptionTier", "pro")}
                    >
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          RECOMMENDED
                        </span>
                      </div>
                      {methods.watch("subscriptionTier") === "pro" && (
                        <div className="absolute top-4 right-4">
                          <div className="bg-blue-600 rounded-full p-1">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-3 mt-2">
                        <Crown className="h-5 w-5 text-blue-600" />
                        <h3 className="text-xl font-bold">Pro</h3>
                      </div>
                      <div className="mb-4">
                        <span className="text-3xl font-bold">$79</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Full-featured solution for serious leagues
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Unlimited teams</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Advanced stats & analytics</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Payment processing</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>AI-powered game recaps</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Custom branding</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Priority support</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Everything in Starter</span>
                        </li>
                      </ul>
                    </div>

                    {/* Enterprise Tier */}
                    <div
                      className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
                        methods.watch("subscriptionTier") === "enterprise"
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => methods.setValue("subscriptionTier", "enterprise")}
                    >
                      {methods.watch("subscriptionTier") === "enterprise" && (
                        <div className="absolute top-4 right-4">
                          <div className="bg-blue-600 rounded-full p-1">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                        <Building className="h-5 w-5 text-slate-600" />
                        <h3 className="text-xl font-bold">Enterprise</h3>
                      </div>
                      <div className="mb-4">
                        <span className="text-3xl font-bold">Custom</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        For large organizations with custom needs
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>White-label solution</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Custom domain</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Dedicated support</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>API access</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Custom integrations</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>SLA guarantee</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Everything in Pro</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>14-day free trial</strong> on all plans. No credit card required to start. Cancel anytime.
                    </p>
                  </div>

                  {methods.formState.errors.subscriptionTier && (
                    <p className="text-sm text-destructive">
                      {methods.formState.errors.subscriptionTier.message}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 6: Owner Account */}
            {step === 6 && (
              <Card className="shadow-lg border-slate-200">
                <CardHeader>
                  <CardTitle className="text-2xl">Create Your Account</CardTitle>
                  <CardDescription className="text-base">
                    You&apos;ll be the league owner and have full administrative access.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-base font-semibold">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="Wayne Gretzky"
                      className="h-11 text-base"
                      {...methods.register("fullName", {
                        required: "Full name is required",
                        minLength: {
                          value: 2,
                          message: "Name must be at least 2 characters",
                        },
                      })}
                    />
                    {methods.formState.errors.fullName && (
                      <p className="text-sm text-destructive">
                        {methods.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base font-semibold">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="wayne@example.com"
                      className="h-11 text-base"
                      {...methods.register("email", {
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address",
                        },
                      })}
                    />
                    {methods.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {methods.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-base font-semibold">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-11 text-base"
                      {...methods.register("password", {
                        required: "Password is required",
                        minLength: {
                          value: 8,
                          message: "Password must be at least 8 characters",
                        },
                      })}
                    />
                    {methods.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {methods.formState.errors.password.message}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Must be at least 8 characters long
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-base font-semibold">
                        Phone Number <span className="text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        className="h-11 text-base"
                        {...methods.register("phone", {
                          pattern: {
                            value: /^[\d\s\-\(\)\+]+$/,
                            message: "Invalid phone number format",
                          },
                        })}
                      />
                      {methods.formState.errors.phone && (
                        <p className="text-sm text-destructive">
                          {methods.formState.errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ownerRole" className="text-base font-semibold">
                        Your Role
                      </Label>
                      <Select
                        value={methods.watch("ownerRole")}
                        onValueChange={(value) => methods.setValue("ownerRole", value)}
                      >
                        <SelectTrigger className="h-11 text-base">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="commissioner">Commissioner</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="administrator">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      {methods.formState.errors.ownerRole && (
                        <p className="text-sm text-destructive">
                          {methods.formState.errors.ownerRole.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Note:</strong> After creating your league, we&apos;ll send a verification
                      email to confirm your account.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 7: Review & Launch */}
            {step === 7 && (
              <StepReviewAndLaunch
                onEditStep={(stepNumber) => setStep(stepNumber)}
              />
            )}

            {/* Step 8: Success */}
            {step === 8 && (
              <Card className="shadow-lg border-green-200 bg-green-50">
                <CardHeader>
                  <div className="mx-auto mb-4 bg-green-100 p-4 rounded-full w-fit">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                  <CardTitle className="text-3xl text-center">League Created!</CardTitle>
                  <CardDescription className="text-center text-lg text-green-900">
                    {methods.getValues("leagueName")} is ready for action
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <p className="text-slate-700 mb-4">
                      We&apos;ve sent a verification email to{" "}
                      <span className="font-semibold">{methods.getValues("email")}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Redirecting to login in {countdown} seconds...
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-6">
                    <p className="font-semibold text-lg mb-3 text-slate-900">Next Steps:</p>
                    <ul className="space-y-2 text-slate-700">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Verify your email address</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Customize your league branding and colors</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Create divisions and seasons</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Invite team captains and players</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Set up Stripe for payments (optional)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      size="lg"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => router.push("/login")}
                    >
                      Go to Login
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            {step <= totalSteps && (
              <div className="flex justify-between mt-8 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleBack}
                  disabled={step === 1 || isSubmitting}
                  className="min-w-[120px]"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>

                {step < totalSteps ? (
                  <Button type="button" size="lg" onClick={handleNext} className="min-w-[120px]">
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                      </>
                    ) : (
                      <>
                        Create League <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </form>
        </FormProvider>
      </main>
    </div>
  );
}
