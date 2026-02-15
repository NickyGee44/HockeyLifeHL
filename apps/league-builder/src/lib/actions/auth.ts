'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import { redirect as nextRedirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { getLocale } from 'next-intl/server';

// Password validation function
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

const isDevelopment = process.env.NODE_ENV !== 'production';

export async function signUp(formData: FormData) {
  if (isDevelopment) {
    console.info('[auth] signUp started');
  }

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const organizationName = formData.get('organizationName') as string;

  // GDPR/CCPA Compliance: Validate required consents
  // Checkboxes send 'on' by default, or a custom value if specified
  // We check for both to handle different form configurations
  const acceptTermsValue = formData.get('acceptTerms');
  const acceptPrivacyValue = formData.get('acceptPrivacy');
  const marketingEmailsValue = formData.get('marketingEmails');
  const analyticsTrackingValue = formData.get('analyticsTracking');

  const acceptTerms = acceptTermsValue === 'on' || acceptTermsValue === 'true';
  const acceptPrivacy = acceptPrivacyValue === 'on' || acceptPrivacyValue === 'true';
  const marketingEmails = marketingEmailsValue === 'on' || marketingEmailsValue === 'true';
  const analyticsTracking = analyticsTrackingValue === 'on' || analyticsTrackingValue === 'true';

  if (isDevelopment) {
    console.info('[auth] Consent collected:', { acceptTerms, acceptPrivacy });
  }

  if (!acceptTerms || !acceptPrivacy) {
    return { error: 'You must accept the Terms of Service and Privacy Policy to create an account.' };
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return { error: passwordValidation.error };
  }

  // Use service role client for everything to ensure atomic operation
  const serviceSupabase = createServiceRoleClient();

  try {
    // 1. Create auth user with service role (bypasses email confirmation)
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) {
      // Log detailed error only in development
      if (isDevelopment) {
        console.error('Auth error details:', authError);
      }
      // Return generic error in production
      return { error: isDevelopment ? `Authentication error: ${authError.message}` : 'Failed to create account. Please try again.' };
    }

    if (!authData.user) {
      if (isDevelopment) {
        console.error('No user returned from createUser');
      }
      return { error: 'Failed to create account. Please try again.' };
    }

    // 2. Update or create profile with owner role
    // Note: A trigger might auto-create the profile, so we use upsert
    const { error: profileError } = await (serviceSupabase
      .from('profiles') as any)
      .upsert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role: 'owner',
      }, {
        onConflict: 'id',
      });

    if (profileError) {
      if (isDevelopment) {
        console.error('Profile error:', profileError);
      }
      // Clean up auth user if profile update fails
      await serviceSupabase.auth.admin.deleteUser(authData.user.id);
      return { error: 'Failed to create account. Please try again.' };
    }

    // 2.5. Store user consents for GDPR/CCPA compliance
    const consents = [
      { user_id: authData.user.id, consent_type: 'terms_v1', granted: true },
      { user_id: authData.user.id, consent_type: 'privacy_v1', granted: true },
    ];

    if (marketingEmails) {
      consents.push({ user_id: authData.user.id, consent_type: 'marketing_emails', granted: true });
    }

    if (analyticsTracking) {
      consents.push({ user_id: authData.user.id, consent_type: 'analytics_tracking', granted: true });
    }

    const { error: consentError } = await (serviceSupabase
      .from('user_consents') as any)
      .insert(consents);

    if (consentError) {
      if (isDevelopment) {
        console.error('Consent storage error:', consentError);
      }
      // Don't fail signup if consent storage fails, but log it
      // User can still use the platform, but we should track this for audit
    }

    // 3. Create organization with slug
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Free platform - no trial needed, all features included
    const { error: orgError } = await serviceSupabase
      .from('organizations')
      .insert({
        name: organizationName,
        slug,
        owner_user_id: authData.user.id,
        subscription_tier: 'free',
        subscription_status: 'active',
      })
      .select()
      .single();









    if (orgError) {
      if (isDevelopment) {
        console.error('❌ Organization creation error:', orgError);
      }
      // Clean up profile and auth user if org creation fails
      await serviceSupabase.from('profiles').delete().eq('id', authData.user.id);
      await serviceSupabase.auth.admin.deleteUser(authData.user.id);
      return { error: 'Failed to create organization. Please try again.' };
    }

    // 4. Sign in the user with regular client
    const supabase = await createClient();
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !sessionData.session) {
      if (isDevelopment) {
        console.error('Sign in error:', signInError);
      }
      // User and org are created, but couldn't sign in - they can use login page
      return { error: 'Account created but automatic sign-in failed. Please use the login page.' };
    }

    // Redirect from server action to ensure cookies are set
    const locale = await getLocale();
    redirect({ href: '/dashboard', locale });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (isDevelopment) {
      console.error('💥 Unexpected error during signup:', error);
    }
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = formData.get('redirectTo') as string | null;

  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();

  // Check if account is locked
  // Note: is_account_locked RPC is defined in migrations but not in generated types yet
  const { data: lockData } = await (supabase.rpc as any)('is_account_locked', {
    user_email: email,
  }) as { data: Array<{ is_locked: boolean; locked_until_time: string }> | null };

  if (lockData && lockData.length > 0 && lockData[0].is_locked) {
    return {
      error: 'Your account has been temporarily locked due to multiple failed login attempts.',
      locked: true,
      lockedUntil: lockData[0].locked_until_time,
    };
  }

  // Attempt sign in
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Record failed login attempt
    // Note: increment_failed_login_attempts RPC is defined in migrations but not in generated types yet
    const { data: attemptData } = await (serviceSupabase.rpc as any)('increment_failed_login_attempts', {
      user_email: email,
    }) as { data: Array<{ is_locked: boolean; locked_until_time: string; attempt_count: number }> | null };

    // Log the failed attempt
    // Note: login_attempts_log table is defined in migrations but not in generated types yet
    await (serviceSupabase.from as any)('login_attempts_log').insert({
      email,
      success: false,
      failure_reason: error.message,
    });

    // Check if account is now locked
    if (attemptData && attemptData.length > 0 && attemptData[0].is_locked) {
      return {
        error: 'Your account has been temporarily locked due to multiple failed login attempts.',
        locked: true,
        lockedUntil: attemptData[0].locked_until_time,
      };
    }

    // Return remaining attempts for warning
    const remainingAttempts = attemptData && attemptData.length > 0
      ? Math.max(0, 5 - attemptData[0].attempt_count)
      : undefined;

    return {
      error: 'Invalid email or password',
      remainingAttempts,
    };
  }

  // Successful login - reset failed attempts
  // Note: reset_failed_login_attempts RPC is defined in migrations but not in generated types yet
  await (serviceSupabase.rpc as any)('reset_failed_login_attempts', {
    user_email: email,
  });

  // Log successful login
  // Note: login_attempts_log table is defined in migrations but not in generated types yet
  await (serviceSupabase.from as any)('login_attempts_log').insert({
    email,
    success: true,
  });

  const locale = await getLocale();

  // Determine redirect based on user role
  let defaultRedirect = '/dashboard';

  // Check if user is scorekeeper-only (no owner/admin role)
  const { data: memberships } = await serviceSupabase
    .from('league_memberships')
    .select('role')
    .eq('user_id', (await supabase.auth.getUser()).data.user!.id);

  const roles = memberships?.map((m: { role: string }) => m.role) ?? [];
  const hasAdminAccess = roles.includes('owner') || roles.includes('admin');
  const isScorekeeper = roles.includes('scorekeeper');

  if (!hasAdminAccess && isScorekeeper) {
    defaultRedirect = '/scorekeeper';
  }

  const safeRedirect =
    redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
      ? redirectTo
      : defaultRedirect;
  const normalizedRedirect = safeRedirect.replace(/^\/(en|fr)(?=\/|$)/, '') || '/';

  // Player registration route is not locale-prefixed in this app.
  if (normalizedRedirect.startsWith('/register/')) {
    nextRedirect(normalizedRedirect);
  }

  redirect({ href: normalizedRedirect, locale });
}

