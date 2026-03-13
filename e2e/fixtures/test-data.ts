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
  registration_type: 'open_registration',
  game_duration_minutes: 60,
  period_count: 3,
};

/**
 * Test Team Data
 */
export const TEST_TEAMS = [
  { name: 'E2E Test Hawks', short_name: 'HWKS', primary_color: '#FF0000', secondary_color: '#1A1A1A' },
  { name: 'E2E Test Bears', short_name: 'BEAR', primary_color: '#0000FF', secondary_color: '#FFFFFF' },
  { name: 'E2E Test Wolves', short_name: 'WOLF', primary_color: '#00FF00', secondary_color: '#111111' },
  { name: 'E2E Test Eagles', short_name: 'EAGL', primary_color: '#FFD700', secondary_color: '#1A1A1A' },
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

    // Some environments do not eagerly materialize the matching profile row,
    // but most application tables reference profiles(id), not auth.users(id).
    const { error: profileError } = await this.supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: uniqueEmail,
        full_name: userData.fullName,
      });

    if (profileError) {
      throw new Error(`Failed to create test profile: ${profileError.message}`);
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
        subscription_tier: 'enterprise',
        subscription_status: 'active',
        bypass_subscription_gate: true,
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

    await this.supabase.from('organization_addons').insert({
      organization_id: data.id,
      addon_type: 'platform_subscription',
      status: 'active',
      amount_cents: 0,
      activated_at: new Date().toISOString(),
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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

  /**
   * Create a game between two teams
   */
  async createGame(data: {
    seasonId: string;
    homeTeamId: string;
    awayTeamId: string;
    leagueId?: string;
    scheduledAt?: string;
    status?: string;
  }): Promise<{ id: string }> {
    let leagueId = data.leagueId;

    if (!leagueId) {
      const { data: season, error: seasonError } = await this.supabase
        .from('seasons')
        .select('league_id')
        .eq('id', data.seasonId)
        .single();

      if (seasonError || !season?.league_id) {
        throw new Error(`Failed to resolve game league: ${seasonError?.message || 'Missing league_id on season'}`);
      }

      leagueId = season.league_id;
    }

    const { data: game, error } = await this.supabase
      .from('games')
      .insert({
        league_id: leagueId,
        season_id: data.seasonId,
        home_team_id: data.homeTeamId,
        away_team_id: data.awayTeamId,
        scheduled_at: data.scheduledAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        status: data.status || 'scheduled',
        period_count: 3,
        period_length_minutes: 20,
      })
      .select('id')
      .single();

    if (error || !game) {
      throw new Error(`Failed to create game: ${error?.message}`);
    }

    return game;
  }

  /**
   * Assign scorekeeper to game
   */
  async assignScorekeeper(gameId: string, scorekeeperEmail: string): Promise<{ token: string }> {
    // Generate token
    const token = Math.random().toString(36).substring(2, 15).toUpperCase();

    // Create scorekeeper session
    const { error } = await this.supabase.from('scorekeeper_sessions').insert({
      game_id: gameId,
      token,
      scorekeeper_email: scorekeeperEmail,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      status: 'active',
    });

    if (error) {
      throw new Error(`Failed to assign scorekeeper: ${error?.message}`);
    }

    return { token };
  }

  /**
   * Set team captain
   */
  async setTeamCaptain(teamId: string, playerId: string): Promise<void> {
    const { error } = await this.supabase
      .from('teams')
      .update({ captain_id: playerId })
      .eq('id', teamId);

    if (error) {
      throw new Error(`Failed to set captain: ${error?.message}`);
    }

    // Also update roster
    await this.supabase
      .from('team_rosters')
      .update({ is_captain: true })
      .eq('team_id', teamId)
      .eq('player_id', playerId);
  }

  /**
   * Add player to team roster
   */
  async addPlayerToRoster(data: {
    teamId: string;
    playerId: string;
    jerseyNumber: number;
    position: 'Forward' | 'Defense' | 'Goalie';
  }): Promise<void> {
    const { error } = await this.supabase.from('team_rosters').insert({
      team_id: data.teamId,
      player_id: data.playerId,
      jersey_number: data.jerseyNumber,
      position: data.position,
      status: 'active',
    });

    if (error) {
      throw new Error(`Failed to add player to roster: ${error?.message}`);
    }
  }

  /**
   * Create player join request
   */
  async createJoinRequest(teamId: string, playerId: string): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from('team_join_requests')
      .insert({
        team_id: teamId,
        player_id: playerId,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create join request: ${error?.message}`);
    }

    return data;
  }

  /**
   * Configure season fees
   */
  async configureSeasonFees(seasonId: string, feeAmount: number): Promise<void> {
    const { error } = await this.supabase
      .from('seasons')
      .update({
        registration_fee: feeAmount,
        payment_enabled: true,
      })
      .eq('id', seasonId);

    if (error) {
      throw new Error(`Failed to configure fees: ${error?.message}`);
    }
  }

  /**
   * Create test payment record
   */
  async createPaymentRecord(data: {
    seasonId: string;
    playerId: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    stripePaymentIntentId?: string;
  }): Promise<{ id: string }> {
    const { data: payment, error } = await this.supabase
      .from('player_payments')
      .insert({
        season_id: data.seasonId,
        player_id: data.playerId,
        amount: data.amount,
        status: data.status,
        stripe_payment_intent_id: data.stripePaymentIntentId || `pi_test_${Date.now()}`,
        paid_at: data.status === 'paid' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (error || !payment) {
      throw new Error(`Failed to create payment: ${error?.message}`);
    }

    return payment;
  }
}

/**
 * Export singleton instance for easy access
 */
export const testDataSeeder = new TestDataSeeder();
