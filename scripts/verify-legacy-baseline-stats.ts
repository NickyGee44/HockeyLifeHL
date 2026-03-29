import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  runLegacyBaselineAcceptanceChecks,
  verifyLegacyArtifactSummary,
  type AcceptanceCheck,
  type LegacyBaselineArtifactSummary,
} from '../packages/data/src/verification/legacy-baseline.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadArtifactSummary(): Promise<LegacyBaselineArtifactSummary> {
  const artifactPath = path.resolve(
    __dirname,
    '../artifacts/legacy/legacy-all-time-player-stats.summary.json',
  );
  const raw = await readFile(artifactPath, 'utf8');
  return JSON.parse(raw) as LegacyBaselineArtifactSummary;
}

function printChecks(title: string, checks: AcceptanceCheck[]) {
  console.log(`\n${title}`);
  for (const check of checks) {
    const prefix = check.passed ? 'PASS' : 'FAIL';
    console.log(`- [${prefix}] ${check.name}: ${check.detail}`);
  }
}

async function main() {
  const artifactSummary = await loadArtifactSummary();
  const artifactChecks = verifyLegacyArtifactSummary(artifactSummary);
  const acceptanceChecks = runLegacyBaselineAcceptanceChecks();
  const allChecks = [...artifactChecks, ...acceptanceChecks];

  printChecks('Artifact checks', artifactChecks);
  printChecks('Acceptance checks', acceptanceChecks);

  const failures = allChecks.filter((check) => !check.passed);
  if (failures.length > 0) {
    console.error(`\nLegacy baseline verification failed with ${failures.length} failing check(s).`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nLegacy baseline verification passed (${allChecks.length} checks).`);
}

void main();
