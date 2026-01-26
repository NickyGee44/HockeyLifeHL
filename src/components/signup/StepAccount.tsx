"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StepAccount() {
  const { register, formState: { errors } } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Owner Account</CardTitle>
        <CardDescription>
          You will be the league commissioner.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input 
            id="email" 
            type="email"
            placeholder="commissioner@example.com" 
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            type="password"
            placeholder="••••••••" 
            {...register("password", { 
              required: "Password is required",
              minLength: { value: 8, message: "Must be at least 8 characters" }
            })}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input 
            id="fullName" 
            placeholder="Gordie Howe" 
            {...register("fullName", { required: "Name is required" })}
          />
          {errors.fullName && (
            <p className="text-sm text-destructive">{errors.fullName.message as string}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