export async function completeOAuthSetup(formData: FormData) {
  const organizationName = formData.get('organizationName') as string;

  const acceptTermsValue = formData.get('acceptTerms');
  const acceptPrivacyValue = formData.get('acceptPrivacy');
  const acceptTerms = acceptTermsValue === 'on' || acceptTermsValue === 'true';
  const acceptPrivacy = acceptPrivacyValue === 'on' || acceptPrivacyValue === 'true';

  if (!acceptTerms || !acceptPrivacy) {
    return { error: 'You must accept the Terms of Service and Privacy Policy.' };
  }

  if (!organizationName || organizationName.trim().length === 0) {
    return { error: 'Organization name is required.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const serviceSupabase = createServiceRoleClient();

  try {
    // Update profile role to 'owner'
    await (serviceSupabase.from('profiles') as any)
      .update({ role: 'owner' })
      .eq('id', user.id);

    // Store consents for GDPR/CCPA compliance
    await (serviceSupabase.from('user_consents') as any).insert([
      { user_id: user.id, consent_type: 'terms_v1', granted: true },
      { user_id: user.id, consent_type: 'privacy_v1', granted: true },
    ]);

    // Create organization
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { error: orgError } = await serviceSupabase
      .from('organizations')
      .insert({
        name: organizationName,
        slug,
        owner_user_id: user.id,
        subscription_tier: 'free',
        subscription_status: 'active',
      });

    if (orgError) {
      if (isDevelopment) {
        console.error('Organization creation error:', orgError);
      }
      return { error: 'Failed to create organization. Please try again.' };
    }

    const locale = await getLocale();
    redirect({ href: '/dashboard', locale });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (isDevelopment) {
      console.error('Unexpected error during OAuth setup:', error);
    }
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = await getLocale();
  redirect({ href: '/login', locale });
}

export async function getCurrentUser() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { user, profile };
}

export async function getUserOrganizations() {
  const supabase = await createClient();

  // Get current user from session - never accept userId as parameter (IDOR vulnerability)
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get organizations where user is either the owner OR a member
  // First, get organizations where user is owner
  const { data: ownedOrgs, error: ownerError } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_user_id', user.id);

  // Then, get organizations where user is a member (fetch separately to avoid FK join issues)
  const { data: memberOrgIds, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (ownerError && isDevelopment) {
    console.error('Error fetching owned organizations:', ownerError);
  }
  if (memberError && isDevelopment) {
    console.error('Error fetching member organizations:', memberError);
  }

  // Combine and deduplicate organizations
  const allOrgs = new Map<string, any>();

  // Add owned organizations
  if (ownedOrgs) {
    for (const org of ownedOrgs) {
      allOrgs.set(org.id, org);
    }
  }

  // Fetch member organizations separately to avoid FK join RLS issues
  if (memberOrgIds && memberOrgIds.length > 0) {
    const orgIds = memberOrgIds.map((m) => m.organization_id).filter((id): id is string => id != null);
    const uniqueOrgIds = [...new Set(orgIds)].filter((id) => !allOrgs.has(id));

    if (uniqueOrgIds.length > 0) {
      const { data: memberOrgs } = await supabase
        .from('organizations')
        .select('*')
        .in('id', uniqueOrgIds);

      if (memberOrgs) {
        for (const org of memberOrgs) {
          allOrgs.set(org.id, org);
        }
      }
    }
  }

  // Fallback: If no organizations found via direct ownership or membership,
  // find organizations through league ownership (handles cases where user owns leagues
  // but their organization association is missing or RLS-restricted)
  if (allOrgs.size === 0) {
    const { data: ownedLeagues } = await supabase
      .from('league_memberships')
      .select('league:leagues(organization_id)')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin']);

    if (ownedLeagues && ownedLeagues.length > 0) {
      const leagueOrgIds = ownedLeagues
        .map((m: any) => m.league?.organization_id)
        .filter((id: any): id is string => !!id);
      const uniqueLeagueOrgIds = [...new Set(leagueOrgIds)];

      if (uniqueLeagueOrgIds.length > 0) {
        // Use service role to bypass RLS — we've already verified the user owns
        // leagues in these orgs via league_memberships above
        const serviceClient = createServiceRoleClient();
        const { data: leagueOrgs } = await serviceClient
          .from('organizations')
          .select('*')
          .in('id', uniqueLeagueOrgIds);

        if (leagueOrgs) {
          for (const org of leagueOrgs) {
            allOrgs.set(org.id, org);
          }
        }
      }
    }
  }

  // DEV ONLY: If no organizations found, check if this is a test user and auto-associate
  if (isDevelopment && allOrgs.size === 0 && user.email) {
    const testEmails = ['admin@test.com', 'organizer@test.com', 'captain@test.com', 'player@test.com', 'scorekeeper@test.com'];
    if (testEmails.includes(user.email)) {
      // Try to find the test organization and associate this user
      const { data: testOrg } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', 'test-hockey-org')
        .single();

      if (testOrg) {
        // Add user as member of test org
        const role = user.email === 'admin@test.com' ? 'owner' :
                     user.email === 'organizer@test.com' ? 'admin' : 'member';

        await supabase
          .from('organization_members')
          .upsert({
            organization_id: testOrg.id,
            user_id: user.id,
            role,
            status: 'active',
          }, {
            onConflict: 'organization_id,user_id'
          });

        // If admin, also update owner_user_id
        if (user.email === 'admin@test.com') {
          await supabase
            .from('organizations')
            .update({ owner_user_id: user.id })
            .eq('id', testOrg.id);
        }

        allOrgs.set(testOrg.id, testOrg);
        console.info('[auth] Auto-associated user with test organization');
      }
    }
  }

  // Convert to array and sort by created_at
  const organizations = Array.from(allOrgs.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return organizations;
}
