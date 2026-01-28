"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireLeagueRole, setActiveLeagueId } from "@/lib/auth/league-context";
import { validateSlug, generateSlug } from "./slug-utils";
import { sanitizeName, sanitizeText, sanitizeEmail, sanitizeUrl, stripHtml } from "@/lib/input-sanitization";
import { sendLeagueMembershipEmail } from "@/lib/email/notifications";

export type LeagueActionResult = {
  error?: string;
  success?: boolean;
  league?: any;
  leagueId?: string;
};

/**
 * Create a new league
 * The creator becomes the league owner
 */
export async function createLeague(formData: FormData): Promise<LeagueActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Get form data - basic fields
    const name = stripHtml(formData.get('name') as string);
    const description = stripHtml(formData.get('description') as string) || '';
    const sport = stripHtml(formData.get('sport') as string) || 'hockey';
    const slugInput = stripHtml(formData.get('slug') as string);

    // Get form data - enhanced fields
    const tagline = stripHtml(formData.get('tagline') as string) || null;
    const contactEmail = stripHtml(formData.get('contactEmail') as string) || null;
    const city = stripHtml(formData.get('city') as string) || null;
    const region = stripHtml(formData.get('region') as string) || null;
    const teamCountEstimate = formData.get('teamCountEstimate') ? parseInt(formData.get('teamCountEstimate') as string) : null;
    const seasonFormat = stripHtml(formData.get('seasonFormat') as string) || null;
    const expectedStartDate = formData.get('expectedStartDate') as string || null;
    const leagueType = stripHtml(formData.get('leagueType') as string) || null;
    const subscriptionTier = stripHtml(formData.get('subscriptionTier') as string) || 'pro';

    // Template fields
    const templateId = formData.get('templateId') as string || null;
    const colorPresetName = formData.get('colorPresetName') as string || null;
    const ownerRole = stripHtml(formData.get('ownerRole') as string) || 'owner';

    // Validation
    if (!name || name.length < 3) {
      return { error: 'League name must be at least 3 characters' };
    }

    if (name.length > 100) {
      return { error: 'League name must be less than 100 characters' };
    }

    // Generate or validate slug
    const slug = slugInput || generateSlug(name);
    const slugValidation = validateSlug(slug);
    if (!slugValidation.valid) {
      return { error: slugValidation.error };
    }

    // Check if slug is already taken
    const { data: existingLeague } = await supabase
      .from('leagues')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingLeague) {
      return { error: 'This league slug is already taken. Please choose a different name.' };
    }

    // Create the league with enhanced fields
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .insert({
        name,
        slug,
        description,
        sport,
        status: 'active',
        created_by: user.id,
        // Enhanced fields
        tagline,
        contact_email: contactEmail,
        city,
        region,
        team_count_estimate: teamCountEstimate,
        season_format: seasonFormat,
        expected_start_date: expectedStartDate,
        league_type: leagueType,
        subscription_tier: subscriptionTier,
        features_enabled: {
          drafts: true,
          payments: subscriptionTier === 'pro' || subscriptionTier === 'enterprise',
          ai_recaps: subscriptionTier === 'pro' || subscriptionTier === 'enterprise',
          stats_tracking: true,
          mobile_app: true,
        },
      })
      .select()
      .single();

    if (leagueError) {
      console.error('Error creating league:', leagueError);
      return { error: 'Failed to create league. Please try again.' };
    }

    // Add creator as league owner with specified role
    const { error: membershipError } = await supabase
      .from('league_memberships')
      .insert({
        league_id: league.id,
        user_id: user.id,
        role: ownerRole,
        status: 'active',
      });

    if (membershipError) {
      console.error('Error creating league membership:', membershipError);
      // Rollback: delete the league
      await supabase.from('leagues').delete().eq('id', league.id);
      return { error: 'Failed to create league membership. Please try again.' };
    }

    // Create default league settings
    const { error: settingsError } = await (supabase as any)
      .from('league_settings')
      .insert({
        league_id: league.id,
        stat_entry_mode: 'captain', // Default to captain-entered stats
        allow_trades: true,
        allow_player_registration: true,
        require_payment: subscriptionTier === 'pro' || subscriptionTier === 'enterprise',
      });

    if (settingsError) {
      console.error('Error creating league settings:', settingsError);
      // Non-critical, continue anyway
    }

    // Set template if provided
    if (templateId) {
      try {
        const { setLeagueTemplate } = await import('@/lib/templates/actions');

        // Build customizations object
        const customizations: any = {};

        // Add color preset or custom colors
        if (colorPresetName) {
          customizations.colorPresetName = colorPresetName;
        }

        // Add custom colors if provided
        const customPrimary = formData.get('customColors.primary') as string;
        const customSecondary = formData.get('customColors.secondary') as string;
        const customAccent = formData.get('customColors.accent') as string;

        if (customPrimary || customSecondary || customAccent) {
          customizations.colors = {
            primary: customPrimary || null,
            secondary: customSecondary || null,
            accent: customAccent || null,
          };
        }

        // Set the template with customizations
        await setLeagueTemplate(league.id, templateId, customizations);
      } catch (templateError) {
        console.error('Error setting league template:', templateError);
        // Non-critical, continue anyway
      }
    }

    // Set as active league
    await setActiveLeagueId(league.id);

    revalidatePath('/');
    revalidatePath(`/${slug}`);
    return { success: true, league, leagueId: league.id };
  } catch (error: any) {
    console.error('Error in createLeague:', error);
    return { error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Update league information
 * Requires owner or admin role
 */
export async function updateLeague(
  leagueId: string,
  updates: {
    name?: string;
    description?: string;
    sport?: string;
    contact_email?: string;
    website_url?: string;
  }
): Promise<LeagueActionResult> {
  try {
    // Require owner or admin role
    const { userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Sanitize inputs
    const sanitized: any = {};
    if (updates.name) {
      sanitized.name = stripHtml(updates.name);
      if (sanitized.name.length < 3 || sanitized.name.length > 100) {
        return { error: 'League name must be between 3 and 100 characters' };
      }
    }
    if (updates.description !== undefined) {
      sanitized.description = stripHtml(updates.description);
    }
    if (updates.sport) {
      sanitized.sport = stripHtml(updates.sport);
    }
    if (updates.contact_email) {
      sanitized.contact_email = stripHtml(updates.contact_email);
    }
    if (updates.website_url) {
      sanitized.website_url = stripHtml(updates.website_url);
    }

    // Update league
    const { data: league, error } = await supabase
      .from('leagues')
      .update({
        ...sanitized,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId)
      .select()
      .single();

    if (error) {
      console.error('Error updating league:', error);
      return { error: 'Failed to update league' };
    }

    revalidatePath('/');
    return { success: true, league };
  } catch (error: any) {
    console.error('Error in updateLeague:', error);
    return { error: error.message || 'Unauthorized or failed to update league' };
  }
}

/**
 * Delete (archive) a league
 * Requires owner role
 * Does not actually delete, just sets status to 'archived'
 */
export async function deleteLeague(leagueId: string): Promise<LeagueActionResult> {
  try {
    // Require owner role (only owners can delete leagues)
    const { userId } = await requireLeagueRole(['owner']);

    const supabase = await createClient();

    // Archive the league instead of deleting
    const { error } = await supabase
      .from('leagues')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId);

    if (error) {
      console.error('Error archiving league:', error);
      return { error: 'Failed to archive league' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteLeague:', error);
    return { error: error.message || 'Unauthorized or failed to archive league' };
  }
}

/**
 * Invite a user to a league
 * Requires owner or admin role
 */
export async function inviteUserToLeague(
  email: string,
  role: 'admin' | 'captain' | 'scorekeeper' | 'player'
): Promise<LeagueActionResult> {
  try {
    // Require owner or admin role
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      // User exists, check if already a member
      const { data: existingMembership } = await supabase
        .from('league_memberships')
        .select('id, status')
        .eq('league_id', leagueId)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMembership) {
        if (existingMembership.status === 'active') {
          return { error: 'User is already a member of this league' };
        } else if (existingMembership.status === 'invited') {
          return { error: 'User already has a pending invitation' };
        } else {
          // Reactivate suspended membership
          const { error } = await supabase
            .from('league_memberships')
            .update({ status: 'active', role })
            .eq('id', existingMembership.id);

          if (error) {
            return { error: 'Failed to reactivate membership' };
          }

          revalidatePath('/');
          return { success: true };
        }
      }

      // Create new membership
      const { error } = await supabase
        .from('league_memberships')
        .insert({
          league_id: leagueId,
          user_id: existingUser.id,
          role,
          status: 'active',
          invited_by: userId,
        });

      if (error) {
        console.error('Error creating membership:', error);
        return { error: 'Failed to add user to league' };
      }

      // Send email notification to user
      await sendLeagueMembershipEmail(leagueId, existingUser.id, role).catch(err =>
        console.error('Failed to send membership email:', err)
      );

      revalidatePath('/');
      return { success: true };
    } else {
      // User doesn't exist, create invitation
      const { error } = await (supabase as any)
        .from('league_invitations')
        .insert({
          league_id: leagueId,
          email: email.toLowerCase(),
          role,
          invited_by: userId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

      if (error) {
        console.error('Error creating invitation:', error);
        return { error: 'Failed to create invitation' };
      }

      // TODO: Send invitation email
      // await sendLeagueInvitationEmail(email, leagueId, role);

      revalidatePath('/');
      return { success: true };
    }
  } catch (error: any) {
    console.error('Error in inviteUserToLeague:', error);
    return { error: error.message || 'Unauthorized or failed to invite user' };
  }
}

/**
 * Remove a user from a league
 * Requires owner or admin role
 */
export async function removeUserFromLeague(
  membershipId: string
): Promise<LeagueActionResult> {
  try {
    // Require owner or admin role
    const { leagueId, userId, role } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Get the membership to check permissions
    const { data: membership, error: fetchError } = await supabase
      .from('league_memberships')
      .select('user_id, role, league_id')
      .eq('id', membershipId)
      .single();

    if (fetchError || !membership) {
      return { error: 'Membership not found' };
    }

    // Verify membership is for the active league
    if (membership.league_id !== leagueId) {
      return { error: 'Cannot remove membership from a different league' };
    }

    // Cannot remove yourself
    if (membership.user_id === userId) {
      return { error: 'You cannot remove yourself from the league' };
    }

    // Admins cannot remove owners
    if (role === 'admin' && membership.role === 'owner') {
      return { error: 'Admins cannot remove league owners' };
    }

    // Set status to suspended instead of deleting
    const { error } = await supabase
      .from('league_memberships')
      .update({ status: 'suspended' })
      .eq('id', membershipId);

    if (error) {
      console.error('Error removing user:', error);
      return { error: 'Failed to remove user from league' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error in removeUserFromLeague:', error);
    return { error: error.message || 'Unauthorized or failed to remove user' };
  }
}

/**
 * Switch the active league for the current user
 */
export async function switchActiveLeague(leagueId: string): Promise<LeagueActionResult> {
  try {
    const result = await setActiveLeagueId(leagueId);

    if (result.error) {
      return { error: result.error };
    }

    revalidatePath('/');
    return { success: true, leagueId };
  } catch (error: any) {
    console.error('Error switching league:', error);
    return { error: error.message || 'Failed to switch league' };
  }
}

/**
 * Get all members of a league
 * Requires membership in the league
 */
export async function getLeagueMembers(leagueId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated', members: [] };
    }

    // Verify user is a member of this league
    const { data: membership } = await supabase
      .from('league_memberships')
      .select('league_id')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return { error: 'You are not a member of this league', members: [] };
    }

    // Get all members
    const { data: members, error } = await supabase
      .from('league_memberships')
      .select(`
        id,
        role,
        status,
        created_at,
        user:profiles (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('league_id', leagueId)
      .in('status', ['active', 'invited'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching league members:', error);
      return { error: 'Failed to fetch league members', members: [] };
    }

    return { members: members || [] };
  } catch (error: any) {
    console.error('Error in getLeagueMembers:', error);
    return { error: error.message || 'Failed to fetch members', members: [] };
  }
}
