import { createClient } from './client';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  error: AuthError | null;
}

export interface SessionResult {
  session: Session | null;
  error: AuthError | null;
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    user: data?.user ?? null,
    error,
  };
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string,
  metadata?: { first_name?: string; last_name?: string }
): Promise<AuthResult> {
  const supabase = createClient();

  // Combine first/last name into full_name for the profiles table
  const fullName = metadata?.first_name && metadata?.last_name
    ? `${metadata.first_name} ${metadata.last_name}`.trim()
    : metadata?.first_name || metadata?.last_name || null;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        ...metadata,
        full_name: fullName,
      },
    },
  });

  return {
    user: data?.user ?? null,
    error,
  };
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get current session
 */
export async function getSession(): Promise<SessionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  return {
    session: data?.session ?? null,
    error,
  };
}

/**
 * Get current user
 */
export async function getUser(): Promise<AuthResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  return {
    user: data?.user ?? null,
    error,
  };
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const callbackUrl = new URL('/api/auth/callback', window.location.origin);
  callbackUrl.searchParams.set('next', '/reset-password');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl.toString(),
  });
  return { error };
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { error };
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  const supabase = createClient();
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
