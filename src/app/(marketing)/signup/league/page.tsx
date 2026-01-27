"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormData = {
  leagueName: string;
  leagueSlug: string;
  sport: string;
  fullName: string;
  email: string;
  password: string;
};

export default function LeagueSignupPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const router = useRouter();

  const methods = useForm<FormData>({
    mode: "onChange",
    defaultValues: {
      leagueName: "",
      leagueSlug: "",
      sport: "hockey",
      fullName: "",
      email: "",
      password: "",
    },
  });

  const totalSteps = 2;
  const progress = ((step - 1) / totalSteps) * 100;

  const handleNext = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];

    if (step === 1) {
      fieldsToValidate = ["leagueName", "leagueSlug", "sport"];
    }

    const isValid = await methods.trigger(fieldsToValidate);
    if (isValid) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // TODO: Call createLeague server action
      console.log("Creating league:", data);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success("League created successfully!");
      setStep(3); // Success step

      // Start countdown
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            router.push("/login");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create league. Please try again.");
    } finally {
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
                </CardContent>
              </Card>
            )}

            {/* Step 2: Owner Account */}
            {step === 2 && (
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

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Note:</strong> After creating your league, we&apos;ll send a verification
                      email to confirm your account.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
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
