import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Dashboard Page Object Model
 * Main dashboard with organizations, leagues, and quick actions
 */
export class DashboardPage extends BasePage {
  // Sidebar navigation
  readonly sidebar: Locator;
  readonly navDashboard: Locator;
  readonly navLeagues: Locator;
  readonly navAnalytics: Locator;
  readonly navSettings: Locator;
  readonly sidebarToggle: Locator;
  readonly signOutButton: Locator;

  // Main content
  readonly welcomeHeading: Locator;
  readonly statsCards: Locator;
  readonly organizationsSection: Locator;
  readonly quickActionsSection: Locator;
  readonly leaguesSection: Locator;

  // Quick action cards
  readonly createLeagueCard: Locator;
  readonly viewAnalyticsCard: Locator;
  readonly manageBillingCard: Locator;
  readonly settingsCard: Locator;

  // Organization cards
  readonly organizationCard: Locator;

  // League cards
  readonly leagueCard: Locator;

  constructor(page: Page) {
    super(page, '/dashboard');

    // Sidebar
    this.sidebar = page.locator('aside').first();
    this.navDashboard = page.locator('a:has-text("Dashboard")').first();
    this.navLeagues = page.locator('a:has-text("Teams")').first();
    this.navAnalytics = page.locator('a:has-text("Analytics")').first();
    this.navSettings = page.locator('a:has-text("Settings")').first();
    this.sidebarToggle = page.locator('button:has([class*="chevron"])');
    this.signOutButton = page.locator('a:has-text("Log out"), button:has-text("Log out")');

    // Main content
    this.welcomeHeading = page.locator('h1:has-text("Welcome")');
    this.statsCards = page.locator('[class*="grid"] > div:has([class*="text-3xl"])');
    this.organizationsSection = page.locator('section:has-text("Your Organizations"), div:has-text("Your Organizations")');
    this.quickActionsSection = page.locator('section:has-text("Quick Actions"), div:has-text("Quick Actions")');
    this.leaguesSection = page.locator('section:has-text("Your Leagues"), div:has-text("Your Leagues")');

    // Quick actions - sidebar link or card
    this.createLeagueCard = page.locator('a:has-text("Create League")').first();
    this.viewAnalyticsCard = page.locator('a:has-text("Standings"), a:has-text("Analytics")').first();
    this.manageBillingCard = page.locator('a:has-text("Billing")').first();
    this.settingsCard = page.locator('a:has-text("Settings")').first();

    // Cards
    this.organizationCard = page.locator('[class*="rounded"]:has([class*="font-bold"])');
    this.leagueCard = page.locator('a[href^="/dashboard/leagues/"]:not([href*="new"])');
  }

  /**
   * Assert dashboard is loaded
   */
  async assertDashboardLoaded(): Promise<void> {
    await expect(this.welcomeHeading).toBeVisible({ timeout: 10000 });
  }

  /**
   * Get stats card value by title
   */
  async getStatValue(statTitle: string): Promise<string> {
    const card = this.page.locator(`[class*="rounded"]:has-text("${statTitle}")`);
    const value = card.locator('[class*="text-3xl"], [class*="font-black"]').first();
    return (await value.textContent()) || '0';
  }

  /**
   * Navigate to create league
   */
  async goToCreateLeague(): Promise<void> {
    await this.createLeagueCard.click();
    await this.waitForNavigation(/\/dashboard\/leagues\/new/);
  }

  /**
   * Navigate to leagues list
   */
  async goToLeagues(): Promise<void> {
    await this.navLeagues.click();
    await this.waitForNavigation(/\/dashboard\/leagues$/);
  }

  /**
   * Navigate to analytics
   */
  async goToAnalytics(): Promise<void> {
    await this.navAnalytics.click();
    await this.waitForNavigation(/\/dashboard\/analytics/);
  }

  /**
   * Navigate to settings
   */
  async goToSettings(): Promise<void> {
    await this.navSettings.click();
    await this.waitForNavigation(/\/dashboard\/settings/);
  }

  /**
   * Click on a specific league
   */
  async openLeague(leagueName: string): Promise<void> {
    const league = this.page.locator(`a:has-text("${leagueName}")`).first();
    await league.click();
    await this.waitForNavigation(/\/dashboard\/leagues\/[^/]+$/);
  }

