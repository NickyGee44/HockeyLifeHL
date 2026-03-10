'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { verifyLeagueOwnerAccess } from './permissions';

const isDevelopment = process.env.NODE_ENV !== 'production';

export async function updateOrganizationProfile(formData: FormData) {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const organizationId = formData.get('organizationId') as string;
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: 'Slug must contain only lowercase letters, numbers, and hyphens' };
  }

  try {
    // Check if user owns this organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('owner_user_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      if (isDevelopment) {
        console.error('Organization fetch error:', orgError);
      }
      return { error: 'Organization not found' };
    }

    if (org.owner_user_id !== user.id) {
      return { error: 'You do not have permission to update this organization' };
    }

    // Check if slug is already taken by another organization
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .neq('id', organizationId)
      .single();

    if (existingOrg) {
      return { error: 'This slug is already taken by another organization' };
    }

    // Update organization
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        name,
        slug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (updateError) {
      if (isDevelopment) {
        console.error('Organization update error:', updateError);
      }
      return { error: 'Failed to update organization' };
    }

    // Revalidate relevant paths
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/settings');

    return { success: true };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error updating organization:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

export async function getOrganization(organizationId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .eq('owner_user_id', user.id)
    .single();

  if (error) {
    if (isDevelopment) {
      console.error('Error fetching organization:', error);
    }
    return null;
  }

  return organization;
}

export async function getOrganizationMembers(organizationId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // First get the members
  const { data: members, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error) {
    if (isDevelopment) {
      console.error('Error fetching organization members:', error);
    }
    return null;
  }

  // Then fetch profile details separately to avoid FK join issues
  const membersWithProfiles = await Promise.all(
    (members || []).map(async (member) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', member.user_id)
        .single();
      return { ...member, profiles: profile || null };
    })
  );

  return membersWithProfiles;
}

