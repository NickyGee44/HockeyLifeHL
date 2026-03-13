import { test, expect, type Browser, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TestDataSeeder } from '../fixtures/test-data';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LEAGUE_SITES_URL = process.env.LEAGUE_SITES_URL || 'http://localhost:3001';
const BUILDER_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

async function seedCookieConsent(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('cookie-consent-given', 'true');
    window.localStorage.setItem(
      'cookie-consent-preferences',
      JSON.stringify({
        essential: true,
        analytics: false,
        functional: false,
      }),
    );
  });
}

async function dismissCookieBanner(page: Page) {
  const acceptEssential = page.getByRole('button', { name: 'Accept essential cookies only' });
  if (await acceptEssential.isVisible().catch(() => false)) {
    await acceptEssential.click();
  }
}

async function loginLeagueSite(
  browser: Browser,
  leagueSlug: string,
  email: string,
  password: string,
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await seedCookieConsent(page);
  await page.goto(`${LEAGUE_SITES_URL}/${leagueSlug}`);
  await dismissCookieBanner(page);
  await page.getByTestId('league-header').getByRole('button', { name: 'Sign In' }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('form').getByRole('button', { name: 'Sign In' }).click();
  await expect(page.locator('text=Welcome Back')).toHaveCount(0, { timeout: 15000 });
  await page.reload();
  return { context, page };
}

async function loginBuilder(browser: Browser, email: string, password: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BUILDER_URL}/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /log in|login|sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  return { context, page };
}

