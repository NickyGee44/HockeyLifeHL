import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Team Dashboard Page Object Model
 * For team captains to manage their team
 */
export class TeamDashboardPage extends BasePage {
  // Navigation
  readonly rosterTab: Locator;
  readonly scheduleTab: Locator;
  readonly statsTab: Locator;

  // Roster management
  readonly addPlayerButton: Locator;
  readonly playerList: Locator;
  readonly removePlayerButton: Locator;
  readonly joinRequestsSection: Locator;
  readonly approveRequestButton: Locator;
  readonly denyRequestButton: Locator;

  // Stats verification
  readonly gamesList: Locator;
  readonly verifyStatsButton: Locator;
  readonly gameStatsCard: Locator;

  // Team info
  readonly teamName: Locator;
  readonly captainBadge: Locator;

  constructor(page: Page, teamId?: string) {
    super(page, teamId ? `/dashboard/teams/${teamId}` : '/dashboard/teams');

    // Tabs
    this.rosterTab = page.locator('button:has-text("Roster"), a:has-text("Roster")');
    this.scheduleTab = page.locator('button:has-text("Schedule"), a:has-text("Schedule")');
    this.statsTab = page.locator('button:has-text("Stats"), a:has-text("Stats")');

    // Roster
    this.addPlayerButton = page.locator('button:has-text("Add Player"), button:has-text("Invite Player")');
    this.playerList = page.locator('[data-testid="player-list"], .player-list');
    this.removePlayerButton = page.locator('button:has-text("Remove")');
    this.joinRequestsSection = page.locator('[data-testid="join-requests"], section:has-text("Join Requests")');
    this.approveRequestButton = page.locator('button:has-text("Approve")');
    this.denyRequestButton = page.locator('button:has-text("Deny"), button:has-text("Decline")');

    // Stats
    this.gamesList = page.locator('[data-testid="games-list"]');
    this.verifyStatsButton = page.locator('button:has-text("Verify Stats"), button:has-text("Verify")');
    this.gameStatsCard = page.locator('[data-testid="game-stats"]');

    // Info
    this.teamName = page.locator('h1, [data-testid="team-name"]');
    this.captainBadge = page.locator(':has-text("Captain")');
  }

  /**
   * Assert team dashboard is accessible
   */
  async assertDashboardLoaded(): Promise<void> {
    await expect(this.teamName).toBeVisible({ timeout: 10000 });
  }

  /**
   * Assert user is captain
   */
  async assertIsCaptain(): Promise<void> {
    await expect(this.captainBadge).toBeVisible();
  }

  /**
   * Navigate to roster tab
   */
  async goToRoster(): Promise<void> {
    await this.rosterTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Approve a join request
   */
  async approveJoinRequest(playerName: string): Promise<void> {
    const requestRow = this.page.locator(`tr:has-text("${playerName}"), div:has-text("${playerName}")`);
    const approveBtn = requestRow.locator('button:has-text("Approve")').first();
    await approveBtn.click();
    await this.waitForSuccessToast();
  }

  /**
   * Add player to roster
   */
  async addPlayer(playerEmail: string): Promise<void> {
    await this.addPlayerButton.click();
    await this.page.fill('input[type="email"], input[name="email"]', playerEmail);
    await this.page.locator('button[type="submit"]').click();
    await this.waitForSuccessToast();
  }

  /**
   * Remove player from roster
   */
  async removePlayer(playerName: string): Promise<void> {
    const playerRow = this.page.locator(`tr:has-text("${playerName}"), div:has-text("${playerName}")`);
    const removeBtn = playerRow.locator('button:has-text("Remove")').first();
    await removeBtn.click();

    // Confirm deletion if modal appears
    const confirmBtn = this.page.locator('button:has-text("Confirm"), button:has-text("Remove")').last();
    if (await confirmBtn.isVisible({ timeout: 2000 })) {
      await confirmBtn.click();
    }

    await this.waitForSuccessToast();
  }

  /**
   * Verify game stats
   */
  async verifyGameStats(gameId: string): Promise<void> {
    const gameCard = this.page.locator(`[data-game-id="${gameId}"]`).first();
    const verifyBtn = gameCard.locator('button:has-text("Verify")').first();
    await verifyBtn.click();
    await this.waitForSuccessToast('Verified');
  }

  /**
   * Get player count
   */
  async getPlayerCount(): Promise<number> {
    const players = this.page.locator('[data-testid="player-row"], .player-row');
    return players.count();
  }

  /**
   * Check if player exists in roster
   */
  async hasPlayer(playerName: string): Promise<boolean> {
    const player = this.page.locator(`text=${playerName}`);
    return player.isVisible();
  }

  /**
   * Get pending join requests count
   */
  async getPendingRequestsCount(): Promise<number> {
    const requests = this.page.locator('[data-testid="join-request"], .join-request');
    return requests.count();
  }
}
