'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { LeagueShellSetup, OrganizationOnboarding } from '@/lib/onboarding/types';

const leagueShellSchema = z.object({
  leagueName: z.string().min(3, 'League name must be at least 3 characters').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  city: z.string().min(2, 'City is required').max(100),
  stateProvince: z.string().min(2, 'Province or state is required').max(100),
  country: z.string().default('CA'),
  timezone: z.string().default('America/Toronto'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  logoUrl: z.string().url().optional().or(z.literal('')),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(20).optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  enableOnlinePayments: z.boolean().default(false),
  enablePublicWebsite: z.boolean().default(true),
  wantCustomDomain: z.boolean().default(false),
  customDomainName: z.string().max(253).optional().or(z.literal('')),
});

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function generateLeagueSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function getPrimaryOrganization(userId: string): Promise<OrganizationOnboarding | null> {
  const serviceSupabase = createServiceRoleClient();
  const { data: organization } = await serviceSupabase
    .from('organizations')
    .select('id, name, slug')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!organization) {
    return null;
  }

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    organizationSlug: organization.slug,
  };
}

export async function getLeagueShellOnboardingContext(): Promise<
  ActionResult<{ organization: OrganizationOnboarding; defaultContactEmail: string }>
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const organization = await getPrimaryOrganization(user.id);
  if (!organization) {
    return { success: false, error: 'Organization setup is required first.' };
  }

  return {
    success: true,
    data: {
      organization,
      defaultContactEmail: user.email ?? '',
    },
  };
}

export async function createLeagueShell(
  payload: LeagueShellSetup
): Promise<ActionResult<{ leagueId: string; slug: string }>> {
  const validation = leagueShellSchema.safeParse(payload);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Invalid league setup payload.',
    };
  }

  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const organization = await getPrimaryOrganization(user.id);
  if (!organization) {
    return { success: false, error: 'Create your organization before creating a league.' };
  }

  const data = validation.data;
  const baseSlug = generateLeagueSlug(data.leagueName);
  let uniqueSlug = baseSlug;
  let attempt = 0;

  while (attempt < 12) {
    const { data: existing } = await serviceSupabase
      .from('leagues')
      .select('id')
      .eq('slug', uniqueSlug)
      .maybeSingle();

    if (!existing) {
      break;
    }

    attempt += 1;
    uniqueSlug = `${baseSlug}-${attempt}`;
  }

  if (attempt >= 12) {
    return {
      success: false,
      error: 'Could not generate a unique league URL. Try a different league name.',
    };
  }

  const settings = {
    onboarding: {
      phase: 'league_shell_complete',
      flow: 'guided_rebuild_v1',
      enableOnlinePayments: data.enableOnlinePayments,
      enablePublicWebsite: data.enablePublicWebsite,
      wantCustomDomain: data.wantCustomDomain,
      customDomainName: data.customDomainName || null,
      createdAt: new Date().toISOString(),
    },
    payment: {
      onboardingRequested: data.enableOnlinePayments,
      skipPaymentSetup: !data.enableOnlinePayments,
      stripeAccountId: null,
      stripeAccountStatus: 'not_connected',
    },
    website: {
      onboardingRequested: data.enablePublicWebsite,
      themePreset: 'dark',
      visiblePages: {
        schedule: true,
        standings: true,
        teams: true,
        stats: true,
        news: false,
        history: false,
        gallery: false,
        about: true,
      },
    },
    domain: {
      wantCustomDomain: data.wantCustomDomain,
      customDomainName: data.customDomainName || null,
    },
  };

  const { data: league, error: insertError } = await serviceSupabase
    .from('leagues')
    .insert({
      organization_id: organization.organizationId,
      created_by: user.id,
      name: data.leagueName,
      slug: uniqueSlug,
      description: data.description || null,
      city: data.city,
      state_province: data.stateProvince,
      country: data.country,
      timezone: data.timezone,
      primary_color: data.primaryColor,
      secondary_color: data.secondaryColor,
      logo_url: data.logoUrl || null,
      contact_email: data.contactEmail || user.email || null,
      contact_phone: data.contactPhone || null,
      website_url: data.websiteUrl || null,
      status: 'active',
      is_public: data.enablePublicWebsite,
      settings,
    })
    .select('id')
    .single();

  if (insertError || !league) {
    return {
      success: false,
      error: insertError?.message || 'Failed to create the league shell.',
    };
  }

  const { error: membershipError } = await serviceSupabase
    .from('league_memberships')
    .insert({
      league_id: league.id,
      user_id: user.id,
      role: 'owner',
      status: 'active',
    });

  if (membershipError) {
    await serviceSupabase.from('leagues').delete().eq('id', league.id);
    return {
      success: false,
      error: membershipError.message || 'Failed to attach you to the new league.',
    };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/leagues');
  revalidatePath(`/dashboard/leagues/${league.id}`);

  return {
    success: true,
    data: {
      leagueId: league.id,
      slug: uniqueSlug,
    },
  };
}
