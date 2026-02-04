import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * League Creation Wizard Page Object Model
 * Multi-step wizard for creating leagues
 */
export class LeagueWizardPage extends BasePage {
  // Navigation
  readonly progressBar: Locator;
  readonly stepIndicators: Locator;
  readonly nextButton: Locator;
  readonly previousButton: Locator;
  readonly submitButton: Locator;
  readonly discardButton: Locator;
  readonly savingIndicator: Locator;

  // Step 1: League Info
  readonly leagueNameInput: Locator;
  readonly descriptionInput: Locator;
  readonly cityInput: Locator;
  readonly stateProvinceInput: Locator;
  readonly countrySelect: Locator;
  readonly timezoneSelect: Locator;
  readonly primaryColorInput: Locator;
  readonly secondaryColorInput: Locator;
  readonly logoUrlInput: Locator;
  readonly contactEmailInput: Locator;
  readonly contactPhoneInput: Locator;
  readonly websiteUrlInput: Locator;

  // Step 2: Season Settings
  readonly seasonNameInput: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly registrationTypeSelect: Locator;
  readonly registrationOpensInput: Locator;
  readonly registrationClosesInput: Locator;
  readonly gameDurationInput: Locator;
  readonly periodCountInput: Locator;

  // Step 3: Teams
  readonly addTeamButton: Locator;
  readonly teamNameInputs: Locator;
  readonly teamShortNameInputs: Locator;
  readonly teamColorInputs: Locator;
  readonly removeTeamButtons: Locator;

  // Step 4: Review
  readonly reviewSection: Locator;
  readonly editButtons: Locator;

  constructor(page: Page) {
    super(page, '/dashboard/leagues/new');

    // Navigation - step indicators showing "Step X of 7" (wizard has 7 steps total)
    this.progressBar = page.getByText(/Step \d of 7/);
    this.stepIndicators = page.locator(':has-text("League Info"), :has-text("Season Settings"), :has-text("Teams"), :has-text("Review")');
    this.nextButton = page.locator('button:has-text("Next")');
    this.previousButton = page.locator('button:has-text("Previous")');
    this.submitButton = page.locator('button[type="submit"]:has-text("Create League")');
    this.discardButton = page.locator('button:has-text("Discard Draft")');
    this.savingIndicator = page.locator(':has-text("Auto-saving enabled"), :has-text("Saving")');

    // Step 1: League Info - use id selectors for reliability
    this.leagueNameInput = page.locator('input#name');
    this.descriptionInput = page.locator('textarea#description');
    this.cityInput = page.locator('input#city');
    this.stateProvinceInput = page.locator('input#state_province');
    // Country and Timezone are Radix UI Select components with id attributes
    // FormField passes htmlFor as id to the SelectTrigger button
    this.countrySelect = page.locator('button#country');
    this.timezoneSelect = page.locator('button#timezone');
    this.primaryColorInput = page.locator('input#primary_color');
    this.secondaryColorInput = page.locator('input#secondary_color');
    this.logoUrlInput = page.locator('input#logo_url');
    this.contactEmailInput = page.locator('input#contact_email');
    this.contactPhoneInput = page.locator('input#contact_phone');
    this.websiteUrlInput = page.locator('input#website_url');

    // Step 2: Season Settings - use id selectors
    this.seasonNameInput = page.locator('input#season_name');
    this.startDateInput = page.locator('input#season_start_date');
    this.endDateInput = page.locator('input#season_end_date');
    // Registration Type is a Radix UI Select
    this.registrationTypeSelect = page.locator('[class*="space-y"] label:has-text("Registration Type")').locator('..').locator('button[role="combobox"]');
    this.registrationOpensInput = page.locator('input#registration_opens');
    this.registrationClosesInput = page.locator('input#registration_closes');
    this.gameDurationInput = page.locator('input#game_duration_minutes');
    this.periodCountInput = page.locator('input#period_count');

    // Step 3: Teams
    this.addTeamButton = page.locator('button:has-text("Add First Team"), button:has-text("Add Another Team")');
    // Team inputs use id="teams.{index}.{field}" pattern
    this.teamNameInputs = page.locator('input[id^="teams."][id$=".name"]');
    this.teamShortNameInputs = page.locator('input[id^="teams."][id$=".short_name"]');
    this.teamColorInputs = page.locator('input[id^="teams."][id$=".color"]');
    this.removeTeamButtons = page.locator('button:has(svg.text-destructive)');

    // Step 7: Review (the final step)
    this.reviewSection = page.locator('[class*="review"], [data-step="7"]');
    this.editButtons = page.locator('button:has-text("Edit")');
  }

  /**
   * Get current step number from page content
   */
  async getCurrentStep(): Promise<number> {
    // Look for "Step X of 7" text
    const stepText = await this.progressBar.textContent();
    const match = stepText?.match(/Step (\d) of/);
    return match ? parseInt(match[1], 10) : 1;
  }

