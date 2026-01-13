"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth/actions";
import { toast } from "sonner";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    
    const result = await signIn(formData);
    
    // Only reaches here if there's an error (success redirects)
    if (result?.error) {
      toast.error(result.error);
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
        <form action={handleSubmit} className="space-y-4">
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
