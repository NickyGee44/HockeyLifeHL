"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function AcceptInvitationPage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "success">("loading");
  const [leagueInfo, setLeagueInfo] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // TODO: Verify token with Agent 2's verifyInvitation()
    const verifyToken = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Mock validation
      if (params.token === "invalid") {
        setStatus("invalid");
      } else {
        setLeagueInfo({ name: "HockeyLifeHL", role: "Captain" });
        setStatus("valid");
      }
    };
    verifyToken();
  }, [params.token]);

  const handleAccept = async () => {
    setStatus("loading");
    // TODO: Call Agent 2's acceptInvitation()
    await new Promise(resolve => setTimeout(resolve, 1000));
    setStatus("success");
    toast.success("Invitation accepted!");
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  const handleDecline = () => {
    toast.info("Invitation declined");
    router.push("/");
  };

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid, expired, or has already been used.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push("/")}>Return Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <Card className="max-w-md w-full text-center bg-green-50 dark:bg-green-900/10">
          <CardHeader>
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Welcome Aboard!</CardTitle>
            <CardDescription>
              You have successfully joined {leagueInfo.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Redirecting you to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            🏒
          </div>
          <CardTitle>Join the League</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join <strong>{leagueInfo.name}</strong> as a <strong>{leagueInfo.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center">
            By accepting this invitation, you will be able to access the league dashboard, view your stats, and participate in games.
          </p>
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button variant="outline" className="flex-1" onClick={handleDecline}>Decline</Button>
          <Button className="flex-1" onClick={handleAccept}>Accept Invitation</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
