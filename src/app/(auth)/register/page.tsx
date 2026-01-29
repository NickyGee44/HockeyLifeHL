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
  const router = useRouter();

  // Form state - preserves values on error
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    jerseyNumber: "",
    position: "",
    skillLevel: "",
    availability: "",
    phone: "",
    city: "",
    province: "",
    password: "",
    confirmPassword: "",
    inviteCode: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    // Create FormData from state
    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      submitData.set(key, value);
    });

    try {
      const result = await signUp(submitData);

      if (result.error) {
        toast.error(result.error);
        setIsLoading(false);
        // Form data is preserved in state - no need to clear
      } else if (result.success) {
        toast.success("Check your email to confirm your account!");
        // Only clear form on success
        setFormData({
          fullName: "",
          email: "",
          jerseyNumber: "",
          position: "",
          skillLevel: "",
          availability: "",
          phone: "",
          city: "",
          province: "",
          password: "",
          confirmPassword: "",
          inviteCode: "",
        });
        router.push("/discover");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
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
        <CardTitle className="text-2xl">Join Beer League Hockey</CardTitle>
        <CardDescription>
          Create your account to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="Wayne Gretzky"
              required
              disabled={isLoading}
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="player@beerleaguehockey.ca"
              required
              disabled={isLoading}
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
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
                value={formData.jerseyNumber}
                onChange={(e) => handleInputChange("jerseyNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select
                value={formData.position}
                onValueChange={(value) => handleInputChange("position", value)}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="skillLevel">Skill Level</Label>
              <Select
                value={formData.skillLevel}
                onValueChange={(value) => handleInputChange("skillLevel", value)}
                disabled={isLoading}
              >
                <SelectTrigger id="skillLevel">
                  <SelectValue placeholder="Select skill" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="availability">Availability</Label>
              <Select
                value={formData.availability}
                onValueChange={(value) => handleInputChange("availability", value)}
                disabled={isLoading}
              >
                <SelectTrigger id="availability">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="spare_only">Spare Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="(555) 123-4567"
              disabled={isLoading}
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                type="text"
                placeholder="Ottawa"
                required
                disabled={isLoading}
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Select
                value={formData.province}
                onValueChange={(value) => handleInputChange("province", value)}
                disabled={isLoading}
              >
                <SelectTrigger id="province">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ON">Ontario</SelectItem>
                  <SelectItem value="QC">Quebec</SelectItem>
                  <SelectItem value="BC">British Columbia</SelectItem>
                  <SelectItem value="AB">Alberta</SelectItem>
                  <SelectItem value="MB">Manitoba</SelectItem>
                  <SelectItem value="SK">Saskatchewan</SelectItem>
                  <SelectItem value="NS">Nova Scotia</SelectItem>
                  <SelectItem value="NB">New Brunswick</SelectItem>
                  <SelectItem value="NL">Newfoundland and Labrador</SelectItem>
                  <SelectItem value="PE">Prince Edward Island</SelectItem>
                  <SelectItem value="NT">Northwest Territories</SelectItem>
                  <SelectItem value="YT">Yukon</SelectItem>
                  <SelectItem value="NU">Nunavut</SelectItem>
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
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              disabled={isLoading}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inviteCode">Invite Code (Optional)</Label>
            <Input
              id="inviteCode"
              name="inviteCode"
              placeholder="TEAM123"
              disabled={isLoading}
              value={formData.inviteCode}
              onChange={(e) => handleInputChange("inviteCode", e.target.value.toUpperCase())}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Sign Up"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
