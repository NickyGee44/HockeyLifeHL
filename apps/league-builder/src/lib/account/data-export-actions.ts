/**
 * GDPR Article 15 & 20: Right to Access and Data Portability
 * Server actions for exporting user data
 */

'use server';

import { createClient } from '@/lib/supabase/server';

export interface UserDataExport {
  exportDate: string;
  format: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    city: string | null;
    province: string | null;
    avatar_url: string | null;
    position: string | null;
    skill_level: string | null;
    availability: string | null;
    created_at: string;
  };
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    subscription_tier: string;
    subscription_status: string;
    created_at: string;
  }>;
  leagues: Array<{
    id: string;
    name: string;
    status: string;
    membership_status: string;
    joined_at: string;
  }>;
  teams: Array<{
    team_id: string;
    team_name: string;
    league_name: string;
    jersey_number: number;
    position: string;
    status: string;
    leadership_role: string | null;
    start_date: string;
    end_date: string | null;
  }>;
  consents: Array<{
    consent_type: string;
    granted: boolean;
    granted_at: string;
    withdrawn_at: string | null;
  }>;
  sessions: Array<{
    created_at: string;
    last_active_at: string;
    expires_at: string;
  }>;
}

/**
 * Export all user data in machine-readable format (JSON)
 * GDPR Article 15 (Right to Access) & Article 20 (Data Portability)
 */
export async function exportUserData(): Promise<{
  success: boolean;
  data?: UserDataExport;
  filename?: string;
  error?: string;
}> {
  const supabase = await createClient();

  // 1. Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // 2. Fetch profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Failed to fetch profile data' };
    }

    // 3. Fetch organizations
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name, slug, subscription_tier, subscription_status, created_at')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false });

    // 4. Fetch league memberships
    const { data: leagueMemberships } = await supabase
      .from('league_memberships')
      .select(
        `
        id,
        league_id,
        status,
        joined_at,
        leagues (
          id,
          name,
          status
        )
      `
      )
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    // 5. Fetch team rosters
    const { data: teamRosters } = await supabase
      .from('team_rosters')
      .select(
        `
        team_id,
        jersey_number,
        position,
        status,
        leadership_role,
        start_date,
        end_date,
        teams (
          id,
          name,
          leagues (
            name
          )
        )
      `
      )
      .eq('player_id', user.id)
      .order('start_date', { ascending: false });

    // 6. Fetch consents
    const { data: consents } = await supabase
      .from('user_consents')
      .select('consent_type, granted, granted_at, withdrawn_at')
      .eq('user_id', user.id)
      .order('granted_at', { ascending: false });

    // 7. Fetch active sessions (only recent ones, not all historical)
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('created_at, last_active_at, expires_at')
      .eq('user_id', user.id)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    // 8. Build export object
    const profileData = profile as any;
    const exportData: UserDataExport = {
      exportDate: new Date().toISOString(),
      format: 'GDPR Article 15 & 20 - Right to Access and Data Portability',
      user: {
        id: profileData.id,
        email: profileData.email,
        full_name: profileData.full_name,
        phone: profileData.phone,
        city: profileData.city,
        province: profileData.province,
        avatar_url: profileData.avatar_url,
        position: profileData.position,
        skill_level: profileData.skill_level,
        availability: profileData.availability,
        created_at: profileData.created_at,
      },
      organizations:
        organizations?.map((org: any) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: 'owner',
          subscription_tier: org.subscription_tier,
          subscription_status: org.subscription_status,
          created_at: org.created_at,
        })) || [],
      leagues:
        leagueMemberships?.map((lm: any) => ({
          id: lm.league_id,
          name: lm.leagues?.name || 'Unknown',
          status: lm.leagues?.status || 'unknown',
          membership_status: lm.status,
          joined_at: lm.joined_at,
        })) || [],
      teams:
        teamRosters?.map((tr: any) => ({
          team_id: tr.team_id,
          team_name: tr.teams?.name || 'Unknown',
          league_name: tr.teams?.leagues?.name || 'Unknown',
          jersey_number: tr.jersey_number,
          position: tr.position,
          status: tr.status,
          leadership_role: tr.leadership_role,
          start_date: tr.start_date,
          end_date: tr.end_date,
        })) || [],
      consents:
        consents?.map((c: any) => ({
          consent_type: c.consent_type,
          granted: c.granted,
          granted_at: c.granted_at,
          withdrawn_at: c.withdrawn_at,
        })) || [],
      sessions:
        sessions?.map((s: any) => ({
          created_at: s.created_at,
          last_active_at: s.last_active_at,
          expires_at: s.expires_at,
        })) || [],
    };

    // 9. Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `hockeylife-export-${user.id.substring(0, 8)}-${timestamp}.json`;

    return {
      success: true,
      data: exportData,
      filename,
    };
  } catch (error) {
    console.error('Error exporting user data:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while exporting your data',
    };
  }
}

/**
 * Get summary of user data (without full export)
 * Useful for displaying data counts in UI
 */
export async function getUserDataSummary(): Promise<{
  success: boolean;
  summary?: {
    profileComplete: boolean;
    organizationCount: number;
    leagueCount: number;
    teamCount: number;
    consentCount: number;
    activeSessionCount: number;
  };
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const [profile, orgs, leagues, teams, consents, sessions] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name').eq('id', user.id).single(),
      supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('owner_user_id', user.id),
      supabase
        .from('league_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active'),
      supabase
        .from('team_rosters')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', user.id)
        .is('end_date', null),
      supabase
        .from('user_consents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('granted', true)
        .is('withdrawn_at', null),
      supabase
        .from('user_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('expires_at', new Date().toISOString()),
    ]);

    const profileData = profile as any;
    return {
      success: true,
      summary: {
        profileComplete: !!(profileData.data?.email && profileData.data?.full_name),
        organizationCount: orgs.count || 0,
        leagueCount: leagues.count || 0,
        teamCount: teams.count || 0,
        consentCount: consents.count || 0,
        activeSessionCount: sessions.count || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching data summary:', error);
    return {
      success: false,
      error: 'Failed to fetch data summary',
    };
  }
}
