import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Scorekeeper Page Object Model
 * For scorekeepers to access games via token
 */
export class ScorekeeperPage extends BasePage {
  // Token entry
  readonly tokenInput: Locator;
  readonly accessGameButton: Locator;
  readonly tokenError: Locator;

  // Game info
  readonly homeTeamName: Locator;
  readonly awayTeamName: Locator;
  readonly gameDate: Locator;
  readonly homeScore: Locator;
  readonly awayScore: Locator;

  // Scoring interface
  readonly addGoalButton: Locator;
  readonly addPenaltyButton: Locator;
  readonly selectPlayerDropdown: Locator;
  readonly selectTeamDropdown: Locator;
  readonly submitEventButton: Locator;

  // Event log
  readonly eventsList: Locator;
  readonly undoButton: Locator;

  // Submit
  readonly submitForVerificationButton: Locator;
  readonly verificationTokensModal: Locator;

  constructor(page: Page) {
    super(page, '/scorekeeper');

    // Token entry
    this.tokenInput = page.locator('input[name="token"], input[placeholder*="token" i]');
    this.accessGameButton = page.locator('button:has-text("Access Game"), button[type="submit"]');
    this.tokenError = page.locator('[role="alert"], .error-message, .text-red-500');

    // Game info
    this.homeTeamName = page.locator('[data-testid="home-team-name"]');
    this.awayTeamName = page.locator('[data-testid="away-team-name"]');
    this.gameDate = page.locator('[data-testid="game-date"]');
    this.homeScore = page.locator('[data-testid="home-score"]');
    this.awayScore = page.locator('[data-testid="away-score"]');

    // Scoring
    this.addGoalButton = page.locator('button:has-text("Goal")');
    this.addPenaltyButton = page.locator('button:has-text("Penalty")');
    this.selectPlayerDropdown = page.locator('select[name="player"], [data-testid="player-select"]');
    this.selectTeamDropdown = page.locator('select[name="team"], [data-testid="team-select"]');
    this.submitEventButton = page.locator('button:has-text("Add"), button[type="submit"]');

    // Events
    this.eventsList = page.locator('[data-testid="events-list"], .events-list');
    this.undoButton = page.locator('button:has-text("Undo")');

    // Submit
    this.submitForVerificationButton = page.locator('button:has-text("Submit for Verification")');
    this.verificationTokensModal = page.locator('[data-testid="verification-tokens-modal"]');
  }

  /**
   * Access game with token
   */
  async accessGame(token: string): Promise<void> {
    await this.tokenInput.fill(token);
    await this.accessGameButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Assert game is loaded
   */
  async assertGameLoaded(): Promise<void> {
    await expect(this.homeTeamName).toBeVisible({ timeout: 10000 });
    await expect(this.awayTeamName).toBeVisible({ timeout: 10000 });
  }

  /**
   * Assert invalid token error
   */
  async assertInvalidToken(): Promise<void> {
    await expect(this.tokenError).toBeVisible();
    await expect(this.tokenError).toContainText(/invalid|expired/i);
  }

  /**
   * Add a goal
   */
  async addGoal(teamType: 'home' | 'away', playerNumber: number): Promise<void> {
    await this.addGoalButton.click();

    // Select team
    const teamSelect = this.selectTeamDropdown;
    if (await teamSelect.isVisible({ timeout: 2000 })) {
      await teamSelect.selectOption(teamType);
    }

    // Select player by number
    const playerOption = this.page.locator(`option:has-text("#${playerNumber}")`).first();
    await playerOption.click();

    await this.submitEventButton.click();
    await this.page.waitForTimeout(500); // Wait for event to be added
  }

  /**
   * Add a penalty
   */
  async addPenalty(
    teamType: 'home' | 'away',
    playerNumber: number,
    penaltyType: string,
    minutes: number
  ): Promise<void> {
    await this.addPenaltyButton.click();

    // Select team
    const teamSelect = this.selectTeamDropdown;
    if (await teamSelect.isVisible({ timeout: 2000 })) {
      await teamSelect.selectOption(teamType);
    }

    // Select player
    const playerOption = this.page.locator(`option:has-text("#${playerNumber}")`).first();
    await playerOption.click();

    // Select penalty type
    await this.page.selectOption('select[name="penaltyType"]', penaltyType);

    // Enter minutes
    await this.page.fill('input[name="minutes"]', minutes.toString());

    await this.submitEventButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Undo last event
   */
  async undoLastEvent(): Promise<void> {
    await this.undoButton.first().click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get current score
   */
  async getScore(): Promise<{ home: number; away: number }> {
    const homeText = (await this.homeScore.textContent()) || '0';
    const awayText = (await this.awayScore.textContent()) || '0';

    return {
      home: parseInt(homeText.replace(/\D/g, '')) || 0,
      away: parseInt(awayText.replace(/\D/g, '')) || 0,
    };
  }

  /**
   * Get event count
   */
  async getEventCount(): Promise<number> {
    const events = this.page.locator('[data-testid="event-item"], .event-item');
    return events.count();
  }

  /**
   * Submit for verification
   */
  async submitForVerification(): Promise<void> {
    await this.submitForVerificationButton.click();
    await expect(this.verificationTokensModal).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get verification tokens from modal
   */
  async getVerificationTokens(): Promise<{ homeToken: string; awayToken: string }> {
    const homeTokenEl = this.page.locator('[data-testid="home-verification-token"]');
    const awayTokenEl = this.page.locator('[data-testid="away-verification-token"]');

    const homeToken = (await homeTokenEl.textContent()) || '';
    const awayToken = (await awayTokenEl.textContent()) || '';

    return { homeToken, awayToken };
  }
}

/**
 * Scorekeeper Token Entry Page
 */
export class ScorekeeperTokenPage extends BasePage {
  readonly tokenInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page, '/scorekeeper');

    this.tokenInput = page.locator('input[name="token"], input[placeholder*="token" i]');
    this.submitButton = page.locator('button:has-text("Access"), button[type="submit"]');
    this.errorMessage = page.locator('[role="alert"], .text-red-500');
  }

  async enterToken(token: string): Promise<void> {
    await this.tokenInput.fill(token);
    await this.submitButton.click();
  }

  async assertInvalidToken(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
  }

  async assertSuccess(): Promise<void> {
    await this.page.waitForURL(/\/scorekeeper\/game/, { timeout: 10000 });
  }
}
