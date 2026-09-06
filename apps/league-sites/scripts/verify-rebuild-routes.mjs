#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..');
const MANIFEST_PATH = 'src/rebuild/route-manifest.json';
const TRACKER_PATH = '../../docs/LEAGUE-SITES-UI-REBUILD-CHECKLIST.md';
const STATE_FIELDS = [
  'loading',
  'empty',
  'error',
  'auth',
  'subscription',
  'mobile',
  'accessibility',
  'seo',
];
const EVIDENCE_REQUIRED_STATUSES = new Set(['review', 'complete']);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }

  return files;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

export function pageFileToRoute(relativeFile) {
  const normalized = toPosix(relativeFile);
  if (normalized === 'page.tsx' || normalized === 'page.ts') return '/';
  return `/${normalized.replace(/\/page\.(?:ts|tsx)$/, '')}`;
}

export function routeFileToRoute(relativeFile) {
  return `/${toPosix(relativeFile).replace(/\/route\.(?:ts|tsx)$/, '')}`;
}

async function scanRoutes(appDir, matcher, converter) {
  const files = await walk(appDir);
  return new Map(
    files
      .filter((file) => matcher.test(path.basename(file)))
      .map((file) => {
        const relativeToApp = toPosix(path.relative(appDir, file));
        return [converter(relativeToApp), `src/app/${relativeToApp}`];
      })
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

function duplicates(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function sourceRouteMismatch(kind, item, converter) {
  const prefix = 'src/app/';
  if (typeof item.source !== 'string' || !item.source.startsWith(prefix)) {
    return `${kind} ${item.path}: invalid source ${item.source ?? '<missing>'}`;
  }
  const resolved = converter(item.source.slice(prefix.length));
  return resolved === item.path
    ? null
    : `${kind} ${item.path}: manifest source ${item.source} resolves to ${resolved}`;
}

function exactSourceMismatch(kind, item, actualSources) {
  const actual = actualSources.get(item.path);
  if (!actual || actual === item.source) return null;
  return `${kind} ${item.path}: expected source ${actual}, got ${item.source}`;
}

function validateRouteShape(route) {
  const errors = [];
  for (const field of ['id', 'path', 'source', 'title', 'category', 'audience', 'status']) {
    if (typeof route[field] !== 'string' || route[field].trim() === '') {
      errors.push(`${route.id ?? route.path ?? '<unknown>'}: missing ${field}`);
    }
  }
  for (const field of ['requiredSections', 'interactions', 'features', 'contracts']) {
    if (!Array.isArray(route[field]) || route[field].length === 0) {
      errors.push(`${route.id ?? route.path ?? '<unknown>'}: ${field} must be a non-empty array`);
    }
  }
  for (const field of STATE_FIELDS) {
    if (typeof route.states?.[field] !== 'string' || route.states[field].trim() === '') {
      errors.push(`${route.id ?? route.path ?? '<unknown>'}: states.${field} is required`);
    }
  }
  if (EVIDENCE_REQUIRED_STATUSES.has(route.status)) {
    if (!route.evidence || typeof route.evidence !== 'object' || Array.isArray(route.evidence)) {
      errors.push(`${route.id ?? route.path ?? '<unknown>'}: evidence is required when status is ${route.status}`);
    } else {
      for (const field of ['sourceContractTest', 'acceptanceNote']) {
        if (typeof route.evidence[field] !== 'string' || route.evidence[field].trim() === '') {
          errors.push(`${route.id ?? route.path ?? '<unknown>'}: evidence.${field} is required when status is ${route.status}`);
        }
      }
    }
  }
  return errors;
}

function validateSharedEvidence(manifest) {
  const errors = [];
  for (const [kind, items] of [
    ['global contract', manifest.globalContracts ?? []],
    ['shared requirement', manifest.sharedRequirements ?? []],
  ]) {
    for (const item of items) {
      if (!EVIDENCE_REQUIRED_STATUSES.has(item.status)) continue;
      const evidence = item.evidence ?? manifest.sharedVerificationNote;
      if (typeof evidence !== 'string' || evidence.trim() === '') {
        errors.push(`${item.id ?? `<unknown ${kind}>`}: evidence is required when status is ${item.status}`);
      }
    }
  }
  return errors;
}

function validateHandlerShape(handler) {
  const errors = [];
  for (const field of ['path', 'source', 'purpose']) {
    if (typeof handler[field] !== 'string' || handler[field].trim() === '') {
      errors.push(`${handler.path ?? '<unknown handler>'}: missing ${field}`);
    }
  }
  return errors;
}

export async function verifyManifestCoverage({ root = DEFAULT_ROOT, manifest }) {
  const appDir = path.join(root, 'src/app');
  const pageRoutes = await scanRoutes(appDir, /^page\.(?:ts|tsx)$/, pageFileToRoute);
  const handlers = await scanRoutes(appDir, /^route\.(?:ts|tsx)$/, routeFileToRoute);
  const manifestRoutes = new Map(manifest.routes.map((route) => [route.path, route]));
  const manifestHandlers = new Map(
    manifest.preservedHandlers.map((handler) => [handler.path, handler])
  );

  const missingRoutes = [...pageRoutes.keys()].filter((route) => !manifestRoutes.has(route));
  const staleRoutes = [...manifestRoutes.keys()].filter((route) => !pageRoutes.has(route));
  const missingHandlers = [...handlers.keys()].filter((route) => !manifestHandlers.has(route));
  const staleHandlers = [...manifestHandlers.keys()].filter((route) => !handlers.has(route));
  const duplicateIds = duplicates(manifest.routes.map((route) => route.id));
  const duplicatePaths = duplicates(manifest.routes.map((route) => route.path));

  const sourceMismatches = [
    ...manifest.routes.flatMap((route) => [
      sourceRouteMismatch('route', route, pageFileToRoute),
      exactSourceMismatch('route', route, pageRoutes),
    ]),
    ...manifest.preservedHandlers.flatMap((handler) => [
      sourceRouteMismatch('handler', handler, routeFileToRoute),
      exactSourceMismatch('handler', handler, handlers),
    ]),
  ]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort();

  const wrapperMismatches = [];
  for (const [routePath, source] of pageRoutes) {
    const route = manifestRoutes.get(routePath);
    if (!route) continue;
    const contents = await readFile(path.join(root, source), 'utf8');
    if (!/\bRebuildRoute\b/.test(contents)) {
      continue;
    }
    const escapedId = route.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wrapperPattern = new RegExp(
      `<RebuildRoute\\s+[^>]*routeId=["']${escapedId}["']|<RebuildRoute\\s+routeId=["']${escapedId}["']`
    );
    if (!wrapperPattern.test(contents)) {
      wrapperMismatches.push(`${routePath}: RebuildRoute placeholder must use routeId ${route.id}`);
    }
  }

  const validStatuses = new Set(Object.keys(manifest.statuses ?? {}));
  const categories = manifest.categories ?? [];
  const validCategories = new Set(categories.map((category) => category.id));
  const invalidStatuses = manifest.routes
    .filter((route) => !validStatuses.has(route.status))
    .map((route) => `${route.id}: ${route.status}`)
    .sort();
  const invalidCategories = manifest.routes
    .filter((route) => !validCategories.has(route.category))
    .map((route) => `${route.id}: ${route.category}`)
    .sort();
  const categoryCountMismatches = categories
    .map((category) => {
      const actual = manifest.routes.filter((route) => route.category === category.id).length;
      return actual === category.expectedCount
        ? null
        : `${category.id}: expected ${category.expectedCount}, found ${actual}`;
    })
    .filter(Boolean)
    .sort();
  const countMismatches = [
    manifest.routes.length === manifest.expectedPageCount
      ? null
      : `manifest pages: expected ${manifest.expectedPageCount}, found ${manifest.routes.length}`,
    pageRoutes.size === manifest.expectedPageCount
      ? null
      : `filesystem pages: expected ${manifest.expectedPageCount}, found ${pageRoutes.size}`,
    manifest.preservedHandlers.length === manifest.expectedHandlerCount
      ? null
      : `manifest handlers: expected ${manifest.expectedHandlerCount}, found ${manifest.preservedHandlers.length}`,
    handlers.size === manifest.expectedHandlerCount
      ? null
      : `filesystem handlers: expected ${manifest.expectedHandlerCount}, found ${handlers.size}`,
  ].filter(Boolean);
  const shapeErrors = [
    ...manifest.routes.flatMap(validateRouteShape),
    ...manifest.preservedHandlers.flatMap(validateHandlerShape),
    ...validateSharedEvidence(manifest),
  ].sort();

  return {
    pageCount: pageRoutes.size,
    handlerCount: handlers.size,
    missingRoutes: missingRoutes.sort(),
    staleRoutes: staleRoutes.sort(),
    duplicateIds,
    duplicatePaths,
    missingHandlers: missingHandlers.sort(),
    staleHandlers: staleHandlers.sort(),
    sourceMismatches,
    wrapperMismatches: wrapperMismatches.sort(),
    invalidStatuses,
    invalidCategories,
    categoryCountMismatches,
    countMismatches,
    shapeErrors,
  };
}

function checkbox(status) {
  return status === 'complete' ? 'x' : ' ';
}

function bulletList(values) {
  return values.map((value) => `  - ${value}`).join('\n');
}

function sharedEvidence(manifest, item) {
  return item.evidence ?? manifest.sharedVerificationNote;
}

export function renderTrackerMarkdown(manifest) {
  const lines = [
    '# League Sites UI Rebuild Checklist',
    '',
    '<!-- GENERATED from apps/league-sites/src/rebuild/route-manifest.json. Do not edit route rows by hand. -->',
    '',
    `- Manifest version: \`${manifest.version}\``,
    `- Production baseline: \`${manifest.productionBaseline}\``,
    `- Page routes: **${manifest.routes.length}**`,
    `- Preserved route handlers: **${manifest.preservedHandlers.length}**`,
    '',
    '## Route counts',
    '',
    '| Category | Count |',
    '| --- | ---: |',
    ...manifest.categories.map(
      (category) =>
        `| ${category.label} (\`${category.id}\`) | ${manifest.routes.filter((route) => route.category === category.id).length} |`
    ),
    `| **Total** | **${manifest.routes.length}** |`,
    '',
    '## Statuses',
    '',
    ...Object.entries(manifest.statuses).map(([status, description]) => `- \`${status}\` — ${description}`),
    '',
    '## Global TODO contracts',
    '',
    ...manifest.globalContracts.flatMap((contract) => [
      `### [${checkbox(contract.status)}] \`${contract.id}\` — ${contract.title}`,
      '',
      `- **Status:** \`${contract.status}\``,
      `- **Contract:** ${contract.requirement}`,
      ...(EVIDENCE_REQUIRED_STATUSES.has(contract.status)
        ? [`- **Evidence:** ${sharedEvidence(manifest, contract)}`]
        : []),
      '',
    ]),
    '## Shared/global requirements',
    '',
    ...manifest.sharedRequirements.flatMap((requirement) => [
      `- [${checkbox(requirement.status)}] \`${requirement.id}\` — **${requirement.title}:** ${requirement.requirement} (\`${requirement.status}\`)`,
      ...(EVIDENCE_REQUIRED_STATUSES.has(requirement.status)
        ? [`  - **Evidence:** ${sharedEvidence(manifest, requirement)}`]
        : []),
    ]),
    '',
  ];

  for (const category of manifest.categories) {
    const routes = manifest.routes.filter((route) => route.category === category.id);
    lines.push(`## ${category.label} (${routes.length})`, '');
    for (const route of routes) {
      lines.push(
        `<a id="${route.id.toLowerCase()}"></a>`,
        `### [${checkbox(route.status)}] \`${route.id}\` — ${route.title}`,
        '',
        `- **Route:** \`${route.path}\``,
        `- **Source page:** \`${route.source}\``,
        `- **Audience:** ${route.audience}`,
        `- **Status:** \`${route.status}\``,
        '- **Required visible sections:**',
        bulletList(route.requiredSections),
        '- **Interactions:**',
        bulletList(route.interactions),
        '- **Features to preserve:**',
        bulletList(route.features),
        '- **Required states:**',
        ...STATE_FIELDS.map((state) => `  - **${state}:** ${route.states[state]}`),
        `- **TODO contracts:** ${route.contracts.map((contract) => `\`${contract}\``).join(', ')}`,
        ...(EVIDENCE_REQUIRED_STATUSES.has(route.status)
          ? [
              `- **Source-contract test:** \`${route.evidence?.sourceContractTest ?? '<missing>'}\``,
              `- **Acceptance evidence:** ${route.evidence?.acceptanceNote ?? '<missing>'}`,
            ]
          : []),
        ''
      );
    }
  }

  lines.push(
    '## Workflow',
    '',
    ...manifest.workflow.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## Acceptance criteria',
    '',
    ...manifest.acceptanceCriteria.map((criterion) => `- [ ] ${criterion}`),
    '',
    '## Exact preserved boundaries',
    '',
    ...manifest.preservedBoundaries.map((boundary) => `- ${boundary}`),
    '',
    '## Preserved non-visual route handlers',
    '',
    'These handlers are inventory-only and must not be rewritten by the UI rebuild.',
    '',
    ...manifest.preservedHandlers.map(
      (handler) => `- \`${handler.path}\` — \`${handler.source}\` — ${handler.purpose}`
    )
  );

  return `${lines.join('\n')}\n`;
}

