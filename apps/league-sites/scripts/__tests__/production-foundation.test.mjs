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

test('every manifest page is backed by a real production implementation', async () => {
  const manifest = JSON.parse(await read('src/rebuild/route-manifest.json'));
  const placeholderSources = [];

  for (const route of manifest.routes) {
    const source = await read(route.source);
    if (/\bRebuildRoute\b/.test(source)) {
      placeholderSources.push(`${route.id}: ${route.source}`);
    }
  }

  assert.deepEqual(
    placeholderSources,
    [],
    `Expected production pages, found rebuild placeholders:\n${placeholderSources.join('\n')}`
  );
});

test('shared league shell publishes the glass design foundation contract', async () => {
  const [styles, leagueLayout, card, button, header, footer] = await Promise.all([
    read('src/app/globals.css'),
    read('src/app/[leagueSlug]/layout.tsx'),
    read('src/components/ui/Card.tsx'),
    read('src/components/ui/Button.tsx'),
    read('src/components/LeagueHeader.tsx'),
    read('src/components/LeagueFooter.tsx'),
  ]);

  for (const token of [
    '--blh-night',
    '--blh-glass-surface',
    '--blh-glass-surface-strong',
    '--blh-glass-border',
    '--blh-glass-blur',
  ]) {
    assert.match(styles, new RegExp(token), `Missing shared design token ${token}`);
  }

  assert.match(styles, /\.league-atmosphere\b/, 'Missing fixed atmospheric depth layer');
  assert.match(styles, /\.glass-card-strong\b/, 'Missing readable strong-glass surface');
  assert.match(styles, /@supports\s*\([^)]*backdrop-filter/i, 'Missing full-capability glass enhancement');
  assert.match(styles, /prefers-reduced-motion:\s*reduce/i, 'Missing reduced-motion treatment');
  assert.match(styles, /prefers-reduced-transparency:\s*reduce/i, 'Missing reduced-transparency fallback');
  assert.match(leagueLayout, /data-blh-design-foundation=["']glass-v1["']/, 'League shell does not expose the foundation version');
  assert.match(leagueLayout, /className=[^\n]*league-atmosphere/, 'League shell does not render the atmospheric layer');
  assert.match(card, /'strong'/, 'Card primitive does not expose a strong glass variant');
  assert.match(card, /glass-card-strong/, 'Card primitive does not use the strong glass surface');
  assert.match(button, /min-h-11/, 'Shared buttons do not guarantee a 44px touch target');
  assert.match(header, /glass-chrome/, 'League header does not use shared glass chrome');
  assert.match(footer, /glass-chrome/, 'League footer does not use shared glass chrome');
});
