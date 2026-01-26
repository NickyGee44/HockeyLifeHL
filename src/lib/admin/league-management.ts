"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { stripHtml } from "@/lib/input-sanitization";
import { validateSlug, generateSlug } from "../leagues/slug-utils";

export type LeagueManagementResult = {
  error?: string;
  success?: boolean;
  league?: any;
  leagues?: any[];
  leagueId?: string;
};

/**
 * League Management Server Actions
 *
 * Admin-only functions for managing all leagues in the platform
 * Requires platform admin/owner privileges
 */

/**
 * Get all leagues with basic stats
 * For display in the admin leagues table
 */
export async function getAllLeagues(): Promise<LeagueManagementResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // TODO: Add platform admin check here
    // For now, any authenticated user can view leagues

    // Fetch all leagues with member counts
    const { data: leagues, error } = await supabase
      .from('leagues')
      .select(`
        id,
        name,
        slug,
        subdomain,
        custom_domain,
        custom_domain_verified,
        status,
        created_at,
        updated_at,
        logo_url,
        primary_color,
        secondary_color,
        sport
      `)
      .order('created_at', { ascending: false }) as {
        data: Array<{
          id: string;
          name: string;
          slug: string;
          subdomain: string | null;
          custom_domain: string | null;
          custom_domain_verified: boolean | null;
          status: string;
          created_at: string | null;
          updated_at: string | null;
          logo_url: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          sport: string;
        }> | null;
        error: any;
      };

    if (error) {
      console.error('Error fetching leagues:', error);
      return { error: 'Failed to fetch leagues' };
    }

    // Get member counts for each league
    const leaguesWithStats = await Promise.all(
      (leagues || []).map(async (league) => {
        // Get member count
        const { count: memberCount } = await supabase
          .from('league_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', league.id)
          .eq('status', 'active');

        // Get team count
        const { count: teamCount } = await supabase
          .from('teams')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', league.id);

        // Get game count
        const { count: gameCount } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', league.id);

        return {
          ...league,
          stats: {
            members: memberCount || 0,
            teams: teamCount || 0,
            games: gameCount || 0,
          },
        };
      })
    );

    return { success: true, leagues: leaguesWithStats };
  } catch (error: any) {
    console.error('Error in getAllLeagues:', error);
    return { error: error.message || 'Failed to fetch leagues' };
  }
}

/**
 * Get detailed information about a specific league
 * Includes all branding, settings, and stats
 */
