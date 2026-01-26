"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, ShieldCheck, Zap, Rocket, Building2 } from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  {
    name: "Free",
    icon: <Zap className="h-5 w-5 text-muted-foreground" />,
    price: "$0",
    description: "Perfect for pickup groups and small teams.",
    features: ["1 Division", "Up to 8 Teams", "Basic Stats", "Manual Payments"],
    current: false,
  },
  {
    name: "Pro",
    icon: <Rocket className="h-5 w-5 text-canada-red" />,
    price: "$29",
    period: "/mo",
    description: "For serious leagues that want full automation.",
    features: ["Unlimited Teams", "Advanced Stats", "Stripe Integration", "AI Game Recaps", "Custom Branding"],
    current: true,
    popular: true,
  },
  {
    name: "Enterprise",
    icon: <Building2 className="h-5 w-5 text-gold" />,
    price: "Custom",
    description: "For multi-league organizations and associations.",
    features: ["Multiple Leagues", "Custom Domain", "White-label Solution", "SLA Support", "Dedicated Manager"],
    current: false,
  },
];

export default function SubscriptionPage({ params }: { params: Promise<{ league: string }> }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = (plan: string) => {
    setLoading(true);
    toast.info(`Redirecting to checkout for ${plan} plan...`);
    // TODO: Call Stripe checkout session API
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Subscription & Billing</h2>
        <p className="text-muted-foreground">Manage your league's plan and payment methods.</p>
      </div>

      <Separator />

      {/* Current Plan Overview */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Current Plan: Pro</CardTitle>
                <CardDescription>Your league is on the most popular automated plan.</CardDescription>
              </div>
            </div>
            <Badge variant="default" className="bg-canada-red">ACTIVE</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount</p>
              <p className="text-lg font-semibold">$29.00 / month</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Next Billing Date</p>
              <p className="text-lg font-semibold">February 25, 2026</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment Method</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Visa ending in 4242</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 border-t border-border/50 py-3">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">Manage Billing & Invoices →</Button>
        </CardFooter>
      </Card>

      {/* Available Plans */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Available Plans</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <Card key={plan.name} className={plan.popular ? "border-primary shadow-md relative overflow-hidden" : ""}>
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">
                  Popular
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  {plan.icon}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <CardDescription className="min-h-[40px] mt-2">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.current ? (
                  <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                ) : (
                  <Button 
                    className={`w-full ${plan.name === 'Pro' ? 'bg-canada-red hover:bg-canada-red-dark' : ''}`}
                    variant={plan.name === 'Enterprise' ? 'outline' : 'default'}
                    onClick={() => handleUpgrade(plan.name)}
                    disabled={loading}
                  >
                    {plan.name === 'Enterprise' ? 'Contact Sales' : 'Upgrade Plan'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Billing FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="font-medium">Can I cancel my subscription at any time?</p>
            <p className="text-sm text-muted-foreground">Yes, you can cancel your subscription at any time from the billing portal. Your plan will remain active until the end of the current billing period.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium">What happens if I downgrade my plan?</p>
            <p className="text-sm text-muted-foreground">When you downgrade, the changes take effect at the end of your billing cycle. Some features or teams may become restricted if they exceed the new plan's limits.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
