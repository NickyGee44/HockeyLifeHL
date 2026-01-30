'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const organizationName = formData.get('organizationName') as string;

  const supabase = await createClient();

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: 'Failed to create user' };
  }

  // Use service role client for profile and org creation to bypass RLS
  const serviceSupabase = createServiceRoleClient();

  // 2. Create profile with owner role
  const { error: profileError } = await serviceSupabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: 'owner',
    });

  if (profileError) {
    return { error: profileError.message };
  }

  // 3. Create organization with slug
  const slug = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 day trial

  const { data: orgData, error: orgError } = await serviceSupabase
    .from('organizations')
    .insert({
      name: organizationName,
      slug,
      owner_user_id: authData.user.id,
      subscription_tier: 'starter',
      subscription_status: 'trialing',
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select()
    .single();

  if (orgError) {
    return { error: orgError.message };
  }

  return { success: true, organizationId: orgData.id };
}

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
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

export async function getUserOrganizations(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .or(`owner_user_id.eq.${userId},id.in.(select organization_id from league_ownerships where user_id=${userId})`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching organizations:', error);
    return [];
  }

  return data || [];
}
