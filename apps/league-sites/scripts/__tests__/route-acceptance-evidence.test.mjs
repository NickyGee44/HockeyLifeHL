import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const LEAGUE_SITES_ROOT = path.resolve(TEST_DIR, '../..');
const MANIFEST_PATH = path.join(LEAGUE_SITES_ROOT, 'src/rebuild/route-manifest.json');

const SOURCE_CONTRACT_TESTS = {
  platformLegal: 'node --test apps/league-sites/scripts/__tests__/platform-legal-glass.test.mjs',
  officialOperations: 'node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs',
  playerRegistration: 'node --test apps/league-sites/scripts/__tests__/player-registration-glass.test.mjs',
  publicEditorial: 'node --test apps/league-sites/scripts/__tests__/public-editorial-glass.test.mjs',
  publicData: 'node --test apps/league-sites/scripts/__tests__/public-data-glass.test.mjs',
};

const EDITORIAL_ROUTE_SOURCES = new Set([
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
]);

function expectedSourceContractTest(route) {
  if (route.category === 'legal-platform') return SOURCE_CONTRACT_TESTS.platformLegal;
  if (['captain', 'referee', 'scorekeeper'].includes(route.category)) {
    return SOURCE_CONTRACT_TESTS.officialOperations;
  }
  if (['player-account', 'registration', 'goalie'].includes(route.category)) {
    return SOURCE_CONTRACT_TESTS.playerRegistration;
  }
  if (EDITORIAL_ROUTE_SOURCES.has(route.source)) return SOURCE_CONTRACT_TESTS.publicEditorial;
  return SOURCE_CONTRACT_TESTS.publicData;
}

test('records review status and acceptance evidence for all rebuild work', async () => {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));

  assert.equal(manifest.version, '1.1.0');
  assert.equal(manifest.routes.length, 56);
  assert.ok(manifest.routes.every((route) => route.status === 'review'));
  assert.ok(manifest.globalContracts.every((contract) => contract.status === 'review'));
  assert.ok(manifest.sharedRequirements.every((requirement) => requirement.status === 'review'));

  assert.match(manifest.sharedVerificationNote, /pending final integrated build/i);
  assert.match(manifest.sharedVerificationNote, /independent review/i);
  assert.match(manifest.sharedVerificationNote, /preview\/browser acceptance/i);

  const ownershipCounts = new Map();
  for (const route of manifest.routes) {
    const sourceContractTest = expectedSourceContractTest(route);
    assert.equal(
      route.evidence?.sourceContractTest,
      sourceContractTest,
      `${route.id} must name its owning source-contract test`,
    );
    ownershipCounts.set(sourceContractTest, (ownershipCounts.get(sourceContractTest) ?? 0) + 1);
    assert.match(route.evidence?.acceptanceNote ?? '', /pending final integrated build/i);
    assert.match(route.evidence?.acceptanceNote ?? '', /independent review/i);
    assert.match(route.evidence?.acceptanceNote ?? '', /preview\/browser acceptance/i);
  }

  assert.deepEqual(Object.fromEntries(ownershipCounts), {
    [SOURCE_CONTRACT_TESTS.publicEditorial]: 12,
    [SOURCE_CONTRACT_TESTS.officialOperations]: 14,
    [SOURCE_CONTRACT_TESTS.playerRegistration]: 11,
    [SOURCE_CONTRACT_TESTS.publicData]: 12,
    [SOURCE_CONTRACT_TESTS.platformLegal]: 7,
  });
});
