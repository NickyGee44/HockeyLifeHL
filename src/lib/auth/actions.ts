"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthResult = {
  error?: string;
  success?: boolean;
};

export async function signUp(formData: FormData): Promise<AuthResult> {
  let supabase;
  try {
    supabase = await createClient();
  } catch (err: any) {
    console.error("Failed to create Supabase client:", err);
    return { error: "Configuration error. Please contact support." };
  }

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

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  // Validate invite code if provided (before signup)
  if (inviteCode) {
    try {
      const { validateInviteCode } = await import("../teams/invite-actions");
      const validation = await validateInviteCode(inviteCode);
      
      if (!validation.isValid) {
        return { error: validation.message || "Invalid invite code" };
      }
    } catch (err) {
      console.error("Error validating invite code:", err);
      // Continue without invite code validation
    }
  }

  // Determine redirect URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000");

  console.log("Signup attempt for:", email, "with redirect to:", siteUrl);

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null,
        position: position || null,
      },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    console.error("Signup error:", error);
    
    // Provide more user-friendly error messages
    if (error.message.includes("already registered")) {
      return { error: "This email is already registered. Try signing in instead." };
    }
    if (error.message.includes("invalid")) {
      return { error: "Invalid email or password format." };
    }
    if (error.message.includes("rate limit")) {
      return { error: "Too many signup attempts. Please try again later." };
    }
    
    return { error: error.message };
  }

  if (!signUpData.user) {
    console.error("Signup returned no user");
    return { error: "Failed to create account. Please try again." };
  }

  console.log("User created successfully:", signUpData.user.id);

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
  let supabase;
  try {
    supabase = await createClient();
  } catch (err: any) {
    console.error("Failed to create Supabase client:", err);
    return { error: "Configuration error. Please contact support." };
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  console.log("Sign in attempt for:", email);

  // Sign in with password
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Signin error:", error);
    
    // Provide user-friendly error messages
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Invalid email or password. Please try again." };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "Please confirm your email before signing in. Check your inbox." };
    }
    if (error.message.includes("rate limit")) {
      return { error: "Too many login attempts. Please try again later." };
    }
    
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Failed to sign in. Please try again." };
  }

  console.log("User signed in successfully:", data.user.id);

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
