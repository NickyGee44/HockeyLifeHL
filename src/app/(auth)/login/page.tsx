"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Whitelist of allowed redirect paths (must match middleware whitelist)
const ALLOWED_REDIRECT_PATHS = [
  '/dashboard',
  '/admin',
  '/captain',
];

/**
 * Validates that a redirect path is safe
 * Prevents open redirect attacks
 */
function getSafeRedirectPath(path: string | null): string {
  if (!path || !path.startsWith('/')) {
    return '/dashboard';
  }

  const cleanPath = path.split('?')[0].split('#')[0];

  const isAllowed = ALLOWED_REDIRECT_PATHS.some(
    (allowedPath) => cleanPath === allowedPath || cleanPath.startsWith(allowedPath + '/')
  );

  return isAllowed ? path : '/dashboard';
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Log component mount for debugging
  console.log("[LoginPage] Component mounted");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    console.log("[Login] Form submitted");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      toast.error("Email and password are required");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      console.log("[Login] Attempting sign in...");

      // Sign in with password - this sets cookies on client side
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[Login] Signin error:", error);

        // Generic error messages to prevent account enumeration
        if (error.message.includes("Invalid login credentials") ||
            error.message.includes("Email not confirmed")) {
          toast.error("Unable to sign in. Please check your credentials or verify your email.");
        } else if (error.message.includes("rate limit")) {
          toast.error("Too many login attempts. Please try again later.");
        } else {
          toast.error("Unable to sign in. Please try again or contact support.");
        }
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        console.error("[Login] No user data returned");
        toast.error("Failed to sign in. Please try again.");
        setIsLoading(false);
        return;
      }

      console.log("[Login] User signed in successfully:", data.user.id);
      toast.success("Signed in successfully!");

      // Small delay to ensure cookies are set
      console.log("[Login] Waiting for cookies to be set...");
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get safe redirect path from URL params (set by middleware)
      const redirectPath = getSafeRedirectPath(searchParams.get('redirect'));

      console.log("[Login] Redirecting to:", redirectPath);

      // Use window.location.replace for post-auth redirect
      // This prevents back button issues and ensures clean navigation
      window.location.replace(redirectPath);

      // Don't call setIsLoading(false) - we're navigating away
    } catch (err: any) {
      console.error("[Login] Exception:", err);
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Image
          src="/BLH-Logo.png"
          alt="Beer League Hockey"
          width={80}
          height={80}
          className="mx-auto mb-4"
        />
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>
          Sign in to your league dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            console.log("[LoginPage] Form onSubmit fired");
            handleSubmit(e);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="player@beerleaguehockey.ca"
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-canada-red hover:bg-canada-red-dark"
            disabled={isLoading}
            onClick={() => console.log("[LoginPage] Button clicked")}
          >
            {isLoading ? (
              <>
                <span className="puck-spin inline-block mr-2">🏒</span>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Don&apos;t have an account? </span>
          <Link href="/register" className="text-canada-red hover:underline">
            Join the League
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
