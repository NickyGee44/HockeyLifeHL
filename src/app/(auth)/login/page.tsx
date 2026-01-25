"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

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

      // Sign in with password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Signin error:", error);

        // Provide user-friendly error messages
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password. Please try again.");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Please confirm your email before signing in. Check your inbox.");
        } else if (error.message.includes("rate limit")) {
          toast.error("Too many login attempts. Please try again later.");
        } else {
          toast.error(error.message);
        }
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        toast.error("Failed to sign in. Please try again.");
        setIsLoading(false);
        return;
      }

      console.log("User signed in successfully:", data.user.id);

      // Success! Redirect client-side and refresh
      toast.success("Signed in successfully!");

      // Force a hard navigation to ensure auth state updates
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Image
          src="/logo.png"
          alt="HockeyLifeHL"
          width={80}
          height={80}
          className="mx-auto mb-4"
        />
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>
          Sign in to access your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="player@hockeylifehl.com"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="rememberMe"
              name="rememberMe"
              className="h-4 w-4 rounded border-gray-300 text-canada-red focus:ring-canada-red"
            />
            <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
              Remember me
            </Label>
          </div>
          <Button 
            type="submit" 
            className="w-full bg-canada-red hover:bg-canada-red-dark"
            disabled={isLoading}
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