export async function getLeagueDetails(leagueId: string): Promise<LeagueManagementResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Fetch league with all details
    const { data: league, error } = await supabase
      .from('leagues')
      .select(`
        id,
        name,
        slug,
        subdomain,
        custom_domain,
        custom_domain_verified,
        description,
        sport,
        status,
        created_at,
        updated_at,
        logo_url,
        banner_url,
        favicon_url,
        primary_color,
        secondary_color,
        accent_color,
        font_family,
        custom_css,
        tagline,
        contact_email,
        website_url,
        created_by
      `)
      .eq('id', leagueId)
      .single() as { data: any; error: any };

    if (error) {
      console.error('Error fetching league details:', error);
      return { error: 'League not found' };
    }

    // Get detailed stats
    const { count: memberCount } = await supabase
      .from('league_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('status', 'active');

    const { count: teamCount } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    const { count: gameCount } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    const { count: completedGameCount } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('status', 'completed');

    // Get owner information
    const { data: owner } = await supabase
      .from('league_memberships')
      .select(`
        user_id,
        profiles:user_id (
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('league_id', leagueId)
      .eq('role', 'owner')
      .limit(1)
      .single();

    // Get recent activity (last 5 games)
    const { data: recentGames } = await supabase
      .from('games')
      .select(`
        id,
        scheduled_at,
        status,
        home_score,
        away_score,
        home_team:teams!games_home_team_id_fkey(name),
        away_team:teams!games_away_team_id_fkey(name)
      `)
      .eq('league_id', leagueId)
      .order('scheduled_at', { ascending: false })
      .limit(5);

    return {
      success: true,
      league: {
        ...league,
        stats: {
          members: memberCount || 0,
          teams: teamCount || 0,
          games: gameCount || 0,
          completedGames: completedGameCount || 0,
        },
        owner: owner?.profiles || null,
        recentActivity: recentGames || [],
      },
    };
  } catch (error: any) {
    console.error('Error in getLeagueDetails:', error);
    return { error: error.message || 'Failed to fetch league details' };
  }
}

/**
 * Update league status (active, suspended, archived)
 * Admin-only function
 */
export async function updateLeagueStatus(
  leagueId: string,
  status: 'active' | 'suspended' | 'archived'
): Promise<LeagueManagementResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // TODO: Add platform admin check here

    const { data: league, error } = await (supabase as any)
      .from('leagues')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId)
      .select()
      .single();

    if (error) {
      console.error('Error updating league status:', error);
      return { error: 'Failed to update league status' };
    }

    revalidatePath('/admin/leagues');
    return { success: true, league };
  } catch (error: any) {
    console.error('Error in updateLeagueStatus:', error);
    return { error: error.message || 'Failed to update league status' };
  }
}

/**
 * Permanently delete a league
 * WARNING: This is destructive and should be used with caution
 * Admin-only function
 */
export async function permanentlyDeleteLeague(leagueId: string): Promise<LeagueManagementResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // TODO: Add platform admin check here

    // Instead of hard delete, set to archived status
    // This preserves data integrity
    const { error } = await supabase
      .from('leagues')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId);

    if (error) {
      console.error('Error deleting league:', error);
      return { error: 'Failed to delete league' };
    }

    revalidatePath('/admin/leagues');
    return { success: true };
  } catch (error: any) {
    console.error('Error in permanentlyDeleteLeague:', error);
    return { error: error.message || 'Failed to delete league' };
  }
}

/**
 * Create a new league from admin portal
 * Allows admin to specify owner
 */
export async function createLeagueAsAdmin(data: {
  name: string;
  slug?: string;
  description?: string;
  sport?: string;
  subdomain?: string;
  ownerEmail: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
}): Promise<LeagueManagementResult> {
  try {
    const supabase = await createClient();

    // Get current user (admin)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // TODO: Add platform admin check here

    // Validation
    const name = stripHtml(data.name);
    if (!name || name.length < 3) {
      return { error: 'League name must be at least 3 characters' };
    }

    if (name.length > 100) {
      return { error: 'League name must be less than 100 characters' };
    }

    // Generate or validate slug
    const slug = data.slug || generateSlug(name);
    const slugValidation = validateSlug(slug);
    if (!slugValidation.valid) {
      return { error: slugValidation.error };
    }

    // Check if slug is already taken
    const { data: existingLeague } = await (supabase as any)
      .from('leagues')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingLeague) {
      return { error: 'This league slug is already taken. Please choose a different name.' };
    }

    // Use subdomain from data or default to slug
    const subdomain = data.subdomain || slug;

    // Check if subdomain is already taken
    const { data: existingSubdomain } = await (supabase as any)
      .from('leagues')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (existingSubdomain) {
      return { error: 'This subdomain is already taken. Please choose a different one.' };
    }

    // Find the owner user
    const { data: ownerProfile } = await (supabase as any)
      .from('profiles')
      .select('id')
      .eq('email', data.ownerEmail.toLowerCase())
      .single();

    if (!ownerProfile) {
      return { error: 'Owner user not found. Please ensure the email is correct.' };
    }

    // Create the league
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .insert({
        name,
        slug,
        subdomain,
        description: stripHtml(data.description || ''),
        sport: stripHtml(data.sport || 'hockey'),
        status: 'active',
        created_by: user.id,
        primary_color: data.primaryColor || '#FF0000',
        secondary_color: data.secondaryColor || '#000000',
        accent_color: data.accentColor || '#FFD700',
        logo_url: data.logoUrl || null,
      })
      .select()
      .single();

    if (leagueError) {
      console.error('Error creating league:', leagueError);
      return { error: 'Failed to create league. Please try again.' };
    }

    // Add owner as league member
    const { error: membershipError } = await supabase
      .from('league_memberships')
      .insert({
        league_id: league.id,
        user_id: ownerProfile.id,
        role: 'owner',
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
        stat_entry_mode: 'captain',
        allow_trades: true,
        allow_player_registration: true,
        require_payment: false,
      });

    if (settingsError) {
      console.error('Error creating league settings:', settingsError);
      // Non-critical, continue anyway
    }

    revalidatePath('/admin/leagues');
    return { success: true, league, leagueId: league.id };
  } catch (error: any) {
    console.error('Error in createLeagueAsAdmin:', error);
    return { error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Update league information from admin portal
 * Allows updating any league field
 */
export async function updateLeagueAsAdmin(
  leagueId: string,
  updates: {
    name?: string;
    description?: string;
    sport?: string;
    contact_email?: string;
    website_url?: string;
    subdomain?: string;
  }
): Promise<LeagueManagementResult> {
  try {
    const supabase = await createClient();

    // Get current user (admin)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // TODO: Add platform admin check here

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

    if (updates.subdomain) {
      const subdomain = stripHtml(updates.subdomain);

      // Validate subdomain format
      const subdomainRegex = /^[a-z0-9-]+$/;
      if (!subdomainRegex.test(subdomain)) {
        return { error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' };
      }

      // Check if subdomain is already taken by another league
      const { data: existingSubdomain } = await (supabase as any)
        .from('leagues')
        .select('id')
        .eq('subdomain', subdomain)
        .neq('id', leagueId)
        .single();

      if (existingSubdomain) {
        return { error: 'This subdomain is already taken by another league' };
      }

      sanitized.subdomain = subdomain;
    }

    // Update league
    const { data: league, error } = await (supabase as any)
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

    revalidatePath('/admin/leagues');
    revalidatePath(`/admin/leagues/${leagueId}`);
    return { success: true, league };
  } catch (error: any) {
    console.error('Error in updateLeagueAsAdmin:', error);
    return { error: error.message || 'Failed to update league' };
  }
}
