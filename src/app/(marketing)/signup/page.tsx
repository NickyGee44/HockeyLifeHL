"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { StepLeagueInfo } from "@/components/signup/StepLeagueInfo";
import { StepBranding } from "@/components/signup/StepBranding";
import { StepSettings } from "@/components/signup/StepSettings";
import { StepAccount } from "@/components/signup/StepAccount";
import { StepSuccess } from "@/components/signup/StepSuccess";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const methods = useForm({
    mode: "onChange",
    defaultValues: {
      leagueName: "",
      leagueSlug: "",
      leagueDescription: "",
      primaryColor: "#E31837",
      secondaryColor: "#0066CC",
      statMode: "captain",
      features: {
        drafts: true,
        payments: true
      },
      email: "",
      password: "",
      fullName: ""
    }
  });

  const totalSteps = 4;
  const progress = ((step - 1) / totalSteps) * 100;

  const handleNext = async () => {
    const isValid = await methods.trigger();
    if (isValid) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // TODO: Call Agent 2's createLeague server action
      console.log("Submitting league data:", data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success("League created successfully!");
      setStep(5); // Success step
    } catch (error) {
      console.error(error);
      toast.error("Failed to create league. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MarketingHeader />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Your League</h1>
          <p className="text-muted-foreground">Step {step > totalSteps ? totalSteps : step} of {totalSteps}</p>
          <Progress value={progress} className="mt-4" />
        </div>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <div className="mb-8">
              {step === 1 && <StepLeagueInfo />}
              {step === 2 && <StepBranding />}
              {step === 3 && <StepSettings />}
              {step === 4 && <StepAccount />}
              {step === 5 && <StepSuccess leagueName={methods.getValues("leagueName")} />}
            </div>

            {step <= totalSteps && (
              <div className="flex justify-between mt-8">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleBack} 
                  disabled={step === 1 || isSubmitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                
                {step < totalSteps ? (
                  <Button type="button" onClick={handleNext}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting} className="bg-canada-red hover:bg-canada-red-dark">
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