function failures(result) {
  return Object.entries(result)
    .filter(([, value]) => Array.isArray(value) && value.length > 0)
    .flatMap(([name, values]) => values.map((value) => `${name}: ${value}`));
}

async function main() {
  const root = DEFAULT_ROOT;
  const manifest = JSON.parse(await readFile(path.join(root, MANIFEST_PATH), 'utf8'));
  const result = await verifyManifestCoverage({ root, manifest });
  const problems = failures(result);
  const tracker = renderTrackerMarkdown(manifest);
  const trackerPath = path.resolve(root, TRACKER_PATH);

  if (process.argv.includes('--write-tracker')) {
    if (problems.length > 0) {
      console.error('Refusing to write tracker while manifest coverage is invalid:');
      for (const problem of problems) console.error(`- ${problem}`);
      process.exitCode = 1;
      return;
    }
    await mkdir(path.dirname(trackerPath), { recursive: true });
    await writeFile(trackerPath, tracker);
    console.log(`Wrote docs/LEAGUE-SITES-UI-REBUILD-CHECKLIST.md from ${MANIFEST_PATH}.`);
    return;
  }

  const trackerOnDisk = await readFile(trackerPath, 'utf8').catch(() => '');
  if (trackerOnDisk !== tracker) {
    problems.push('docs/LEAGUE-SITES-UI-REBUILD-CHECKLIST.md is stale; run pnpm rebuild:tracker');
  }

  if (problems.length > 0) {
    console.error('League-sites rebuild coverage failed:');
    for (const problem of problems) console.error(`- ${problem}`);
    process.exitCode = 1;
    return;
  }

  const categoryCounts = Object.fromEntries(
    manifest.categories.map((category) => [
      category.id,
      manifest.routes.filter((route) => route.category === category.id).length,
    ])
  );
  console.log(
    `League-sites rebuild coverage passed: ${result.pageCount} pages, ${result.handlerCount} preserved handlers.`
  );
  console.log(JSON.stringify(categoryCounts));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
