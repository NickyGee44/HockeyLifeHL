import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const LEAGUE_SITES_ROOT = path.resolve(TEST_DIR, '../..');

async function read(relativePath) {
  return readFile(path.join(LEAGUE_SITES_ROOT, relativePath), 'utf8');
}

const ASSIGNED_PAGES = [
  'src/app/page.tsx',
  'src/app/discover/page.tsx',
  'src/app/discover/DiscoverClient.tsx',
  'src/app/privacy-policy/page.tsx',
  'src/app/tos/page.tsx',
  'src/app/reset-password/page.tsx',
  'src/app/[leagueSlug]/privacy/page.tsx',
  'src/app/[leagueSlug]/terms/page.tsx',
];

test('platform and legal routes are production pages using the shared glass vocabulary', async () => {
  const sources = await Promise.all(ASSIGNED_PAGES.map(read));

  for (const [index, source] of sources.entries()) {
    assert.doesNotMatch(
      source,
      /\bRebuildRoute\b/,
      `${ASSIGNED_PAGES[index]} must be a real production implementation`
    );
    assert.match(
      source,
      /\b(?:glass-card|glass-card-strong|glass-control|league-atmosphere)\b/,
      `${ASSIGNED_PAGES[index]} must use the shared glass surface vocabulary`
    );
  }
});

test('explore and configure surfaces remove opaque neutral cards and preserve accessible controls', async () => {
  const [root, discoverPage, discoverClient, resetPage, login, signup, oauth, userMenu] =
    await Promise.all([
      read('src/app/page.tsx'),
      read('src/app/discover/page.tsx'),
      read('src/app/discover/DiscoverClient.tsx'),
      read('src/app/reset-password/page.tsx'),
      read('src/components/auth/LoginModal.tsx'),
      read('src/components/auth/SignupModal.tsx'),
      read('src/components/auth/OAuthProviderButton.tsx'),
      read('src/components/auth/UserMenu.tsx'),
    ]);

  for (const [name, source] of [
    ['root', root],
    ['discover page', discoverPage],
    ['discover client', discoverClient],
  ]) {
    assert.doesNotMatch(source, /bg-neutral-(?:900|950)|border-neutral-(?:700|800)/, `${name} retains opaque neutral styling`);
  }

  assert.match(discoverClient, /glass-card/, 'League results must render as glass cards');

  for (const [name, source] of [
    ['reset page', resetPage],
    ['login modal', login],
    ['signup modal', signup],
    ['OAuth controls', oauth],
    ['user menu', userMenu],
  ]) {
    assert.match(source, /glass-(?:card-strong|control)/, `${name} must use strong/configure glass`);
    assert.match(source, /min-h-11|min-h-\[44px\]/, `${name} must guarantee 44px interactive controls`);
  }
});

test('legal reading surfaces use restrained strong glass and readable measure', async () => {
  const legalPages = await Promise.all(
    [
      'src/app/privacy-policy/page.tsx',
      'src/app/tos/page.tsx',
      'src/app/[leagueSlug]/privacy/page.tsx',
      'src/app/[leagueSlug]/terms/page.tsx',
    ].map(read)
  );

  for (const source of legalPages) {
    assert.match(source, /glass-card-strong/, 'Legal content needs a strong-glass reading surface');
    assert.match(source, /max-w-(?:3xl|4xl)/, 'Legal content needs a restrained reading measure');
    assert.doesNotMatch(source, /text-(?:5xl|6xl|7xl|8xl|9xl)/, 'Legal pages should not use oversized marketing headlines');
  }
});
