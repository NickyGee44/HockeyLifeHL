'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

  const { data: members, error } = await supabase
    .from('organization_members')
    .select(`
      *,
      profiles:user_id (
        email,
        full_name
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error) {
    if (isDevelopment) {
      console.error('Error fetching organization members:', error);
    }
    return null;
  }

  return members;
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
