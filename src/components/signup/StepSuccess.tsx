"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function StepSuccess({ leagueName }: { leagueName: string }) {
  return (
    <Card className="text-center border-green-500/20 bg-green-500/5">
      <CardHeader>
        <div className="mx-auto mb-4 bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
        </div>
        <CardTitle className="text-2xl">League Created!</CardTitle>
        <CardDescription>
          {leagueName} is ready for action.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          We&apos;ve sent a verification email to your inbox. Please click the link to verify your account.
        </p>
        <div className="bg-background border p-4 rounded-md text-left text-sm">
          <p className="font-semibold mb-2">Next Steps:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Verify your email address</li>
            <li>Configure your divisions and seasons</li>
            <li>Invite team captains</li>
            <li>Set up Stripe for payments</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <Button size="lg" className="w-full bg-green-600 hover:bg-green-700" asChild>
          <Link href="/login">
            Go to Dashboard
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
