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

    // Navigation - step indicators showing "Step X of 4"
    this.progressBar = page.getByText(/Step \d of 4/);
    this.stepIndicators = page.locator(':has-text("League Info"), :has-text("Season Settings"), :has-text("Teams"), :has-text("Review")');
    this.nextButton = page.locator('button:has-text("Next Step"), button:has-text("Next"), button:has-text("Continue")');
    this.previousButton = page.locator('button:has-text("Previous"), button:has-text("Back")');
    this.submitButton = page.locator('button:has-text("Create League"), button:has-text("Submit"), button[type="submit"]');
    this.discardButton = page.locator('button:has-text("Discard Draft")');
    this.savingIndicator = page.locator(':has-text("Auto-saving enabled"), :has-text("Saving")');

    // Step 1: League Info
    this.leagueNameInput = page.locator('input[name="name"]');
    this.descriptionInput = page.locator('textarea[name="description"], textarea').first();
    this.cityInput = page.locator('input[name="city"]');
    this.stateProvinceInput = page.locator('input[name="state_province"]');
    // Country and Timezone are Radix UI Select components - use trigger buttons
    this.countrySelect = page.locator('button[role="combobox"]:near(:text("Country"))').first();
    this.timezoneSelect = page.locator('button[role="combobox"]:near(:text("Timezone"))').first();
    this.primaryColorInput = page.locator('input[name="primary_color"]');
    this.secondaryColorInput = page.locator('input[name="secondary_color"]');
    this.logoUrlInput = page.locator('input[name="logo_url"]');
    this.contactEmailInput = page.locator('input[name="contact_email"]');
    this.contactPhoneInput = page.locator('input[name="contact_phone"]');
    this.websiteUrlInput = page.locator('input[name="website_url"]');

    // Step 2: Season Settings
    this.seasonNameInput = page.locator('input[name="season_name"]');
    this.startDateInput = page.locator('input[name="season_start_date"]');
    this.endDateInput = page.locator('input[name="season_end_date"]');
    // Registration Type is a Radix UI Select
    this.registrationTypeSelect = page.locator('button[role="combobox"]:near(:text("Registration Type"))').first();
    this.registrationOpensInput = page.locator('input[name="registration_opens"]');
    this.registrationClosesInput = page.locator('input[name="registration_closes"]');
    this.gameDurationInput = page.locator('input[name="game_duration_minutes"]');
    this.periodCountInput = page.locator('input[name="period_count"]');

    // Step 3: Teams
    this.addTeamButton = page.locator('button:has-text("Add First Team"), button:has-text("Add Team"), button:has-text("Add Another Team")');
    // Team inputs use id="teams.{index}.{field}" pattern
    this.teamNameInputs = page.locator('input[id^="teams."][id$=".name"]');
    this.teamShortNameInputs = page.locator('input[id^="teams."][id$=".short_name"]');
    this.teamColorInputs = page.locator('input[id^="teams."][id$=".color"]');
    this.removeTeamButtons = page.locator('button:has(svg.text-destructive), button:has-text("Remove")');

    // Step 4: Review
    this.reviewSection = page.locator('[class*="review"], [data-step="4"]');
    this.editButtons = page.locator('button:has-text("Edit")');
  }

  /**
   * Get current step number from page content
   */
  async getCurrentStep(): Promise<number> {
    // Look for "Step X of 4" text
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
    // Wait for "Step X of 4" text to appear
    await this.page.getByText(`Step ${stepNumber} of 4`).waitFor({ state: 'visible', timeout: 10000 });
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
    await triggerLocator.click();
    // Wait for dropdown to open and select the option
    await this.page.locator(`[role="option"]:has-text("${optionText}")`).first().click();
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

    if (data.primaryColor) {
      await this.primaryColorInput.fill(data.primaryColor);
    }

    if (data.secondaryColor) {
      await this.secondaryColorInput.fill(data.secondaryColor);
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

    if (data.color) {
      await this.teamColorInputs.nth(teamIndex).fill(data.color);
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
    await this.nextButton.click();
    await this.waitForStep(currentStep + 1);
  }

  /**
   * Go to previous step
   */
  async goToPreviousStep(): Promise<void> {
    const currentStep = await this.getCurrentStep();
    await this.previousButton.click();
    await this.waitForStep(currentStep - 1);
  }

  /**
   * Submit the wizard (Step 4)
   */
  async submitWizard(): Promise<void> {
    await this.submitButton.click();
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

    // Step 4: Review & Submit
    await this.submitWizard();

    // Wait for redirect to dashboard (the primary success indicator)
    // Note: The success toast may have already dismissed by this point,
    // so we wait for navigation instead of the toast
    await this.waitForNavigation(/\/dashboard(?!\/leagues\/new)/);
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
