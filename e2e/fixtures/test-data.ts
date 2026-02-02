import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Test Data Factory
 * Creates and manages test data for E2E tests
 */

export interface TestUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
}

export interface TestOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface TestLeague {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
}

export interface TestTeam {
  id: string;
  name: string;
  leagueId: string;
}

export interface TestSeason {
  id: string;
  name: string;
  leagueId: string;
}

// Generate unique identifiers for test data
const generateTestId = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Test Users
 */
export const TEST_USERS = {
  admin: {
    email: `admin+e2e@hockeylife.test`,
    password: 'TestPassword123!',
    fullName: 'E2E Admin User',
  },
  organizer: {
    email: `organizer+e2e@hockeylife.test`,
    password: 'TestPassword123!',
    fullName: 'E2E League Organizer',
  },
  player: {
    email: `player+e2e@hockeylife.test`,
    password: 'TestPassword123!',
    fullName: 'E2E Test Player',
  },
  captain: {
    email: `captain+e2e@hockeylife.test`,
    password: 'TestPassword123!',
    fullName: 'E2E Team Captain',
  },
  scorekeeper: {
    email: `scorekeeper+e2e@hockeylife.test`,
    password: 'TestPassword123!',
    fullName: 'E2E Scorekeeper',
  },
} as const;

/**
 * Test League Data
 */
export const TEST_LEAGUE_DATA = {
  name: 'E2E Test League',
  description: 'Automated E2E testing league',
  city: 'Toronto',
  state_province: 'Ontario',
  country: 'Canada',
  timezone: 'America/Toronto',
  primary_color: '#D4AF37',
  secondary_color: '#1a1a1a',
};

/**
 * Test Season Data
 */
export const TEST_SEASON_DATA = {
  name: 'E2E Test Season 2026',
  start_date: '2026-03-01',
  end_date: '2026-06-30',
  registration_type: 'open',
  game_duration_minutes: 60,
  period_count: 3,
};

/**
 * Test Team Data
 */
export const TEST_TEAMS = [
  { name: 'E2E Test Hawks', short_name: 'HAWKS', color: '#FF0000' },
  { name: 'E2E Test Bears', short_name: 'BEARS', color: '#0000FF' },
  { name: 'E2E Test Wolves', short_name: 'WOLVES', color: '#00FF00' },
  { name: 'E2E Test Eagles', short_name: 'EAGLES', color: '#FFD700' },
];

/**
 * Stripe Test Cards
 * @see https://stripe.com/docs/testing#cards
 */
export const STRIPE_TEST_CARDS = {
  success: '4242424242424242',
  decline: '4000000000000002',
  insufficient_funds: '4000000000009995',
  requires_authentication: '4000002500003155',
  // 3D Secure test card
  threeDSecure: '4000002760003184',
};

/**
 * Test Data Seeder Class
 */
export class TestDataSeeder {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Create a test user via Supabase Auth
   */
  async createUser(userData: typeof TEST_USERS.admin): Promise<TestUser> {
    const uniqueEmail = userData.email.replace('@', `+${generateTestId()}@`);

    // Create auth user
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      email: uniqueEmail,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.fullName,
      },
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }

    return {
      id: authData.user.id,
      email: uniqueEmail,
      password: userData.password,
      fullName: userData.fullName,
    };
  }

  /**
   * Create a test organization
   */
  async createOrganization(userId: string, name?: string): Promise<TestOrganization> {
    const orgName = name || `E2E Test Org ${generateTestId()}`;
    const slug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const { data, error } = await this.supabase
      .from('organizations')
      .insert({
        name: orgName,
        slug,
        owner_user_id: userId,
        subscription_tier: 'starter',
        subscription_status: 'active',
      })
      .select('id, name, slug')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create organization: ${error?.message}`);
    }

    // Also create organization membership
    await this.supabase.from('organization_members').insert({
      organization_id: data.id,
      user_id: userId,
      role: 'owner',
      status: 'active',
    });

    return data as TestOrganization;
  }

  /**
   * Create a test league with season
   */
  async createLeague(
    organizationId: string,
    userId: string,
    options?: Partial<typeof TEST_LEAGUE_DATA>
  ): Promise<TestLeague> {
    const leagueData = { ...TEST_LEAGUE_DATA, ...options };
    const slug = `e2e-test-league-${generateTestId()}`;

    const { data, error } = await this.supabase
      .from('leagues')
      .insert({
        ...leagueData,
        slug,
        organization_id: organizationId,
        created_by: userId,
        status: 'active',
      })
      .select('id, name, slug')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create league: ${error?.message}`);
    }

    // Create league membership
    await this.supabase.from('league_memberships').insert({
      league_id: data.id,
      user_id: userId,
      role: 'owner',
      status: 'active',
    });

    return {
      ...(data as any),
      organizationId,
    };
  }

  /**
   * Create a test season
   */
  async createSeason(
    leagueId: string,
    options?: Partial<typeof TEST_SEASON_DATA>
  ): Promise<TestSeason> {
    const seasonData = { ...TEST_SEASON_DATA, ...options };

    const { data, error } = await this.supabase
      .from('seasons')
      .insert({
        ...seasonData,
        league_id: leagueId,
        status: 'draft',
      })
      .select('id, name')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create season: ${error?.message}`);
    }

    return {
      ...(data as any),
      leagueId,
    };
  }

  /**
   * Create test teams for a league
   */
  async createTeams(leagueId: string): Promise<TestTeam[]> {
    const teamsToInsert = TEST_TEAMS.map((team) => ({
      ...team,
      league_id: leagueId,
    }));

    const { data, error } = await this.supabase
      .from('teams')
      .insert(teamsToInsert)
      .select('id, name');

    if (error || !data) {
      throw new Error(`Failed to create teams: ${error?.message}`);
    }

    return data.map((team) => ({
      ...(team as any),
      leagueId,
    }));
  }

  /**
   * Clean up test data by user ID
   */
  async cleanup(userId: string): Promise<void> {
    // Delete leagues (cascades to teams, seasons, etc.)
    await this.supabase.from('leagues').delete().eq('created_by', userId);

    // Delete organizations
    await this.supabase.from('organizations').delete().eq('owner_user_id', userId);

    // Delete auth user
    await this.supabase.auth.admin.deleteUser(userId);
  }

  /**
   * Create a complete test environment
   */
  async seedCompleteEnvironment(): Promise<{
    user: TestUser;
    organization: TestOrganization;
    league: TestLeague;
    season: TestSeason;
    teams: TestTeam[];
  }> {
    // Create user
    const user = await this.createUser(TEST_USERS.organizer);

    // Create organization
    const organization = await this.createOrganization(user.id);

    // Create league
    const league = await this.createLeague(organization.id, user.id);

    // Create season
    const season = await this.createSeason(league.id);

    // Create teams
    const teams = await this.createTeams(league.id);

    return {
      user,
      organization,
      league,
      season,
      teams,
    };
  }
}

/**
 * Export singleton instance for easy access
 */
export const testDataSeeder = new TestDataSeeder();
