import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const LEAGUE_SITES_ROOT = path.resolve(TEST_DIR, '../..');

async function read(relativePath) {
  return readFile(path.join(LEAGUE_SITES_ROOT, relativePath), 'utf8');
}

async function listTsx(relativeDirectory) {
  const directory = path.join(LEAGUE_SITES_ROOT, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return listTsx(relativePath);
    return entry.isFile() && entry.name.endsWith('.tsx') ? [relativePath] : [];
  }));
  return nested.flat();
}

const ROUTE_DIRECTORIES = [
  'src/app/[leagueSlug]/captain',
  'src/app/[leagueSlug]/scorekeeper',
  'src/app/[leagueSlug]/referee',
  'src/app/[leagueSlug]/verify',
];

const COMPONENT_DIRECTORIES = [
  'src/components/captain',
  'src/components/scorekeeper',
  'src/components/referee',
  'src/components/lineups',
];

const STRONG_OPERATIONAL_SURFACES = [
  'src/components/captain/CaptainGameDayPage.tsx',
  'src/components/captain/CaptainLineupModalEditor.tsx',
  'src/components/captain/RosterManager.tsx',
  'src/components/lineups/CaptainLineupEditor.tsx',
  'src/components/lineups/LineupRinkBoard.tsx',
  'src/components/scorekeeper/PreGameCheckin.tsx',
  'src/components/scorekeeper/ScoringInterface.tsx',
  'src/components/scorekeeper/EventEditModal.tsx',
  'src/components/scorekeeper/GameSummaryModal.tsx',
  'src/components/scorekeeper/CaptainSignature.tsx',
  'src/components/referee/RefereeDashboardView.tsx',
  'src/components/referee/TokenEntryPage.tsx',
  'src/app/[leagueSlug]/verify/[token]/page.tsx',
];

test('official operations routes are real production implementations', async () => {
  const routeFiles = (await Promise.all(ROUTE_DIRECTORIES.map(listTsx))).flat();

  assert.ok(routeFiles.length >= 15, `Expected the official operations route tree, found ${routeFiles.length} files`);
  for (const file of routeFiles) {
    const source = await read(file);
    assert.doesNotMatch(source, /\bRebuildRoute\b/, `${file} still renders a rebuild placeholder`);
  }
});

test('operate workspaces use shared strong glass and glass controls', async () => {
  for (const file of STRONG_OPERATIONAL_SURFACES) {
    const source = await read(file);
    assert.match(source, /\bglass-card-strong\b/, `${file} is missing the shared strong-glass surface`);
  }

  for (const file of [
    'src/components/captain/CaptainLineupModalEditor.tsx',
    'src/components/lineups/CaptainLineupEditor.tsx',
    'src/components/scorekeeper/ScoringInterface.tsx',
    'src/components/scorekeeper/EventEditModal.tsx',
    'src/components/referee/TokenEntryPage.tsx',
    'src/app/[leagueSlug]/verify/[token]/page.tsx',
  ]) {
    const source = await read(file);
    assert.match(source, /\bglass-control\b/, `${file} is missing a shared glass control`);
  }
});

test('official operations contain no obvious opaque neutral panels or modals', async () => {
  const files = (await Promise.all(
    [...ROUTE_DIRECTORIES, ...COMPONENT_DIRECTORIES].map(listTsx),
  )).flat();
  const violations = [];

  for (const file of files) {
    const source = await read(file);
    const lines = source.split('\n');
    lines.forEach((line, index) => {
      // Intentional exceptions: muted semantic badges may use /10 opacity; the
      // signature canvas stays opaque so pointer strokes remain legible.
      if (/bg-(?:gray|neutral|slate)-\d+\/\d+/.test(line)) return;
      if (file.endsWith('/CaptainSignature.tsx') && /signature-canvas/.test(line)) return;
      if (/\bbg-(?:neutral|slate|gray)-(?:50|100|200|700|800|900|950)\b/.test(line)) {
        violations.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  }

  assert.deepEqual(
    violations,
    [],
    `Replace opaque neutral operational surfaces with foundation glass:\n${violations.join('\n')}`,
  );

  const signatureSource = await read('src/components/scorekeeper/CaptainSignature.tsx');
  assert.match(
    signatureSource,
    /data-glass-exception=["']signature-canvas["']/,
    'The intentionally opaque signature canvas must remain explicitly documented',
  );
});
