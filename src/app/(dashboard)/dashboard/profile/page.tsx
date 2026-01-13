"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "@/lib/auth/profile-actions";
import { PaymentHistory } from "@/components/payments/PaymentHistory";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, profile, loading, isOwner, isCaptain } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [position, setPosition] = useState(profile?.position || "");

  // Update position when profile loads
  if (profile?.position && position !== profile.position) {
    setPosition(profile.position);
  }

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "??";
  };

  const getRoleBadge = () => {
    if (isOwner) return { label: "League Owner", variant: "default" as const, icon: "👑" };
    if (isCaptain) return { label: "Team Captain", variant: "secondary" as const, icon: "🏒" };
    return { label: "Player", variant: "outline" as const, icon: "⛸️" };
  };

  async function handleSubmit(formData: FormData) {
    setIsUpdating(true);
    formData.set("position", position);
    
    const result = await updateProfile(formData);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated successfully!");
    }
    
    setIsUpdating(false);
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-2xl">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const role = getRoleBadge();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your player profile and preferences
        </p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>
            This is how other players see you in the league
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-canada-red text-white text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{profile?.full_name || "Unknown Player"}</h3>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={role.variant}>
                  {role.icon} {role.label}
                </Badge>
                {profile?.jersey_number !== null && (
                  <Badge variant="outline" className="font-mono">
                    #{profile?.jersey_number}
                  </Badge>
                )}
                {profile?.position && (
                  <Badge variant="outline">
                    {profile.position}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>
            Update your player information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={profile?.full_name || ""}
                placeholder="Wayne Gretzky"
                required
                disabled={isUpdating}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jerseyNumber">Jersey Number</Label>
                <Input
                  id="jerseyNumber"
                  name="jerseyNumber"
                  type="number"
                  min="0"
                  max="99"
                  defaultValue={profile?.jersey_number ?? ""}
                  placeholder="99"
                  disabled={isUpdating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Select 
                  value={position} 
                  onValueChange={setPosition}
                  disabled={isUpdating}
                >
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Select position" />
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

            <Separator />

            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="bg-canada-red hover:bg-canada-red-dark"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <span className="puck-spin inline-block mr-2">🏒</span>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Info (Read Only) */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your account details (contact admin to change)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Account Created</Label>
            <p className="font-medium">
              {profile?.created_at 
                ? new Date(profile.created_at).toLocaleDateString("en-CA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Unknown"}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Role</Label>
            <p className="font-medium capitalize">{profile?.role || "Player"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Contact the league owner to change your role
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {user && <PaymentHistory playerId={user.id} />}
    </div>
  );
}
