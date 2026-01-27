"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { withConsistentTiming } from "./timing-protection";
import { sanitizeEmail } from "@/lib/input-sanitization";
import { RateLimiters } from "@/lib/rate-limit";

export type AuthResult = {
  error?: string;
  success?: boolean;
};

// Email validation helper - more robust than simple regex
function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: "Email is required" };
  }

  // Sanitize first
  const sanitized = sanitizeEmail(email);

  // Check basic format
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    return { valid: false, error: "Please enter a valid email address" };
  }

  // Check for consecutive dots
  if (sanitized.includes('..')) {
    return { valid: false, error: "Invalid email format" };
  }

  // Check length
  if (sanitized.length > 254) {
    return { valid: false, error: "Email address is too long" };
  }

  // Check local part (before @) length
  const [localPart] = sanitized.split('@');
  if (localPart.length > 64) {
    return { valid: false, error: "Email address is invalid" };
  }

  return { valid: true };
}

// Password validation helper
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character (!@#$%^&*...)" };
  }

  return { valid: true };
}

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

  // Validate and sanitize email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return { error: emailValidation.error };
  }

  // Use sanitized email
  const sanitizedEmail = sanitizeEmail(email);

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return { error: passwordValidation.error };
  }

  // RATE LIMITING: 5 signups per minute per IP
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const ip = forwarded?.split(',')[0].trim() || realIp || 'unknown';
  const rateLimitKey = `signup:${ip}`;

  const rateLimit = await RateLimiters.strict.check(rateLimitKey);
  if (!rateLimit.success) {
    return {
      error: "Too many signup attempts. Please try again later."
    };
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

  console.log("Signup attempt for:", sanitizedEmail, "with redirect to:", siteUrl);

  const { data: signUpData, error } = await supabase.auth.signUp({
    email: sanitizedEmail,
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

    // Use generic error messages to prevent account enumeration
    // Don't reveal whether an email is already registered
    if (error.message.includes("already registered")) {
      return { error: "Unable to create account. Please try signing in or contact support." };
    }
    if (error.message.includes("invalid")) {
      return { error: "Invalid email or password format." };
    }
    if (error.message.includes("rate limit")) {
      return { error: "Too many signup attempts. Please try again later." };
    }

    // Generic fallback error
    return { error: "Unable to create account. Please try again or contact support." };
  }

  if (!signUpData.user) {
    console.error("Signup returned no user");
    return { error: "Failed to create account. Please try again." };
  }

  console.log("User created successfully:", signUpData.user.id);

  // If invite code provided and user was created, use the invite code
  // Note: Profile is created by trigger, so we need to wait for it
  if (inviteCode && signUpData.user) {
    console.log("Waiting for profile creation trigger to complete...");

    // Initial wait for trigger to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Poll for profile creation with increased retry count
    let profileExists = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 20; // 20 attempts * 500ms = 10 seconds total wait time

    while (!profileExists && attempts < MAX_ATTEMPTS) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", signUpData.user.id)
        .single();

      if (profile) {
        profileExists = true;
        console.log(`Profile found after ${attempts + 1} attempts`);

        // Use the invite code
        const { useInviteCode } = await import("../teams/invite-actions");
        const result = await useInviteCode(inviteCode);

        if (result.error) {
          console.error("Error using invite code:", result.error);
          // Don't fail signup if invite code fails, log for manual review
          console.log(`ACTION REQUIRED: Manually apply invite code ${inviteCode} to user ${signUpData.user.id}`);
        } else {
          console.log("Successfully applied invite code");
        }
      } else {
        attempts++;
        if (attempts < MAX_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          // Profile never created - critical error
          console.error(`Profile creation failed after ${MAX_ATTEMPTS} attempts for user ${signUpData.user.id}`);
          console.log(`ACTION REQUIRED: Check database trigger and manually create profile for user ${signUpData.user.id}`);
          // Continue anyway - user is created, profile issue needs manual resolution
        }
      }
    }
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  // Use consistent timing to prevent timing attacks
  // All login attempts take the same time regardless of whether email exists
  return withConsistentTiming(async () => {
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

    // RATE LIMITING: 10 login attempts per minute per IP
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ip = forwarded?.split(',')[0].trim() || realIp || 'unknown';
    const rateLimitKey = `signin:${ip}`;

    const rateLimit = await RateLimiters.standard.check(rateLimitKey);
    if (!rateLimit.success) {
      return {
        error: "Too many login attempts. Please try again later."
      };
    }

    console.log("Sign in attempt for:", email);

    // Sign in with password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Signin error:", error);

      // Use generic error message to prevent account enumeration
      // Don't reveal whether email exists, password is wrong, or email isn't confirmed
      if (error.message.includes("Invalid login credentials") ||
          error.message.includes("Email not confirmed")) {
        return { error: "Unable to sign in. Please check your credentials or verify your email." };
      }
      if (error.message.includes("rate limit")) {
        return { error: "Too many login attempts. Please try again later." };
      }

      // Generic fallback error
      return { error: "Unable to sign in. Please try again or contact support." };
    }

    if (!data.user) {
      return { error: "Failed to sign in. Please try again." };
    }

    console.log("User signed in successfully:", data.user.id);

    revalidatePath("/", "layout");
    redirect("/dashboard");
  }, 800, 1200); // Takes 800-1200ms regardless of outcome
}

export async function signOut(): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    // Use 'global' scope to sign out from all sessions (all tabs/devices)
    const { error } = await supabase.auth.signOut({ scope: 'global' });

    if (error) {
      console.error("Sign out error:", error);
      return { error: error.message };
    }

    // Revalidate all paths to clear cached data
    revalidatePath("/", "layout");
    return {};
  } catch (error: any) {
    console.error("Sign out error:", error);
    return { error: error.message || "Failed to sign out" };
  }
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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching current user profile:", error);
    return null;
  }

  return profile;
}

export async function forgotPassword(email: string): Promise<AuthResult> {
  // Use consistent timing to prevent email enumeration
  return withConsistentTiming(async () => {
    const supabase = await createClient();

    if (!email) {
      return { error: "Email is required" };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/reset-password`,
    });

    if (error) {
      console.error("Forgot password error:", error);
      // Always return success to prevent email enumeration
      // User gets the same message whether email exists or not
    }

    // Always return success - don't reveal if email exists
    return { success: true };
  }, 800, 1200); // Takes 800-1200ms regardless of outcome
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

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return { error: passwordValidation.error };
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
