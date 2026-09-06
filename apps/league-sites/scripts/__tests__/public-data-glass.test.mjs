import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const LEAGUE_SITES_ROOT = path.resolve(TEST_DIR, '../..');

const ROUTE_ROOT = 'src/app/[leagueSlug]';
const ROUTE_FAMILIES = [
  'schedule',
  'scores',
  'standings',
  'stats',
  'teams',
  'players',
  'games',
  'playoffs',
];
const ROUTE_PAGES = [
  'schedule/page.tsx',
  'scores/page.tsx',
  'standings/page.tsx',
  'stats/page.tsx',
  'stats/goalies/page.tsx',
  'teams/page.tsx',
  'teams/[teamSlug]/page.tsx',
  'teams/id/[teamId]/page.tsx',
  'players/page.tsx',
  'players/[playerId]/page.tsx',
  'games/[gameId]/page.tsx',
  'playoffs/page.tsx',
];
const COMPONENT_DIRECTORIES = [
  'schedule',
  'scores',
  'stats',
  'team',
  'player',
  'players',
  'game',
  'playoffs',
];
const TOP_LEVEL_COMPONENTS = [
  'ScheduleList.tsx',
  'SeasonSelector.tsx',
  'StandingsTable.tsx',
  'StandingsTabs.tsx',
  'StandingsSearch.tsx',
  'StandingsWithSearch.tsx',
  'ScoreTicker.tsx',
  'PremiumScoreTicker.tsx',
  'GameCard.tsx',
  'LeadersShowcase.tsx',
  'DivisionStandingsWidget.tsx',
  'StandingsWidget.tsx',
  'StatsLeadersTabs.tsx',
];

// These routes deliberately hand rendering to the named production implementation.
const ROUTE_SURFACE_HANDOFFS = new Map([
  ['stats/goalies/page.tsx', /return StatsPage\(/],
  ['teams/page.tsx', /<TeamsGrid\b/],
  ['teams/id/[teamId]/page.tsx', /redirect\(/],
]);

const SHARED_VOCABULARY = /\b(?:league-page-shell|glass-card(?:-strong)?|glass-control|glass-chrome)\b/;
const LEGACY_OPAQUE_NEUTRAL = [
  /(?<!print:)\bbg-(?:white|black|gray-(?:50|100|200|300|400|500|600|700|800|900|950)|slate-(?:50|100|200|300|400|500|600|700|800|900|950))\b(?!\/)/,
  /\bbg-\[var\(--color-(?:surface|background|background-elevated)\)\](?!\/)/,
  /className=.*(?<!-)\b(?:card|league-reading-panel)\b(?!-)/,
];

async function read(relativePath) {
  return readFile(path.join(LEAGUE_SITES_ROOT, relativePath), 'utf8');
}

async function tsxFilesBelow(relativeDirectory) {
  const absoluteDirectory = path.join(LEAGUE_SITES_ROOT, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { recursive: true, withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => path.relative(LEAGUE_SITES_ROOT, path.join(entry.parentPath, entry.name)))
    .sort();
}

async function assignedSources() {
  const routeSources = (
    await Promise.all(ROUTE_FAMILIES.map((family) => tsxFilesBelow(`${ROUTE_ROOT}/${family}`)))
  ).flat();
  const directoryComponents = (
    await Promise.all(COMPONENT_DIRECTORIES.map((directory) => tsxFilesBelow(`src/components/${directory}`)))
  ).flat();

  return [...new Set([
    ...routeSources,
    ...directoryComponents,
    ...TOP_LEVEL_COMPONENTS.map((file) => `src/components/${file}`),
  ])].sort();
}

test('every assigned public-data route remains a real production implementation', async () => {
  for (const route of ROUTE_PAGES) {
    const source = await read(`${ROUTE_ROOT}/${route}`);
    assert.doesNotMatch(source, /\bRebuildRoute\b/, `${route} regressed to a rebuild placeholder`);
    assert.match(source, /export default\b/, `${route} must keep a default route implementation`);
  }
});

test('assigned public-data routes and components opt into the shared glass vocabulary', async () => {
  const missing = [];

  for (const relativePath of await assignedSources()) {
    if (relativePath.endsWith('/_mode-icons.tsx')) continue;
    const source = await read(relativePath);
    const routeRelative = relativePath.startsWith(`${ROUTE_ROOT}/`)
      ? relativePath.slice(`${ROUTE_ROOT}/`.length)
      : null;
    const handoff = routeRelative ? ROUTE_SURFACE_HANDOFFS.get(routeRelative) : null;

    if (!SHARED_VOCABULARY.test(source) && !handoff?.test(source)) {
      missing.push(relativePath);
    }
  }

  assert.deepEqual(
    missing,
    [],
    `Expected shared page/surface vocabulary in:\n${missing.join('\n')}`,
  );
});

test('assigned public-data surfaces do not restore opaque neutral legacy cards', async () => {
  const violations = [];

  for (const relativePath of await assignedSources()) {
    const source = await read(relativePath);
    source.split('\n').forEach((line, index) => {
      if (line.includes('public-data-glass-allow:')) return;
      for (const pattern of LEGACY_OPAQUE_NEUTRAL) {
        if (pattern.test(line)) {
          violations.push(`${relativePath}:${index + 1}: ${line.trim()}`);
          break;
        }
      }
    });
  }

  assert.deepEqual(
    violations,
    [],
    `Found opaque neutral legacy surfaces (semantic/print exceptions must be documented):\n${violations.join('\n')}`,
  );
});
