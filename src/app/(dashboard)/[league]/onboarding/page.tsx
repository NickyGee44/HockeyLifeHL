"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  {
    id: "branding",
    title: "Customize Branding",
    description: "Upload your league logo and set your primary colors.",
    href: "/settings/branding",
    completed: true,
  },
  {
    id: "teams",
    title: "Create Teams",
    description: "Add teams to your league and assign captains.",
    href: "/admin/teams",
    completed: true,
  },
  {
    id: "season",
    title: "Start a Season",
    description: "Configure your first season, including games and schedule.",
    href: "/admin/seasons",
    completed: false,
  },
  {
    id: "stripe",
    title: "Connect Stripe",
    description: "Enable online payments to collect league fees.",
    href: "/settings/features",
    completed: false,
  },
  {
    id: "invites",
    title: "Invite Members",
    description: "Add admins, scorekeepers, and players to your league.",
    href: "/settings/members",
    completed: false,
  },
];

export default function OnboardingPage({ params }: { params: { league: string } }) {
  const completedCount = STEPS.filter((s) => s.completed).length;
  const progress = (completedCount / STEPS.length) * 100;

  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to your new league! 🏒</h1>
        <p className="text-muted-foreground">
          Follow these steps to get your league ready for its first game.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Setup Progress</span>
            <span className="text-sm text-muted-foreground">{completedCount} of {STEPS.length} completed</span>
          </div>
          <Progress value={progress} />
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {STEPS.map((step) => (
          <Card key={step.id} className={step.completed ? "bg-muted/30" : ""}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {step.completed ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={step.completed ? "font-semibold text-muted-foreground line-through" : "font-semibold"}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {step.description}
                  </p>
                  {!step.completed && (
                    <Button asChild size="sm">
                      <Link href={`/${params.league}${step.href}`}>
                        Go to {step.title} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Need help? Check out our <Link href="/docs" className="text-primary hover:underline">documentation</Link> or contact support.
        </p>
        <Button variant="ghost" asChild>
          <Link href="/dashboard">Skip for now, take me to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