export async function inviteOrganizationMember(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const organizationId = formData.get('organizationId') as string;
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;

  try {
    // Check if user has permission to invite
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('owner_user_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return { error: 'Organization not found' };
    }

    // Only owner or admin can invite
    if (org.owner_user_id !== user.id) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single();

      if (!membership || !['admin', 'owner'].includes(membership.role)) {
        return { error: 'You do not have permission to invite members' };
      }
    }

    // Check if user with this email exists
    const { data: invitedUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (!invitedUser) {
      return { error: 'No user found with this email address. They need to sign up first.' };
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', invitedUser.id)
      .single();

    if (existingMember) {
      return { error: 'This user is already a member of this organization' };
    }

    // Create invitation
    const { error: inviteError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: invitedUser.id,
        role,
        invited_by: user.id,
        status: 'pending',
      });

    if (inviteError) {
      if (isDevelopment) {
        console.error('Error creating invitation:', inviteError);
      }
      return { error: 'Failed to send invitation' };
    }

    revalidatePath('/dashboard/settings/members');

    return { success: true };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error inviting member:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

export async function updateMemberRole(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const organizationId = formData.get('organizationId') as string;
  const memberId = formData.get('memberId') as string;
  const role = formData.get('role') as string;

  try {
    // Check permission
    const { data: org } = await supabase
      .from('organizations')
      .select('owner_user_id')
      .eq('id', organizationId)
      .single();

    if (!org || org.owner_user_id !== user.id) {
      return { error: 'Only the organization owner can change roles' };
    }

    // Update role
    const { error: updateError } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('id', memberId)
      .eq('organization_id', organizationId);

    if (updateError) {
      if (isDevelopment) {
        console.error('Error updating role:', updateError);
      }
      return { error: 'Failed to update role' };
    }

    revalidatePath('/dashboard/settings/members');

    return { success: true };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error updating role:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

export async function removeOrganizationMember(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const organizationId = formData.get('organizationId') as string;
  const memberId = formData.get('memberId') as string;

  try {
    // Check permission
    const { data: org } = await supabase
      .from('organizations')
      .select('owner_user_id')
      .eq('id', organizationId)
      .single();

    if (!org || org.owner_user_id !== user.id) {
      return { error: 'Only the organization owner can remove members' };
    }

    // Cannot remove owner
    const { data: member } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('id', memberId)
      .single();

    if (member && member.user_id === org.owner_user_id) {
      return { error: 'Cannot remove the organization owner' };
    }

    // Remove member
    const { error: removeError } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)
      .eq('organization_id', organizationId);

    if (removeError) {
      if (isDevelopment) {
        console.error('Error removing member:', removeError);
      }
      return { error: 'Failed to remove member' };
    }

    revalidatePath('/dashboard/settings/members');

    return { success: true };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error removing member:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

// ==============================================================================
// LEAGUE BRANDING ACTIONS
// ==============================================================================

/**
 * Get leagues for the current user's organization
 */
export async function getOrganizationLeagues(organizationId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Verify user owns the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('owner_user_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org || org.owner_user_id !== user.id) {
      return { error: 'Not authorized' };
    }

    // Get leagues for this organization (include all statuses — callers need drafts too)
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, organization_id, name, slug, subdomain, logo_url, banner_url, primary_color, secondary_color, accent_color, tagline, description, status, font_family, favicon_url, custom_css, is_public, contact_email, contact_phone, website_url, settings')
      .eq('organization_id', organizationId)
      .order('name');

    if (leaguesError) {
      if (isDevelopment) {
        console.error('Error fetching leagues:', leaguesError);
      }
      return { error: 'Failed to fetch leagues' };
    }

    return { success: true, data: leagues || [] };
  } catch (error) {
    if (isDevelopment) {
      console.error('Error in getOrganizationLeagues:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Fetch leagues the user owns/admins via league_memberships.
 * Used as a fallback when no leagues are linked via organization_id.
 */
export async function getUserLeaguesViaMembership() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const { data: memberships, error: membershipError } = await supabase
      .from('league_memberships')
      .select('league:leagues(id, organization_id, name, slug, subdomain, logo_url, banner_url, primary_color, secondary_color, accent_color, tagline, description, status, font_family, favicon_url, custom_css, is_public, contact_email, contact_phone, website_url, settings)')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin']);

    if (membershipError) {
      if (isDevelopment) {
        console.error('Error fetching leagues via membership:', membershipError);
      }
      return { error: 'Failed to fetch leagues' };
    }

    const leagues = (memberships || [])
      .map((m: any) => m.league)
      .filter((l: any): l is NonNullable<typeof l> => l != null);

    return { success: true, data: leagues };
  } catch (error) {
    if (isDevelopment) {
      console.error('Error in getUserLeaguesViaMembership:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Deep-merge two plain objects. Arrays are replaced, not concatenated.
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const output: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      output[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      );
    } else {
      output[key] = sourceVal;
    }
  }
  return output;
}

/**
 * Update league branding (colors, logo)
 */
export async function updateLeagueBranding(formData: {
  leagueId: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  faviconUrl?: string | null;
  tagline?: string;
  description?: string;
  fontFamily?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  customCss?: string;
  isPublic?: boolean;
  settings?: Record<string, unknown>;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const access = await verifyLeagueOwnerAccess(formData.leagueId);
    if (!access.authorized) {
      return { error: access.error || 'Not authorized to update this league' };
    }

    // Build update object
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (formData.primaryColor !== undefined) {
      updateData.primary_color = formData.primaryColor;
    }
    if (formData.secondaryColor !== undefined) {
      updateData.secondary_color = formData.secondaryColor;
    }
    if (formData.accentColor !== undefined) {
      updateData.accent_color = formData.accentColor;
    }
    if (formData.logoUrl !== undefined) {
      updateData.logo_url = formData.logoUrl;
    }
    if (formData.bannerUrl !== undefined) {
      updateData.banner_url = formData.bannerUrl;
    }
    if (formData.faviconUrl !== undefined) {
      updateData.favicon_url = formData.faviconUrl;
    }
    if (formData.tagline !== undefined) {
      updateData.tagline = formData.tagline;
    }
    if (formData.description !== undefined) {
      updateData.description = formData.description;
    }
    if (formData.fontFamily !== undefined) {
      updateData.font_family = formData.fontFamily;
    }
    if (formData.contactEmail !== undefined) {
      updateData.contact_email = formData.contactEmail;
    }
    if (formData.contactPhone !== undefined) {
      updateData.contact_phone = formData.contactPhone;
    }
    if (formData.websiteUrl !== undefined) {
      updateData.website_url = formData.websiteUrl;
    }
    if (formData.customCss !== undefined) {
      updateData.custom_css = formData.customCss;
    }
    if (formData.isPublic !== undefined) {
      updateData.is_public = formData.isPublic;
    }

    // Deep-merge settings JSONB: read current, merge with incoming, write back
    if (formData.settings !== undefined) {
      const { data: currentLeague } = await supabase
        .from('leagues')
        .select('settings')
        .eq('id', formData.leagueId)
        .single();

      const existingSettings = (currentLeague?.settings as Record<string, unknown>) ?? {};
      const mergedSettings = deepMerge(existingSettings, formData.settings);
      updateData.settings = mergedSettings;
    }

    // Update league
    const { error: updateError } = await supabase
      .from('leagues')
      .update(updateData)
      .eq('id', formData.leagueId);

    if (updateError) {
      if (isDevelopment) {
        console.error('Error updating league branding:', updateError);
      }
      return { error: 'Failed to update branding' };
    }

    // Revalidate league-builder pages
    revalidatePath('/website-editor');
    revalidatePath(`/dashboard/leagues/${formData.leagueId}`);

    // Trigger revalidation on the public league site
    // Fetch the league slug for revalidation
    const { data: leagueForSlug } = await supabase
      .from('leagues')
      .select('slug')
      .eq('id', formData.leagueId)
      .single();

    if (leagueForSlug?.slug) {
      // Trigger revalidation on league-sites
      const leagueSitesUrl = process.env.LEAGUE_SITES_URL || 'http://localhost:3001';
      try {
        await fetch(`${leagueSitesUrl}/api/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: leagueForSlug.slug,
            secret: process.env.REVALIDATION_SECRET,
            type: 'branding',
          }),
        });
      } catch (revalidateError) {
        // Don't fail the whole operation if revalidation fails
        if (isDevelopment) {
          console.warn('Failed to trigger league-sites revalidation:', revalidateError);
        }
      }
    }

    return { success: true };
  } catch (error) {
    if (isDevelopment) {
      console.error('Error in updateLeagueBranding:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Upload league logo to Supabase storage
 */
export async function uploadLeagueLogo(leagueId: string, file: File) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Get league and verify ownership through organization
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, organization_id, organizations!inner(owner_user_id)')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      return { error: 'League not found' };
    }

    const orgOwner = (league.organizations as any)?.owner_user_id;
    if (orgOwner !== user.id) {
      return { error: 'Not authorized to update this league' };
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return { error: 'Invalid file type. Allowed: PNG, JPEG, WebP, SVG' };
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return { error: 'File too large. Maximum size is 2MB' };
    }

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `${leagueId}-${Date.now()}.${ext}`;
    const path = `${filename}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('league-logos')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      if (isDevelopment) {
        console.error('Error uploading logo:', uploadError);
      }
      return { error: 'Failed to upload logo' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('league-logos')
      .getPublicUrl(path);

    // Update league with new logo URL
    const { error: updateError } = await supabase
      .from('leagues')
      .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', leagueId);

    if (updateError) {
      // Try to clean up uploaded file
      await supabase.storage.from('league-logos').remove([path]);
      return { error: 'Failed to update league with logo URL' };
    }

    revalidatePath('/dashboard/settings/branding');
    revalidatePath(`/dashboard/leagues/${leagueId}`);

    return { success: true, data: { url: urlData.publicUrl } };
  } catch (error) {
    if (isDevelopment) {
      console.error('Error in uploadLeagueLogo:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}