test.describe.serial('League Sites payments and waivers', () => {
  let seeder: TestDataSeeder;
  let supabase: SupabaseClient;
  let organizerUserId: string | null = null;
  let leagueId = '';
  let leagueSlug = '';
  let seasonId = '';
  let teamId = '';
  let registrationId = '';
  let teamInvoiceId = '';
  const extraUserIds: string[] = [];
  let ownerCredentials: { email: string; password: string };
  let playerCredentials: { id: string; email: string; password: string; fullName: string };
  let captainCredentials: { id: string; email: string; password: string; fullName: string };

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables are required for payments and waivers smoke tests.');
    }

    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    seeder = new TestDataSeeder();
    const env = await seeder.seedCompleteEnvironment();
    organizerUserId = env.user.id;
    leagueId = env.league.id;
    leagueSlug = env.league.slug;
    seasonId = env.season.id;
    teamId = env.teams[0].id;
    ownerCredentials = env.user;

    playerCredentials = await seeder.createUser({
      email: 'waiver-player@hockeylife.test',
      password: 'TestPassword123!',
      fullName: 'Waiver Test Player',
    });
    captainCredentials = await seeder.createUser({
      email: 'captain-payments@hockeylife.test',
      password: 'TestPassword123!',
      fullName: 'Captain Payments User',
    });
    extraUserIds.push(playerCredentials.id, captainCredentials.id);

    const now = new Date();
    const registrationOpensAt = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const registrationClosesAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { error: seasonError } = await supabase
      .from('seasons')
      .update({
        status: 'active',
        registration_type: 'open_registration',
        registration_opens_at: registrationOpensAt,
        registration_closes_at: registrationClosesAt,
      })
      .eq('id', seasonId);

    if (seasonError) {
      throw new Error(`Failed to activate season: ${seasonError.message}`);
    }

    const { error: feeError } = await supabase.from('season_fees').insert({
      league_id: leagueId,
      season_id: seasonId,
      name: 'Season Registration',
      amount_cents: 45000,
      currency: 'cad',
      fee_basis: 'player',
      is_active: true,
      allow_full_payment: true,
      allow_two_pay: false,
      allow_three_pay: false,
      created_by: organizerUserId,
    });

    if (feeError) {
      throw new Error(`Failed to seed season fee: ${feeError.message}`);
    }

    const { error: waiverError } = await supabase.from('league_waiver_templates').insert({
      league_id: leagueId,
      title: 'League Liability Waiver',
      content: 'I agree to the terms of the league waiver.',
      version: '1',
      content_hash: `waiver-${Date.now()}`,
      is_active: true,
      created_by: organizerUserId,
    });

    if (waiverError) {
      throw new Error(`Failed to seed waiver template: ${waiverError.message}`);
    }

    const rosterRows = [
      {
        team_id: teamId,
        season_id: seasonId,
        player_id: playerCredentials.id,
        jersey_number: 18,
        position: 'Forward',
        status: 'active',
      },
      {
        team_id: teamId,
        season_id: seasonId,
        player_id: captainCredentials.id,
        jersey_number: 9,
        position: 'Defense',
        status: 'active',
        leadership_role: 'captain',
      },
    ];

    const { error: rosterError } = await supabase.from('team_rosters').insert(rosterRows);
    if (rosterError) {
      throw new Error(`Failed to seed roster: ${rosterError.message}`);
    }

    const { error: captainError } = await supabase
      .from('teams')
      .update({ captain_id: captainCredentials.id })
      .eq('id', teamId);

    if (captainError) {
      throw new Error(`Failed to assign captain: ${captainError.message}`);
    }

    const { data: registration, error: registrationError } = await supabase
      .from('registration_submissions')
      .insert({
        player_id: playerCredentials.id,
        league_id: leagueId,
        season_id: seasonId,
        team_id: teamId,
        registration_type: 'individual',
        status: 'pending',
        payment_status: 'pending',
        fee_amount_cents: 45000,
        amount_paid_cents: 0,
        currency: 'cad',
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (registrationError || !registration) {
      throw new Error(`Failed to seed player registration: ${registrationError?.message}`);
    }
    registrationId = registration.id;

    const { error: captainRegistrationError } = await supabase
      .from('registration_submissions')
      .insert({
        player_id: captainCredentials.id,
        league_id: leagueId,
        season_id: seasonId,
        team_id: teamId,
        registration_type: 'individual',
        status: 'approved',
        payment_status: 'pending',
        fee_amount_cents: 45000,
        amount_paid_cents: 0,
        currency: 'cad',
        submitted_at: new Date().toISOString(),
      });

    if (captainRegistrationError) {
      throw new Error(`Failed to seed captain registration: ${captainRegistrationError.message}`);
    }

    const { data: teamInvoice, error: teamInvoiceError } = await (supabase as any)
      .from('team_invoices')
      .insert({
        team_id: teamId,
        season_id: seasonId,
        league_id: leagueId,
        total_players: 2,
        fee_basis: 'player',
        fee_per_player_cents: 45000,
        total_amount_cents: 90000,
        amount_paid_cents: 0,
        currency: 'CAD',
        status: 'pending',
      })
      .select('id')
      .single();

    if (teamInvoiceError || !teamInvoice) {
      throw new Error(`Failed to seed team invoice: ${teamInvoiceError?.message}`);
    }
    teamInvoiceId = teamInvoice.id;
  });

  test.afterAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

    if (organizerUserId) {
      await seeder.cleanup(organizerUserId);
    }

    for (const userId of extraUserIds) {
      await supabase.auth.admin.deleteUser(userId);
    }
  });

  test('player can see pay CTA, sign waiver, and owner sees the signed waiver', async ({ browser }) => {
    test.setTimeout(180000);

    const { data: seededRegistration } = await supabase
      .from('registration_submissions')
      .select('id, fee_amount_cents, amount_paid_cents, payment_status, currency, submitted_at')
      .eq('id', registrationId)
      .single();
    console.log('[payments-waivers] seeded registration', seededRegistration);

    const playerSession = await loginLeagueSite(
      browser,
      leagueSlug,
      playerCredentials.email,
      playerCredentials.password,
    );

    await playerSession.page.goto(`${LEAGUE_SITES_URL}/${leagueSlug}/me/payments`);
    const browserDebug = await playerSession.page.evaluate(
      async ({ supabaseUrl, anonKey, targetLeagueSlug }) => {
        const storageKeys = Object.keys(window.localStorage);
        const authKey = storageKeys.find((key) => key.includes('-auth-token')) || null;
        const rawSession = authKey ? window.localStorage.getItem(authKey) : null;
        let accessToken: string | null = null;
        let playerId: string | null = null;

        if (rawSession) {
          try {
            const parsed = JSON.parse(rawSession);
            if (parsed?.access_token) {
              accessToken = parsed.access_token;
              playerId = parsed.user?.id || null;
            } else if (parsed?.currentSession?.access_token) {
              accessToken = parsed.currentSession.access_token;
              playerId = parsed.currentUser?.id || parsed.currentSession?.user?.id || null;
            } else if (Array.isArray(parsed) && parsed[0]?.access_token) {
              accessToken = parsed[0].access_token;
              playerId = parsed[0]?.user?.id || null;
            }
          } catch (error) {
            return { storageKeys, authKey, rawSession, parseError: String(error) };
          }
        }

        const headers: Record<string, string> = {
          apikey: anonKey,
          Authorization: accessToken ? `Bearer ${accessToken}` : '',
        };

        const leagueRes = await fetch(
          `${supabaseUrl}/rest/v1/leagues?slug=eq.${targetLeagueSlug}&select=id`,
          { headers },
        );
        const leagueBody = await leagueRes.text();
        let leagueRows: Array<{ id: string }> = [];
        try {
          leagueRows = JSON.parse(leagueBody);
        } catch {}

        const registrationsRes = leagueRows[0]
          ? await fetch(
              `${supabaseUrl}/rest/v1/registration_submissions?player_id=eq.${playerId || 'missing'}&league_id=eq.${leagueRows[0].id}&select=id,fee_amount_cents,amount_paid_cents,payment_status,currency`,
              { headers },
            )
          : null;

        const registrationsBody = registrationsRes ? await registrationsRes.text() : null;

        return {
          storageKeys,
          authKey,
          hasAccessToken: Boolean(accessToken),
          leagueStatus: leagueRes.status,
          leagueBody,
          registrationsStatus: registrationsRes?.status ?? null,
          registrationsBody,
        };
      },
      {
        supabaseUrl: SUPABASE_URL!,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        targetLeagueSlug: leagueSlug,
      },
    );
    console.log('[payments-waivers] browser debug', browserDebug);
    await expect(playerSession.page.getByRole('button', { name: 'Pay Online Now' })).toBeVisible({
      timeout: 20000,
    });
    await playerSession.page.getByRole('button', { name: 'Pay Online Now' }).click();
    await expect(playerSession.page.getByText('Complete Payment')).toBeVisible({ timeout: 15000 });

    await playerSession.page.goto(`${LEAGUE_SITES_URL}/${leagueSlug}/me/waivers`);
    await playerSession.page.getByRole('button', { name: /League Liability Waiver/i }).click();
    await playerSession.page.getByRole('checkbox').check();
    await playerSession.page.getByPlaceholder('Enter your full name').fill(playerCredentials.fullName);
    await playerSession.page.getByRole('button', { name: 'Sign Waiver' }).click();
    const signedWaiverRow = playerSession.page.getByRole('button', { name: /league liability waiver/i });
    await expect(signedWaiverRow).toContainText('Signed on', { timeout: 15000 });
    await expect(signedWaiverRow).toContainText('Signed');

    const { data: waiverRow } = await supabase
      .from('player_waivers')
      .select('id')
      .eq('league_id', leagueId)
      .eq('player_id', playerCredentials.id)
      .limit(1)
      .maybeSingle();
    expect(waiverRow?.id).toBeTruthy();

    const { data: registrationRow } = await supabase
      .from('registration_submissions')
      .select('waiver_id')
      .eq('id', registrationId)
      .single();
    expect(registrationRow?.waiver_id).toBeTruthy();

    await playerSession.context.close();

    const ownerSession = await loginBuilder(
      browser,
      ownerCredentials.email,
      ownerCredentials.password,
    );

    await ownerSession.page.goto(`${BUILDER_URL}/en/dashboard/leagues/${leagueId}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(ownerSession.page.getByText('Waiver Test Player')).toBeVisible({ timeout: 20000 });

    await ownerSession.page.goto(
      `${BUILDER_URL}/en/dashboard/leagues/${leagueId}/registrations/${registrationId}`,
      {
        waitUntil: 'domcontentloaded',
      },
    );
    await expect(ownerSession.page.getByText('Signed As')).toBeVisible({ timeout: 20000 });
    await expect(ownerSession.page.locator('body')).toContainText(playerCredentials.fullName, {
      timeout: 20000,
    });
    await expect(ownerSession.page.getByText('Waiver signed and accepted')).toBeVisible({
      timeout: 20000,
    });

    await ownerSession.context.close();
  });

  test('captain can record team invoice payments and offline player payments', async ({ browser }) => {
    test.setTimeout(180000);

    const captainSession = await loginLeagueSite(
      browser,
      leagueSlug,
      captainCredentials.email,
      captainCredentials.password,
    );

    await captainSession.page.goto(`${LEAGUE_SITES_URL}/${leagueSlug}/captain/fees`);
    await expect(captainSession.page.getByText('Team Fees')).toBeVisible({ timeout: 20000 });
    await captainSession.page.getByRole('button', { name: 'Record Team Payment' }).click();
    await captainSession.page.locator('input[inputmode="decimal"]').fill('300.00');
    await captainSession.page.getByRole('button', { name: 'Save Payment' }).click();
    await expect(captainSession.page.getByText('Payment History')).toBeVisible({ timeout: 20000 });
    await expect(captainSession.page.locator('body')).toContainText('$300.00', { timeout: 20000 });

    const { data: invoiceRow } = await (supabase as any)
      .from('team_invoices')
      .select('amount_paid_cents, status')
      .eq('id', teamInvoiceId)
      .single();
    expect(invoiceRow?.amount_paid_cents).toBe(30000);
    expect(invoiceRow?.status).toBe('partial');

    await captainSession.page.goto(`${LEAGUE_SITES_URL}/${leagueSlug}/captain/player-payments`);
    await expect(captainSession.page.getByText('Player Payments')).toBeVisible({ timeout: 20000 });
    const playerRow = captainSession.page.locator('tr').filter({
      has: captainSession.page.getByText('Waiver Test Player'),
    });
    await playerRow.getByRole('button', { name: 'Record' }).click();
    await captainSession.page.locator('input[inputmode="decimal"]').fill('150.00');
    await captainSession.page.getByRole('button', { name: 'Save Payment' }).click();
    await expect(playerRow.getByText('Partial')).toBeVisible({ timeout: 20000 });
    await expect(playerRow).toContainText('$150.00', { timeout: 20000 });

    const { data: playerPaymentRow } = await supabase
      .from('registration_submissions')
      .select('amount_paid_cents, payment_status')
      .eq('id', registrationId)
      .single();
    expect(playerPaymentRow?.amount_paid_cents).toBe(15000);
    expect(playerPaymentRow?.payment_status).toBe('pending');

    await captainSession.context.close();
  });
});
