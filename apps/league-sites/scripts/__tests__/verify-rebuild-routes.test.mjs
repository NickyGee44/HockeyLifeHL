import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  pageFileToRoute,
  renderTrackerMarkdown,
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
    productionBaseline: 'fixture',
    expectedPageCount: routes.length,
    expectedHandlerCount: preservedHandlers.length,
    statuses: {
      'not-started': 'Tracked but not rebuilt.',
      'in-progress': 'Implementation is active.',
      review: 'Implementation awaits acceptance.',
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

test('reports route/source/handler drift while accepting real in-progress pages', async () => {
  const root = await createFixture();
  const manifest = baseManifest(
    [
      route({}),
      route({
        id: 'LS-DISCOVER',
        path: '/discover',
        source: 'src/app/discover/page.ts',
        title: 'Discover',
        status: 'in-progress',
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
  assert.deepEqual(result.wrapperMismatches, []);
});

test('still rejects a placeholder wired to the wrong manifest route', async () => {
  const root = await createFixture();
  const manifest = baseManifest([route({ id: 'LS-WRONG' })]);

  const result = await verifyManifestCoverage({ root, manifest });

  assert.deepEqual(result.wrapperMismatches, [
    '/: RebuildRoute placeholder must use routeId LS-WRONG',
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

test('requires and renders evidence for review and complete work', async () => {
  const root = await createFixture();
  const manifest = baseManifest([route({ status: 'review' })]);
  manifest.sharedVerificationNote = 'Pending final integrated build, independent review, and preview/browser acceptance.';
  manifest.globalContracts = [{
    id: 'ROUTE-COMPATIBILITY',
    title: 'Route compatibility',
    status: 'review',
    requirement: 'Keep paths compatible.',
  }];
  manifest.sharedRequirements = [{
    id: 'RESPONSIVE',
    title: 'Responsive behavior',
    status: 'complete',
    requirement: 'Support narrow screens.',
  }];

  const missingEvidence = await verifyManifestCoverage({ root, manifest });
  assert.deepEqual(missingEvidence.shapeErrors, [
    'LS-ROOT: evidence is required when status is review',
  ]);

  manifest.routes[0].evidence = {
    sourceContractTest: 'node --test source-contract.test.mjs',
    acceptanceNote: 'Pending final integrated build, independent review, and preview/browser acceptance.',
  };

  const withEvidence = await verifyManifestCoverage({ root, manifest });
  assert.deepEqual(withEvidence.shapeErrors, []);

  const tracker = renderTrackerMarkdown(manifest);
  assert.match(tracker, /\*\*Source-contract test:\*\* `node --test source-contract\.test\.mjs`/);
  assert.match(tracker, /\*\*Acceptance evidence:\*\* Pending final integrated build/);
  assert.equal((tracker.match(/\*\*Evidence:\*\* Pending final integrated build/g) ?? []).length, 2);
});
