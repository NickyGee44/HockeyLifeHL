"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { signUp } from "@/lib/auth/actions";
import { toast } from "sonner";

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState("");
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    
    // Add position to form data since Select doesn't work with native form
    formData.set("position", position);
    
    try {
      const result = await signUp(formData);
      
      if (result.error) {
        toast.error(result.error);
        setIsLoading(false);
      } else if (result.success) {
        toast.success("Check your email to confirm your account!");
        router.push("/login");
      }
    } catch {
      toast.error("An unexpected error occurred");
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
        <CardTitle className="text-2xl">Join the League</CardTitle>
        <CardDescription>
          Create your account to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="Wayne Gretzky"
              required
              disabled={isLoading}
            />
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jerseyNumber">Jersey #</Label>
              <Input
                id="jerseyNumber"
                name="jerseyNumber"
                type="number"
                min="0"
                max="99"
                placeholder="99"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select 
                value={position} 
                onValueChange={setPosition}
                disabled={isLoading}
              >
                <SelectTrigger id="position">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="C">Center (C)</SelectItem>
                  <SelectItem value="LW">Left Wing (LW)</SelectItem>
                  <SelectItem value="RW">Right Wing (RW)</SelectItem>
                  <SelectItem value="D">Defense (D)</SelectItem>
                  <SelectItem value="G">Goalie (G)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              name="password"
              type="password" 
              required 
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              At least 6 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input 
              id="confirmPassword" 
              name="confirmPassword"
              type="password" 
              required 
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inviteCode">Invite Code (Optional)</Label>
            <Input 
              id="inviteCode" 
              name="inviteCode"
              type="text"
              placeholder="Enter invite code if you have one"
              disabled={isLoading}
              className="uppercase"
            />
            <p className="text-xs text-muted-foreground">
              If you received an invite code from a captain, enter it here to be automatically approved
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-canada-red hover:bg-canada-red-dark"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="puck-spin inline-block mr-2">🏒</span>
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link href="/login" className="text-canada-red hover:underline">
            Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