  /**
   * Get organization count
   */
  async getOrganizationCount(): Promise<number> {
    return this.statsCards.filter({ hasText: 'Organizations' }).count();
  }

  /**
   * Get league count by counting actual league cards/links
   */
  async getLeagueCount(): Promise<number> {
    // Count league cards - links to /[locale]/dashboard/leagues/[id] (excluding /new)
    // The href includes locale prefix, so we use contains (*=) and exclude "new" and "/leagues$" (the listing page itself)
    const leagueLinks = this.page.locator('a[href*="/dashboard/leagues/"]:not([href*="new"]):not([href$="/leagues"])');
    return leagueLinks.count();
  }

  /**
   * Check if sidebar is collapsed
   */
  async isSidebarCollapsed(): Promise<boolean> {
    const sidebarWidth = await this.sidebar.evaluate((el) => el.offsetWidth);
    return sidebarWidth < 100;
  }

  /**
   * Toggle sidebar
   */
  async toggleSidebar(): Promise<void> {
    await this.sidebarToggle.click();
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await this.signOutButton.click();
    await this.waitForNavigation(/\/(login|$)/);
  }
}

/**
 * Settings Page Object Model
 */
export class SettingsPage extends BasePage {
  // Navigation
  readonly backToDashboard: Locator;
  readonly navProfile: Locator;
  readonly navMembers: Locator;
  readonly navSubscription: Locator;
  readonly navBilling: Locator;
  readonly navBranding: Locator;
  readonly navPrivacy: Locator;
  readonly navNotifications: Locator;

  // Profile section
  readonly organizationNameInput: Locator;
  readonly organizationSlugInput: Locator;
  readonly saveButton: Locator;
  readonly organizationIdCode: Locator;

  // Danger zone
  readonly deleteOrgButton: Locator;

  constructor(page: Page) {
    super(page, '/dashboard/settings');

    // Navigation
    this.backToDashboard = page.locator('a:has-text("Back to Dashboard")');
    this.navProfile = page.locator('a[href="/dashboard/settings"]:has-text("Profile")');
    this.navMembers = page.locator('a[href="/dashboard/settings/members"]');
    this.navSubscription = page.locator('a[href*="/dashboard/settings/subscription"]');
    this.navBilling = page.locator('a[href*="/dashboard/settings/billing"]');
    this.navBranding = page.locator('a[href="/dashboard/settings/branding"]');
    this.navPrivacy = page.locator('a[href="/dashboard/settings/privacy"]');
    this.navNotifications = page.locator('a[href="/dashboard/settings/notifications"]');

    // Profile
    this.organizationNameInput = page.locator('input[name="name"]');
    this.organizationSlugInput = page.locator('input[name="slug"]');
    this.saveButton = page.locator('button[type="submit"], button:has-text("Save")');
    this.organizationIdCode = page.locator('code');

    // Danger zone
    this.deleteOrgButton = page.locator('button:has-text("Delete Organization")');
  }

  /**
   * Update organization profile
   */
  async updateProfile(data: { name?: string; slug?: string }): Promise<void> {
    if (data.name) {
      await this.organizationNameInput.fill(data.name);
    }
    if (data.slug) {
      await this.organizationSlugInput.fill(data.slug);
    }
    await this.saveButton.click();
    await this.waitForSuccessToast();
  }

  /**
   * Navigate to team members
   */
  async goToMembers(): Promise<void> {
    await this.navMembers.click();
    await this.waitForNavigation(/\/dashboard\/settings\/members/);
  }

  /**
   * Navigate to subscription
   */
  async goToSubscription(): Promise<void> {
    await this.navSubscription.click();
    await this.waitForNavigation(/\/dashboard\/settings\/subscription/);
  }

  /**
   * Navigate to billing
   */
  async goToBilling(): Promise<void> {
    await this.navBilling.click();
    await this.waitForNavigation(/\/dashboard\/settings\/billing/);
  }

  /**
   * Get organization ID
   */
  async getOrganizationId(): Promise<string> {
    return (await this.organizationIdCode.textContent()) || '';
  }
}
