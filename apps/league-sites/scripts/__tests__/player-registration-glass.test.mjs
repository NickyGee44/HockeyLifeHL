import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const LEAGUE_SITES_ROOT = path.resolve(TEST_DIR, '../..');

const routeSources = [
  'src/app/[leagueSlug]/checkin/page.tsx',
  'src/app/[leagueSlug]/me/page.tsx',
  'src/app/[leagueSlug]/me/notifications/page.tsx',
  'src/app/[leagueSlug]/me/profile/page.tsx',
  'src/app/[leagueSlug]/me/payments/page.tsx',
  'src/app/[leagueSlug]/me/waivers/page.tsx',
  'src/app/[leagueSlug]/register/page.tsx',
  'src/app/[leagueSlug]/register/team/page.tsx',
  'src/app/[leagueSlug]/goalies/register/page.tsx',
  'src/app/[leagueSlug]/goalies/register/confirmation/page.tsx',
  'src/app/[leagueSlug]/goalies/accept/[token]/page.tsx',
];

const surfaceSources = [
  ...routeSources.filter(
    (source) =>
      !source.endsWith('/me/page.tsx') &&
      !source.endsWith('/goalies/register/page.tsx')
  ),
  'src/components/dashboard/MyRecentResults.tsx',
  'src/components/dashboard/MyStats.tsx',
  'src/components/dashboard/MySubInvitations.tsx',
  'src/components/dashboard/MyTeamCard.tsx',
  'src/components/dashboard/MyUpcomingGames.tsx',
  'src/components/dashboard/QuickActions.tsx',
  'src/components/dashboard/WeekGroupedGames.tsx',
  'src/components/profile/PhotoUpload.tsx',
  'src/components/payments/EmbeddedCheckout.tsx',
  'src/components/payments/PaymentModal.tsx',
  'src/components/registration/RegistrationWizard.tsx',
  'src/components/registration/StepConfirmation.tsx',
  'src/components/registration/StepLeaguePreferences.tsx',
  'src/components/registration/StepPayment.tsx',
  'src/components/registration/StepPersonalInfo.tsx',
  'src/components/registration/StepSkillPosition.tsx',
  'src/components/registration/StepWaiver.tsx',
  'src/components/registration/TeamRegistrationForm.tsx',
  'src/components/registration/WaiverDocumentPanel.tsx',
  'src/components/goalies/GoalieRegistrationForm.tsx',
  'src/components/checkin/CheckinReminderBanner.tsx',
  'src/components/push/PushNotificationSettingsRow.tsx',
  'src/components/push/PushSubscriptionPrompt.tsx',
  'src/components/push/TeamPushToggle.tsx',
];

const strongSurfaceSources = [
  'src/app/[leagueSlug]/checkin/page.tsx',
  'src/app/[leagueSlug]/me/notifications/page.tsx',
  'src/app/[leagueSlug]/me/profile/page.tsx',
  'src/app/[leagueSlug]/me/payments/page.tsx',
  'src/app/[leagueSlug]/me/waivers/page.tsx',
  'src/app/[leagueSlug]/register/page.tsx',
  'src/app/[leagueSlug]/register/team/page.tsx',
  'src/app/[leagueSlug]/goalies/accept/[token]/page.tsx',
  'src/components/profile/PhotoUpload.tsx',
  'src/components/payments/EmbeddedCheckout.tsx',
  'src/components/payments/PaymentModal.tsx',
  'src/components/registration/RegistrationWizard.tsx',
  'src/components/registration/StepPayment.tsx',
  'src/components/registration/StepWaiver.tsx',
  'src/components/registration/TeamRegistrationForm.tsx',
  'src/components/goalies/GoalieRegistrationForm.tsx',
  'src/components/push/PushNotificationSettingsRow.tsx',
];

const documentedOpaqueExceptions = new Map([
  [
    'src/components/payments/PaymentModal.tsx',
    [
      { token: 'bg-black/70', reason: 'modal scrim keeps the Stripe payment task readable' },
    ],
  ],
  [
    'src/components/profile/PhotoUpload.tsx',
    [
      { token: 'bg-black/50', reason: 'image-hover affordance needs contrast over arbitrary photos' },
      { token: 'bg-black/60', reason: 'upload progress must remain legible over arbitrary photos' },
    ],
  ],
  [
    'src/components/registration/WaiverDocumentPanel.tsx',
    [
      { token: 'bg-white', reason: 'provider PDF and image previews retain a paper-white canvas' },
    ],
  ],
]);

async function read(relativePath) {
  return readFile(path.join(LEAGUE_SITES_ROOT, relativePath), 'utf8');
}

test('player, registration, check-in, and goalie routes are real production pages', async () => {
  for (const sourcePath of routeSources) {
    const source = await read(sourcePath);
    assert.doesNotMatch(source, /\bRebuildRoute\b/, `${sourcePath} is still a rebuild placeholder`);
    assert.match(source, /export\s+default\s+(?:async\s+)?function|export\s+default\s+\w+/, `${sourcePath} has no default page export`);
  }
});

test('assigned Configure and Operate surfaces use the shared glass vocabulary', async () => {
  for (const sourcePath of surfaceSources) {
    const source = await read(sourcePath);
    assert.match(
      source,
      /\b(?:glass-card(?:-strong)?|glass-control)\b/,
      `${sourcePath} does not use a shared glass surface`
    );
  }

  for (const sourcePath of strongSurfaceSources) {
    const source = await read(sourcePath);
    assert.match(source, /\bglass-card-strong\b/, `${sourcePath} needs a readable strong-glass task surface`);
  }
});

test('assigned surfaces remove opaque neutral cards and form controls except documented cases', async () => {
  const violations = [];
  const opaqueNeutral = /\bbg-\[var\(--color-(?:surface|background)\)\](?!\/)|\bbg-(?:white|black|slate|gray|zinc|neutral|stone)(?:-\d{2,3})?(?:\/\d+)?\b/g;

  for (const sourcePath of surfaceSources) {
    const source = await read(sourcePath);
    const exceptions = documentedOpaqueExceptions.get(sourcePath) ?? [];

    for (const match of source.matchAll(opaqueNeutral)) {
      const token = match[0];
      if (!exceptions.some((exception) => exception.token === token)) {
        const line = source.slice(0, match.index).split('\n').length;
        violations.push(`${sourcePath}:${line} ${token}`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Opaque neutral surfaces must become shared glass or a documented exception:\n${violations.join('\n')}`
  );
});

test('task forms expose glass controls and explicit 44px control sizing', async () => {
  for (const sourcePath of [
    'src/app/[leagueSlug]/me/profile/page.tsx',
    'src/app/[leagueSlug]/me/waivers/page.tsx',
    'src/components/registration/RegistrationWizard.tsx',
    'src/components/registration/TeamRegistrationForm.tsx',
    'src/components/goalies/GoalieRegistrationForm.tsx',
  ]) {
    const source = await read(sourcePath);
    assert.match(source, /\bglass-control\b/, `${sourcePath} needs shared glass controls`);
    assert.match(source, /\bmin-h-11\b/, `${sourcePath} needs an explicit 44px control target`);
  }
});
