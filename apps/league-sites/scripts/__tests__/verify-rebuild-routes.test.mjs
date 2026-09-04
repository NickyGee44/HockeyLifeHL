import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  pageFileToRoute,
  routeFileToRoute,
  verifyManifestCoverage,
} from '../verify-rebuild-routes.mjs';

const states = {
  loading: 'Show a loading state.',
  empty: 'Show an empty state.',
  error: 'Show a recoverable error.',
  auth: 'Public route.',
  subscription: 'No subscription gate.',
  mobile: 'Use a single-column mobile layout.',
  accessibility: 'Use semantic headings and keyboard controls.',
  seo: 'Publish route metadata.',
};

function route(overrides) {
  return {
    id: 'LS-ROOT',
    path: '/',
    source: 'src/app/page.tsx',
    title: 'Home',
    category: 'public',
    audience: 'Everyone',
    status: 'not-started',
    requiredSections: ['Introduction'],
    interactions: ['Open a league'],
    features: ['Platform entry point'],
    states,
    contracts: ['tenant-data'],
    ...overrides,
  };
}

function baseManifest(routes, preservedHandlers = []) {
  return {
    version: 1,
    expectedPageCount: routes.length,
    expectedHandlerCount: preservedHandlers.length,
    statuses: {
      'not-started': 'Tracked but not rebuilt.',
      'in-progress': 'Implementation is active.',
      blocked: 'Blocked by a named dependency.',
      complete: 'Acceptance criteria are verified.',
    },
    categories: [{ id: 'public', label: 'Public', expectedCount: routes.length }],
    routes,
    preservedHandlers,
    globalContracts: [],
    sharedRequirements: [],
    workflow: [],
    acceptanceCriteria: [],
    preservedBoundaries: [],
  };
}

async function createFixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'league-sites-routes-'));
  const appDir = path.join(root, 'src/app');
  await mkdir(path.join(appDir, 'discover'), { recursive: true });
  await mkdir(path.join(appDir, 'legacy'), { recursive: true });
  await mkdir(path.join(appDir, 'api/health'), { recursive: true });
  await writeFile(
    path.join(appDir, 'page.tsx'),
    "import { RebuildRoute } from '@/components/rebuild/RebuildRoute';\nexport default function Page() { return <RebuildRoute routeId=\"LS-ROOT\" />; }\n"
  );
  await writeFile(
    path.join(appDir, 'discover/page.tsx'),
    'export default function Page() { return null; }\n'
  );
  await writeFile(
    path.join(appDir, 'legacy/page.tsx'),
    'export default function Page() { return null; }\n'
  );
  await writeFile(
    path.join(appDir, 'api/health/route.ts'),
    'export function GET() { return Response.json({ ok: true }); }\n'
  );
  return root;
}

test('normalizes Next app page and handler filenames', () => {
  assert.equal(pageFileToRoute('page.tsx'), '/');
  assert.equal(
    pageFileToRoute('[leagueSlug]/games/[gameId]/page.tsx'),
    '/[leagueSlug]/games/[gameId]'
  );
  assert.equal(routeFileToRoute('api/public/live-game/route.ts'), '/api/public/live-game');
});

test('reports missing/stale routes, exact source drift, wrapper drift, and handler drift', async () => {
  const root = await createFixture();
  const manifest = baseManifest(
    [
      route({}),
      route({
        id: 'LS-DISCOVER',
        path: '/discover',
        source: 'src/app/discover/page.ts',
        title: 'Discover',
      }),
      route({
        id: 'LS-STALE',
        path: '/stale',
        source: 'src/app/stale/page.tsx',
        title: 'Stale',
      }),
    ],
    [{ path: '/api/wrong', source: 'src/app/api/health/route.ts', purpose: 'Fixture' }]
  );
  manifest.expectedPageCount = 3;
  manifest.expectedHandlerCount = 1;
  manifest.categories[0].expectedCount = 3;

  const result = await verifyManifestCoverage({ root, manifest });

  assert.deepEqual(result.missingRoutes, ['/legacy']);
  assert.deepEqual(result.staleRoutes, ['/stale']);
  assert.deepEqual(result.missingHandlers, ['/api/health']);
  assert.deepEqual(result.staleHandlers, ['/api/wrong']);
  assert.deepEqual(result.sourceMismatches, [
    'handler /api/wrong: manifest source src/app/api/health/route.ts resolves to /api/health',
    'route /discover: expected source src/app/discover/page.tsx, got src/app/discover/page.ts',
  ]);
  assert.deepEqual(result.wrapperMismatches, [
    '/discover: expected RebuildRoute routeId LS-DISCOVER',
  ]);
});

test('rejects duplicate IDs/routes, invalid statuses/categories, and category count drift', async () => {
  const root = await createFixture();
  const manifest = baseManifest([
    route({}),
    route({
      id: 'LS-ROOT',
      path: '/discover',
      source: 'src/app/discover/page.tsx',
      title: 'Discover',
      category: 'unknown',
      status: 'done',
    }),
    route({
      id: 'LS-DUPLICATE-PATH',
      path: '/',
      source: 'src/app/page.tsx',
      title: 'Duplicate path',
    }),
  ]);
  manifest.categories[0].expectedCount = 3;

  const result = await verifyManifestCoverage({ root, manifest });

  assert.deepEqual(result.duplicateIds, ['LS-ROOT']);
  assert.deepEqual(result.duplicatePaths, ['/']);
  assert.deepEqual(result.invalidStatuses, ['LS-ROOT: done']);
  assert.deepEqual(result.invalidCategories, ['LS-ROOT: unknown']);
  assert.deepEqual(result.categoryCountMismatches, ['public: expected 3, found 2']);
});
