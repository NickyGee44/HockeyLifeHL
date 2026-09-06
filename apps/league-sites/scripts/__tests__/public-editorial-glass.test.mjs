import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, '../..');

const ROUTES = [
  'src/app/[leagueSlug]/page.tsx',
  'src/app/[leagueSlug]/about/page.tsx',
  'src/app/[leagueSlug]/contact/page.tsx',
  'src/app/[leagueSlug]/events/page.tsx',
  'src/app/[leagueSlug]/gallery/page.tsx',
  'src/app/[leagueSlug]/gallery/[albumId]/page.tsx',
  'src/app/[leagueSlug]/history/page.tsx',
  'src/app/[leagueSlug]/news/page.tsx',
  'src/app/[leagueSlug]/news/[slug]/page.tsx',
  'src/app/[leagueSlug]/p/[pageSlug]/page.tsx',
  'src/app/[leagueSlug]/suspensions/page.tsx',
  'src/app/[leagueSlug]/venues/page.tsx',
];

const COMPONENT_DIRS = [
  'src/components/home',
  'src/components/about',
  'src/components/contact',
  'src/components/events',
  'src/components/gallery',
  'src/components/history',
  'src/components/news',
  'src/components/awards',
];

const COMPONENT_FILES = [
  'src/components/HeroSection.tsx',
  'src/components/AnnouncementBanner.tsx',
  'src/components/SocialLinks.tsx',
];

// Opaque neutrals are valid only when the neutral is the image itself, not card chrome.
const OPAQUE_IMAGE_EXCEPTIONS = new Map([
  [
    'src/components/gallery/PhotoReelCarousel.tsx',
    { pattern: /\bbg-black\b/, reason: 'black image stage prevents letterbox flashes during crossfade' },
  ],
  [
    'src/components/news/LeagueNewsFallbackArtwork.tsx',
    { pattern: /\bbg-slate-950\b/, reason: 'dark rink artwork is the image itself, not card chrome' },
  ],
]);

async function read(relativePath) {
  return readFile(path.join(ROOT, relativePath), 'utf8');
}

async function componentSources() {
  const nested = await Promise.all(
    COMPONENT_DIRS.map(async (directory) => {
      const entries = await readdir(path.join(ROOT, directory), { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && /\.[jt]sx$/.test(entry.name))
        .map((entry) => `${directory}/${entry.name}`);
    })
  );

  return [...COMPONENT_FILES, ...nested.flat()];
}

test('public editorial routes remain real production pages on shared glass surfaces', async () => {
  for (const route of ROUTES) {
    const source = await read(route);
    assert.match(source, /export default (?:async )?function|export default \w+/, `${route} has no real default page export`);
    assert.doesNotMatch(source, /\bRebuildRoute\b/, `${route} regressed to a rebuild placeholder`);
    assert.match(source, /\bglass-card(?:-strong)?\b/, `${route} has not opted into the shared glass surface vocabulary`);
  }
});

test('public editorial UI uses the complete shared surface vocabulary', async () => {
  const files = [...ROUTES, ...(await componentSources())];
  const source = (await Promise.all(files.map(read))).join('\n');

  for (const surface of ['glass-card', 'glass-card-strong', 'glass-control', 'glass-chrome']) {
    assert.match(source, new RegExp(`\\b${surface}\\b`), `Missing public editorial use of ${surface}`);
  }
});

test('public editorial card chrome has no undocumented opaque neutral backgrounds', async () => {
  const files = [...ROUTES, ...(await componentSources())];
  const opaqueNeutral = /(?:\bbg-(?:white|black|gray|slate|zinc|neutral)(?:-\d+)?\b(?!\/)|\bbg-\[var\(--color-(?:surface|background|background-elevated)\)\](?!\/))/;
  const violations = [];

  for (const file of files) {
    const lines = (await read(file)).split('\n');
    lines.forEach((line, index) => {
      if (!opaqueNeutral.test(line)) return;
      const exception = OPAQUE_IMAGE_EXCEPTIONS.get(file);
      if (exception?.pattern.test(line)) return;
      violations.push(`${file}:${index + 1}: ${line.trim()}`);
    });
  }

  assert.deepEqual(
    violations,
    [],
    `Replace opaque neutral card chrome with shared glass surfaces:\n${violations.join('\n')}`
  );
});
