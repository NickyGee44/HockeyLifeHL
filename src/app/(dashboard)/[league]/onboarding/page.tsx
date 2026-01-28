import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
  optional?: boolean;
};

export default async function OnboardingPage({ params }: { params: { league: string } }) {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get league data
  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('slug', params.league)
    .single();

  if (!league) {
    redirect('/dashboard');
  }

  // Build steps based on league configuration
  // Note: Cast to any to access enhanced league fields not yet in generated types
  const leagueData = league as any;
  const steps: OnboardingStep[] = [];

  // Step 1: Create Teams (always included)
  const teamCount = leagueData.team_count_estimate || 8;
  steps.push({
    id: "teams",
    title: `Create Your ${teamCount} Teams`,
    description: `You estimated ${teamCount} teams during signup. Start by creating your teams and assigning captains.`,
    href: "/admin/teams",
    completed: false,
  });

  // Step 2: Start a Season (always included)
  const seasonFormat = leagueData.season_format ? ` (${leagueData.season_format})` : '';
  steps.push({
    id: "season",
    title: "Start Your First Season",
    description: `Configure your ${leagueData.expected_start_date ? 'upcoming' : 'first'} season${seasonFormat}, including games and schedule.`,
    href: "/admin/seasons",
    completed: false,
  });

  // Step 3: Configure Payments (if Pro or Enterprise)
  const needsPayments = leagueData.subscription_tier === 'pro' || leagueData.subscription_tier === 'enterprise';
  if (needsPayments) {
    steps.push({
      id: "stripe",
      title: "Configure Payment Processing",
      description: "Connect Stripe to collect league fees and manage team payments.",
      href: "/settings/features",
      completed: false,
    });
  }

  // Step 4: Invite Members (always included)
  steps.push({
    id: "invites",
    title: "Invite Team Captains & Players",
    description: "Send invitations to team captains and players to join your league.",
    href: "/settings/members",
    completed: false,
  });

  // Step 5: Review Settings (optional)
  steps.push({
    id: "settings",
    title: "Review League Settings",
    description: "Double-check your league rules, scoring settings, and preferences.",
    href: "/settings/general",
    completed: false,
    optional: true,
  });

  const completedCount = steps.filter((s) => s.completed).length;
  const totalSteps = steps.filter((s) => !s.optional).length;
  const progress = (completedCount / totalSteps) * 100;

  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Welcome to {league.name}!</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          {leagueData.tagline || "Your league is set up and ready to go."}
        </p>
        <p className="text-muted-foreground mt-2">
          You&apos;re almost ready! Complete these final steps to launch your {leagueData.sport || 'hockey'} league.
        </p>
      </div>

      {/* Success Banner */}
      <Card className="mb-8 border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">
                Great job on completing signup!
              </h3>
              <p className="text-sm text-green-800">
                Your league branding, pricing tier ({leagueData.subscription_tier || 'starter'}), and basic info are all set.
                {leagueData.expected_start_date && ` Your season is scheduled to start ${new Date(leagueData.expected_start_date).toLocaleDateString()}.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Tracker */}
      <Card className="mb-8">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Setup Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedCount} of {totalSteps} completed
            </span>
          </div>
          <Progress value={progress} />
        </CardHeader>
      </Card>

      {/* Onboarding Steps */}
      <div className="space-y-4">
        {steps.map((step) => (
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
                  <div className="flex items-center gap-2">
                    <h3 className={step.completed ? "font-semibold text-muted-foreground line-through" : "font-semibold"}>
                      {step.title}
                    </h3>
                    {step.optional && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {step.description}
                  </p>
                  {!step.completed && (
                    <Button asChild size="sm">
                      <Link href={`/${params.league}${step.href}`}>
                        {step.id === 'teams' ? 'Create Teams' : step.id === 'season' ? 'Start Season' : step.id === 'stripe' ? 'Configure Stripe' : step.id === 'invites' ? 'Send Invites' : 'Go to Settings'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Help & Skip */}
      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Need help getting started? Check out our{" "}
          <Link href="/docs" className="text-primary hover:underline">
            documentation
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="text-primary hover:underline">
            contact support
          </Link>
          .
        </p>
        <Button variant="ghost" asChild>
          <Link href={`/${params.league}/dashboard`}>
            Skip for now, take me to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
