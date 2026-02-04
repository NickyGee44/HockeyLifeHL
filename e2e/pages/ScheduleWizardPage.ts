import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Schedule Generation Wizard Page Object Model
 */
export class ScheduleWizardPage extends BasePage {
  // Wizard steps
  readonly stepIndicator: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly generateButton: Locator;

  // Schedule configuration
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly gamesPerTeamInput: Locator;
  readonly gamesPerWeekInput: Locator;
  readonly preferredDaysCheckboxes: Locator;
  readonly preferredTimeInput: Locator;
  readonly venueSelect: Locator;

  // Advanced options
  readonly advancedOptionsToggle: Locator;
  readonly avoidBackToBackCheckbox: Locator;
  readonly balanceHomeAwayCheckbox: Locator;
  readonly minimumRestDaysInput: Locator;

  // Preview
  readonly schedulePreview: Locator;
  readonly gamesList: Locator;
  readonly conflictWarnings: Locator;

  // Generation status
  readonly generationProgress: Locator;
  readonly generationStatus: Locator;
  readonly errorMessage: Locator;
  readonly saveScheduleButton: Locator;

  constructor(page: Page, seasonId?: string) {
    super(page, seasonId ? `/dashboard/seasons/${seasonId}/schedule/new` : '/dashboard/schedule/new');

    // Navigation
    this.stepIndicator = page.locator('[data-testid="step-indicator"]');
    this.nextButton = page.locator('button:has-text("Next")');
    this.backButton = page.locator('button:has-text("Back")');
    this.generateButton = page.locator('button:has-text("Generate Schedule")');

    // Configuration
    this.startDateInput = page.locator('input[name="startDate"]');
    this.endDateInput = page.locator('input[name="endDate"]');
    this.gamesPerTeamInput = page.locator('input[name="gamesPerTeam"]');
    this.gamesPerWeekInput = page.locator('input[name="gamesPerWeek"]');
    this.preferredDaysCheckboxes = page.locator('input[type="checkbox"][name*="day"]');
    this.preferredTimeInput = page.locator('input[name="preferredTime"]');
    this.venueSelect = page.locator('select[name="venue"]');

    // Advanced
    this.advancedOptionsToggle = page.locator('button:has-text("Advanced Options")');
    this.avoidBackToBackCheckbox = page.locator('input[name="avoidBackToBack"]');
    this.balanceHomeAwayCheckbox = page.locator('input[name="balanceHomeAway"]');
    this.minimumRestDaysInput = page.locator('input[name="minimumRestDays"]');

    // Preview
    this.schedulePreview = page.locator('[data-testid="schedule-preview"]');
    this.gamesList = page.locator('[data-testid="games-list"]');
    this.conflictWarnings = page.locator('[data-testid="conflict-warnings"]');

    // Status
    this.generationProgress = page.locator('[role="progressbar"]');
    this.generationStatus = page.locator('[data-testid="generation-status"]');
    this.errorMessage = page.locator('[role="alert"], .error-message');
    this.saveScheduleButton = page.locator('button:has-text("Save Schedule")');
  }

  /**
   * Configure basic schedule settings
   */
  async configureSchedule(config: {
    startDate: string;
    endDate: string;
    gamesPerTeam: number;
    gamesPerWeek?: number;
    preferredDays?: string[];
    preferredTime?: string;
  }): Promise<void> {
    await this.startDateInput.fill(config.startDate);
    await this.endDateInput.fill(config.endDate);
    await this.gamesPerTeamInput.fill(config.gamesPerTeam.toString());

    if (config.gamesPerWeek) {
      await this.gamesPerWeekInput.fill(config.gamesPerWeek.toString());
    }

    if (config.preferredDays) {
      for (const day of config.preferredDays) {
        const checkbox = this.page.locator(`input[value="${day}"]`);
        await checkbox.check();
      }
    }

    if (config.preferredTime) {
      await this.preferredTimeInput.fill(config.preferredTime);
    }
  }

  /**
   * Configure advanced options
   */
  async configureAdvancedOptions(options: {
    avoidBackToBack?: boolean;
    balanceHomeAway?: boolean;
    minimumRestDays?: number;
  }): Promise<void> {
    // Expand advanced options if collapsed
    if (!(await this.avoidBackToBackCheckbox.isVisible({ timeout: 2000 }))) {
      await this.advancedOptionsToggle.click();
    }

    if (options.avoidBackToBack !== undefined) {
      await this.avoidBackToBackCheckbox.setChecked(options.avoidBackToBack);
    }

    if (options.balanceHomeAway !== undefined) {
      await this.balanceHomeAwayCheckbox.setChecked(options.balanceHomeAway);
    }

    if (options.minimumRestDays !== undefined) {
      await this.minimumRestDaysInput.fill(options.minimumRestDays.toString());
    }
  }

  /**
   * Generate schedule
   */
  async generateSchedule(): Promise<void> {
    await this.generateButton.click();

    // Wait for generation to complete
    await expect(this.generationProgress).toBeVisible({ timeout: 5000 });
    await expect(this.generationProgress).not.toBeVisible({ timeout: 60000 });
  }

  /**
   * Assert schedule generated successfully
   */
  async assertScheduleGenerated(): Promise<void> {
    await expect(this.schedulePreview).toBeVisible({ timeout: 10000 });
    await expect(this.gamesList).toBeVisible();

    // Should have at least one game
    const gamesCount = await this.getGeneratedGamesCount();
    expect(gamesCount).toBeGreaterThan(0);
  }

  /**
   * Assert generation failed
   */
  async assertGenerationFailed(expectedError?: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible({ timeout: 10000 });

    if (expectedError) {
      await expect(this.errorMessage).toContainText(expectedError);
    }
  }

  /**
   * Get generated games count
   */
  async getGeneratedGamesCount(): Promise<number> {
    const games = this.page.locator('[data-testid="game-row"], .game-row');
    return games.count();
  }

  /**
   * Check for conflicts
   */
  async hasConflicts(): Promise<boolean> {
    const warnings = await this.conflictWarnings.count();
    return warnings > 0;
  }

  /**
   * Get conflict warnings
   */
  async getConflictWarnings(): Promise<string[]> {
    const warnings = await this.conflictWarnings.allTextContents();
    return warnings;
  }

  /**
   * Save schedule
   */
  async saveSchedule(): Promise<void> {
    await this.saveScheduleButton.click();
    await this.waitForSuccessToast('saved');
    await this.page.waitForURL(/\/dashboard\/seasons\/[^/]+$/, { timeout: 10000 });
  }

  /**
   * Complete schedule generation flow
   */
  async completeScheduleGeneration(config: {
    startDate: string;
    endDate: string;
    gamesPerTeam: number;
    gamesPerWeek?: number;
    preferredDays?: string[];
    avoidBackToBack?: boolean;
    balanceHomeAway?: boolean;
  }): Promise<void> {
    await this.configureSchedule(config);

    if (config.avoidBackToBack !== undefined || config.balanceHomeAway !== undefined) {
      await this.configureAdvancedOptions({
        avoidBackToBack: config.avoidBackToBack,
        balanceHomeAway: config.balanceHomeAway,
      });
    }

    await this.generateSchedule();
    await this.assertScheduleGenerated();
    await this.saveSchedule();
  }

  /**
   * Get current step
   */
  async getCurrentStep(): Promise<number> {
    const stepText = await this.stepIndicator.textContent();
    const match = stepText?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }
}
