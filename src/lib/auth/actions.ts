"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthResult = {
  error?: string;
  success?: boolean;
};

export async function signUp(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const fullName = formData.get("fullName") as string;
  const jerseyNumber = formData.get("jerseyNumber") as string;
  const position = formData.get("position") as string;
  const inviteCode = (formData.get("inviteCode") as string)?.trim().toUpperCase() || null;

  // Validation
  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  // Validate invite code if provided (before signup)
  if (inviteCode) {
    const { validateInviteCode } = await import("../teams/invite-actions");
    const validation = await validateInviteCode(inviteCode);
    
    if (!validation.isValid) {
      return { error: validation.message || "Invalid invite code" };
    }
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null,
        position: position || null,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    console.error("Signup error:", error);
    return { error: error.message };
  }

  // If invite code provided and user was created, use the invite code
  // Note: Profile is created by trigger, so we need to wait a moment or check
  if (inviteCode && signUpData.user) {
    // Wait a bit for profile trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if profile exists
    let profileExists = false;
    let attempts = 0;
    while (!profileExists && attempts < 5) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", signUpData.user.id)
        .single();
      
      if (profile) {
        profileExists = true;
        // Use the invite code
        const { useInviteCode } = await import("../teams/invite-actions");
        const result = await useInviteCode(inviteCode);
        
        if (result.error) {
          console.error("Error using invite code:", result.error);
          // Don't fail signup if invite code fails, just log it
        }
      } else {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const rememberMe = formData.get("rememberMe") === "on";

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  // Sign in with password
  // Note: Supabase automatically persists sessions via cookies
  // The rememberMe checkbox is for UX - sessions persist by default
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Signin error:", error);
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function forgotPassword(email: string): Promise<AuthResult> {
  const supabase = await createClient();

  if (!email) {
    return { error: "Email is required" };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/reset-password`,
  });

  if (error) {
    console.error("Forgot password error:", error);
    return { error: error.message };
  }

  return { success: true };
}

export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password) {
    return { error: "Password is required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    console.error("Reset password error:", error);
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
