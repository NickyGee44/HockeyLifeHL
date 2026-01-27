"use server";

import { createClient } from "@/lib/supabase/server";
import { stripHtml } from "@/lib/input-sanitization";
import { generateSlug, validateSlug } from "./slug-utils";

export type SignupResult = {
  error?: string;
  success?: boolean;
  leagueSlug?: string;
  subdomain?: string;
  leagueId?: string;
};

/**
 * Sign up a new league with owner account in a single transaction
 * Creates:
 * 1. User account via Supabase Auth
 * 2. League record
 * 3. Profile record (auto-created by trigger)
 * 4. League membership (owner role)
 * 5. Default league settings
 */
export async function signupLeagueWithOwner(data: {
  leagueName: string;
  email: string;
  password: string;
  fullName: string;
  sport?: string;
}): Promise<SignupResult> {
  try {
    const supabase = await createClient();

    // ============================================================================
    // 1. VALIDATE INPUTS
    // ============================================================================

    // Validate league name
    const leagueName = stripHtml(data.leagueName).trim();
    if (!leagueName || leagueName.length < 3) {
      return { error: 'League name must be at least 3 characters long' };
    }
    if (leagueName.length > 100) {
      return { error: 'League name must be less than 100 characters' };
    }

    // Validate email
    const email = data.email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { error: 'Please enter a valid email address' };
    }

    // Validate password - enforce strong password policy
    const password = data.password;
    if (!password || password.length < 12) {
      return { error: 'Password must be at least 12 characters long' };
    }

    // Check password complexity
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return { error: 'Password must contain uppercase, lowercase, and numbers' };
    }

    // Validate full name
    const fullName = stripHtml(data.fullName).trim();
    if (!fullName || fullName.length < 2) {
      return { error: 'Full name must be at least 2 characters long' };
    }

    // Validate sport
    const sport = stripHtml(data.sport || 'hockey').trim() || 'hockey';

    // ============================================================================
    // 2. GENERATE AND VALIDATE SLUG
    // ============================================================================

    const baseSlug = generateSlug(leagueName);
    const slugValidation = validateSlug(baseSlug);
    if (!slugValidation.valid) {
      return { error: slugValidation.error };
    }

    // ============================================================================
    // 3. CHECK SLUG UNIQUENESS
    // ============================================================================

    let finalSlug = baseSlug;
    let slugAttempt = 0;
    const maxAttempts = 10;

    while (slugAttempt < maxAttempts) {
      const { data: existingLeague } = await supabase
        .from('leagues')
        .select('id')
        .eq('slug', finalSlug)
        .single();

      if (!existingLeague) {
        // Slug is available
        break;
      }

      // Slug is taken, generate alternative
      slugAttempt++;
      if (slugAttempt === 1) {
        finalSlug = `${baseSlug}-${sport.toLowerCase()}`;
      } else if (slugAttempt === 2) {
        finalSlug = `${baseSlug}-league`;
      } else {
        finalSlug = `${baseSlug}-${slugAttempt}`;
      }

      // Validate alternative slug
      const altSlugValidation = validateSlug(finalSlug);
      if (!altSlugValidation.valid) {
        return {
          error: 'Unable to generate a valid league URL. Please try a different league name.'
        };
      }
    }

    if (slugAttempt >= maxAttempts) {
      return {
        error: 'This league name is too similar to existing leagues. Please choose a more unique name.'
      };
    }

    // Use slug as subdomain
    const subdomain = finalSlug;

    // Check subdomain availability
    const { data: existingSubdomain } = await (supabase as any)
      .from('leagues')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (existingSubdomain) {
      return {
        error: 'Unable to create a unique subdomain for this league. Please try a different name.'
      };
    }

    // ============================================================================
    // 4. CREATE USER ACCOUNT
    // ============================================================================

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          email: email,
        },
      },
    });

    if (signUpError) {
      console.error('Sign up error:', signUpError);

      // User-friendly error messages
      if (signUpError.message.includes('already registered')) {
        return { error: 'This email is already registered. Please use a different email or log in.' };
      }
      if (signUpError.message.includes('invalid email')) {
        return { error: 'Invalid email address. Please check and try again.' };
      }
      if (signUpError.message.includes('password')) {
        return { error: 'Password does not meet requirements. Must be at least 12 characters with uppercase, lowercase, and numbers.' };
      }

      return { error: signUpError.message || 'Failed to create account. Please try again.' };
    }

    if (!authData.user) {
      return { error: 'Failed to create user account. Please try again.' };
    }

    const userId = authData.user.id;

    // ============================================================================
    // 5. CREATE LEAGUE, PROFILE, AND MEMBERSHIP (ATOMIC TRANSACTION)
    // ============================================================================
    // Use database function for atomic all-or-nothing operation
    // This prevents partial state if any step fails

    const { data: signupResult, error: signupError } = await supabase
      .rpc('signup_league_with_owner', {
        p_league_name: leagueName,
        p_league_slug: finalSlug,
        p_subdomain: subdomain,
        p_sport: sport,
        p_user_id: userId,
        p_user_email: email,
        p_user_full_name: fullName,
        p_primary_color: '#FF0000',
        p_secondary_color: '#000000',
        p_accent_color: '#FFD700',
        p_description: '',
      });

    if (signupError || !signupResult || signupResult.length === 0) {
      console.error('Signup function error:', signupError);

      // Rollback: Delete the user account we just created
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (cleanupError) {
        console.error('Failed to cleanup user after signup failure:', cleanupError);
      }

      return {
        error: signupError?.message || 'Failed to create league. Please try again.'
      };
    }

    // Check if the function reported success
    const result = signupResult[0];
    if (!result.success) {
      console.error('Signup function returned error:', result.error_message);

      // Rollback: Delete the user account we just created
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (cleanupError) {
        console.error('Failed to cleanup user after signup failure:', cleanupError);
      }

      return {
        error: result.error_message || 'Failed to create league. Please try again.'
      };
    }

    const leagueId = result.league_id;
    if (!leagueId) {
      return { error: 'Failed to create league record. Please try again.' };
    }

    // ============================================================================
    // 6. RETURN SUCCESS WITH SUBDOMAIN FOR REDIRECT
    // ============================================================================

    return {
      success: true,
      leagueSlug: finalSlug,
      subdomain,
      leagueId,
    };
  } catch (error: any) {
    console.error('Unexpected error in signupLeagueWithOwner:', error);
    return {
      error: error.message || 'An unexpected error occurred. Please try again.'
    };
  }
}