  /**
   * Discard any existing draft to start fresh
   * Call this at the beginning of tests that need isolation
   */
  async discardDraftIfExists(): Promise<void> {
    // The discard button only appears on step 1
    // If we're not on step 1, navigate there first
    const currentUrl = this.page.url();
    if (currentUrl.includes('step=') && !currentUrl.includes('step=1')) {
      // Navigate to step 1 to access the discard button
      const baseUrl = currentUrl.split('?')[0];
      await this.page.goto(baseUrl);
      await this.waitForPageLoad();
    }

    // Wait a moment for the form to hydrate with any draft data
    await this.page.waitForTimeout(500);

    // Check if "Discard Draft" button is visible
    const discardDraftButton = this.page.locator('button:has-text("Discard Draft")');

    if (await discardDraftButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Check if there's draft data loaded (form has values)
      const leagueName = await this.leagueNameInput.inputValue().catch(() => '');

      // Only discard if there's meaningful data from a previous test
      if (leagueName && leagueName.length > 0) {
        await discardDraftButton.click();
        // Wait for redirect to dashboard
        await this.page.waitForURL(/\/dashboard(?!\/leagues\/new)/, { timeout: 5000 }).catch(() => {});
        // Navigate back to wizard with a fresh start
        await this.page.goto(this.url);
        await this.waitForPageLoad();
        // Give it another moment to ensure we have a clean slate
        await this.page.waitForTimeout(300);
      }
    }
  }

  /**
   * Wait for step to load by checking the step indicator
   */
  async waitForStep(stepNumber: number): Promise<void> {
    // Wait for "Step X of 7" text to appear
    await this.page.getByText(`Step ${stepNumber} of 7`).waitFor({ state: 'visible', timeout: 10000 });
    // Also wait for any auto-save operations to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Navigate to the wizard page and ensure a fresh start
   */
  async goto(): Promise<void> {
    await super.goto();
    // Discard any existing draft to ensure test isolation
    await this.discardDraftIfExists();
  }

  /**
   * Fill Step 1: League Information
   */
  /**
   * Select an option from a Radix UI Select dropdown
   */
  private async selectOption(triggerLocator: Locator, optionText: string): Promise<void> {
    // Wait for the trigger to be visible and enabled
    await triggerLocator.waitFor({ state: 'visible', timeout: 5000 });
    await triggerLocator.click();

    // Wait for dropdown to open (check for role="listbox" or portal)
    await this.page.waitForTimeout(300);

    // Select the option - try exact match first, then contains
    const option = this.page.locator(`[role="option"]`).filter({ hasText: optionText });
    await option.first().waitFor({ state: 'visible', timeout: 5000 });
    await option.first().click();

    // Wait for dropdown to close
    await this.page.waitForTimeout(200);
  }

  async fillStep1(data: {
    name: string;
    description?: string;
    city: string;
    stateProvince: string;
    country?: string;
    timezone?: string;
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    websiteUrl?: string;
  }): Promise<void> {
    // Wait for the form to be ready
    await this.leagueNameInput.waitFor({ state: 'visible', timeout: 5000 });

    // Fill basic info
    await this.leagueNameInput.fill(data.name);

    if (data.description) {
      await this.descriptionInput.fill(data.description);
    }

    await this.cityInput.fill(data.city);
    await this.stateProvinceInput.fill(data.stateProvince);

    // Country and Timezone are Radix UI Select components
    if (data.country) {
      await this.selectOption(this.countrySelect, data.country);
    }

    if (data.timezone) {
      await this.selectOption(this.timezoneSelect, data.timezone);
    }

    // Color pickers - skip on mobile as they may not be visible
    if (data.primaryColor) {
      const isVisible = await this.primaryColorInput.isVisible().catch(() => false);
      if (isVisible) {
        await this.primaryColorInput.fill(data.primaryColor);
      }
    }

    if (data.secondaryColor) {
      const isVisible = await this.secondaryColorInput.isVisible().catch(() => false);
      if (isVisible) {
        await this.secondaryColorInput.fill(data.secondaryColor);
      }
    }

    if (data.logoUrl) {
      await this.logoUrlInput.fill(data.logoUrl);
    }

    if (data.contactEmail) {
      await this.contactEmailInput.fill(data.contactEmail);
    }

    if (data.contactPhone) {
      await this.contactPhoneInput.fill(data.contactPhone);
    }

    if (data.websiteUrl) {
      await this.websiteUrlInput.fill(data.websiteUrl);
    }

    // Wait a bit for form validation and auto-save
    await this.page.waitForTimeout(500);
  }

  /**
   * Fill Step 2: Season Settings
   */
  async fillStep2(data: {
    seasonName: string;
    startDate: string;
    endDate: string;
    registrationType?: string;
    registrationOpens?: string;
    registrationCloses?: string;
    gameDuration?: number;
    periodCount?: number;
  }): Promise<void> {
    // Wait for the form to be ready
    await this.seasonNameInput.waitFor({ state: 'visible', timeout: 5000 });

    await this.seasonNameInput.fill(data.seasonName);
    await this.startDateInput.fill(data.startDate);
    await this.endDateInput.fill(data.endDate);

    // Registration Type is a Radix UI Select component
    if (data.registrationType) {
      await this.selectOption(this.registrationTypeSelect, data.registrationType);
    }

    if (data.registrationOpens) {
      await this.registrationOpensInput.fill(data.registrationOpens);
    }

    if (data.registrationCloses) {
      await this.registrationClosesInput.fill(data.registrationCloses);
    }

    if (data.gameDuration) {
      await this.gameDurationInput.fill(data.gameDuration.toString());
    }

    if (data.periodCount) {
      await this.periodCountInput.fill(data.periodCount.toString());
    }

    // Wait a bit for form validation
    await this.page.waitForTimeout(500);
  }

  /**
   * Add a team in Step 3
   */
  async addTeam(data: { name: string; shortName?: string; color?: string }): Promise<void> {
    // Get current team count before adding
    const currentCount = await this.teamNameInputs.count();

    await this.addTeamButton.first().click();

    // Wait for the new team input to appear
    await this.teamNameInputs.nth(currentCount).waitFor({ state: 'visible', timeout: 5000 });

    // The new team is at index = currentCount (0-indexed)
    const teamIndex = currentCount;

    await this.teamNameInputs.nth(teamIndex).fill(data.name);

    if (data.shortName) {
      await this.teamShortNameInputs.nth(teamIndex).fill(data.shortName);
    }

    // Color picker - skip on mobile as it may not be visible
    if (data.color) {
      const colorInput = this.teamColorInputs.nth(teamIndex);
      const isVisible = await colorInput.isVisible().catch(() => false);
      if (isVisible) {
        await colorInput.fill(data.color);
      }
    }
  }

  /**
   * Fill Step 3: Teams (multiple teams)
   */
  async fillStep3(
    teams: Array<{ name: string; shortName?: string; color?: string }>
  ): Promise<void> {
    for (const team of teams) {
      await this.addTeam(team);
    }
  }

  /**
   * Go to next step
   */
  async goToNextStep(): Promise<void> {
    const currentStep = await this.getCurrentStep();

    // Wait for next button to be enabled
    await this.nextButton.waitFor({ state: 'visible', timeout: 5000 });

    // Click and wait for navigation
    await this.nextButton.click();

    // Wait for the next step to load
    await this.waitForStep(currentStep + 1);
  }

  /**
   * Go to previous step
   */
  async goToPreviousStep(): Promise<void> {
    const currentStep = await this.getCurrentStep();

    // Wait for previous button to be enabled
    await this.previousButton.waitFor({ state: 'visible', timeout: 5000 });

    // Click and wait for navigation
    await this.previousButton.click();

    // Wait for the previous step to load
    await this.waitForStep(currentStep - 1);
  }

  /**
   * Submit the wizard (Step 7)
   */
  async submitWizard(): Promise<void> {
    // Wait for submit button to be visible and enabled
    await this.submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.submitButton.click();

    // Wait a moment for submission to start
    await this.page.waitForTimeout(1000);
  }

  /**
   * Complete the entire wizard
   */
  async completeWizard(data: {
    step1: Parameters<typeof this.fillStep1>[0];
    step2: Parameters<typeof this.fillStep2>[0];
    step3?: Parameters<typeof this.fillStep3>[0];
  }): Promise<void> {
    // Step 1: League Info
    await this.fillStep1(data.step1);
    await this.goToNextStep();

    // Step 2: Season Settings
    await this.fillStep2(data.step2);
    await this.goToNextStep();

    // Step 3: Teams (optional)
    if (data.step3 && data.step3.length > 0) {
      await this.fillStep3(data.step3);
    }
    await this.goToNextStep();

    // Step 4: Registration Fees - skip by going to next step
    await this.goToNextStep();

    // Step 5: Payment Setup - skip by going to next step
    await this.goToNextStep();

    // Step 6: Website & Branding - skip by going to next step
    await this.goToNextStep();

    // Step 7: Review & Submit
    await this.submitWizard();

    // Wait for redirect to dashboard or success page (extended timeout for league creation)
    // The server needs to create the league, season, teams, and redirect
    await this.page.waitForURL(/\/dashboard/, { timeout: 30000 });
  }

  /**
   * Verify we're on review step and data matches
   */
  async verifyReviewStep(expectedData: {
    leagueName: string;
    seasonName: string;
    teamCount?: number;
  }): Promise<void> {
    await expect(this.reviewSection).toBeVisible();
    await expect(this.page.locator(`text=${expectedData.leagueName}`)).toBeVisible();
    await expect(this.page.locator(`text=${expectedData.seasonName}`)).toBeVisible();

    if (expectedData.teamCount !== undefined) {
      // Verify team count
      const teamCountText = await this.page.locator(':has-text("team")').textContent();
      expect(teamCountText).toContain(expectedData.teamCount.toString());
    }
  }
}
