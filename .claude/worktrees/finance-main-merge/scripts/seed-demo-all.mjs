/**
 * Master Seed Runner: Seed all demo data in the correct order
 *
 * Runs each seed script sequentially, stopping on first failure.
 * Passes the --reset flag through to each sub-script when provided.
 *
 * Order:
 *   1. seed-demo-league.mjs    — league, season, teams, venues
 *   2. seed-demo-rosters.mjs   — legacy players distributed across teams
 *   3. seed-demo-schedule.mjs  — 112-game round-robin schedule
 *   4. seed-demo-content.mjs   — sponsors, news articles, scorekeepers
 *   5. seed-demo-results.mjs   — game events, player/goalie stats, assignments
 *
 * Usage:
 *   node scripts/seed-demo-all.mjs           # Seed everything (skip existing)
 *   node scripts/seed-demo-all.mjs --reset   # Delete and recreate all demo data
 */

import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RESET = process.argv.includes('--reset');

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const steps = [
  {
    name: 'League',
    script: 'seed-demo-league.mjs',
    description: 'Creates demo league, season, 8 teams, and 4 venues',
  },
  {
    name: 'Rosters',
    script: 'seed-demo-rosters.mjs',
    description: 'Imports legacy players and distributes across teams',
  },
  {
    name: 'Schedule',
    script: 'seed-demo-schedule.mjs',
    description: 'Generates 112-game round-robin schedule (Tue/Thu)',
  },
  {
    name: 'Content',
    script: 'seed-demo-content.mjs',
    description: 'Seeds sponsors, news articles, and scorekeepers',
  },
  {
    name: 'Results',
    script: 'seed-demo-results.mjs',
    description: 'Generates game events, player stats, goalie stats, and assignments',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function printBanner() {
  console.log('');
  console.log('================================================================');
  console.log('  Hockey Life HL — Master Demo Seed Runner');
  console.log('================================================================');
  console.log('');
  if (RESET) {
    console.log('  Mode:  --reset (existing demo data will be deleted and recreated)');
  } else {
    console.log('  Mode:  create (existing data will be skipped)');
  }
  console.log('  Steps: %d', steps.length);
  console.log('');
  for (let i = 0; i < steps.length; i++) {
    console.log('    %d. %s  %s', i + 1, steps[i].name.padEnd(12), steps[i].description);
  }
  console.log('');
  console.log('----------------------------------------------------------------');
}

function printStepHeader(index, step) {
  console.log('');
  console.log('================================================================');
  console.log('  Step %d/%d: %s', index + 1, steps.length, step.name);
  console.log('  %s', step.description);
  console.log('  Script: %s', step.script);
  console.log('================================================================');
  console.log('');
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  if (ms < 60000) return `${seconds}s`;
  const minutes = Math.floor(ms / 60000);
  const remainingSeconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${remainingSeconds}s`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

printBanner();

const results = [];
const overallStart = Date.now();

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  printStepHeader(i, step);

  const scriptPath = resolve(__dirname, step.script);
  const args = RESET ? ' --reset' : '';
  const command = `node "${scriptPath}"${args}`;

  const stepStart = Date.now();

  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: resolve(__dirname, '..'),
      env: process.env,
    });

    const elapsed = Date.now() - stepStart;
    results.push({ name: step.name, status: 'OK', elapsed });
    console.log('\n  [OK] Step %d/%d completed in %s', i + 1, steps.length, formatDuration(elapsed));
  } catch (err) {
    const elapsed = Date.now() - stepStart;
    results.push({ name: step.name, status: 'FAILED', elapsed });

    console.error('');
    console.error('================================================================');
    console.error('  FAILED: Step %d/%d — %s', i + 1, steps.length, step.name);
    console.error('  Script: %s', step.script);
    console.error('  Exit code: %s', err.status ?? 'unknown');
    console.error('================================================================');
    console.error('');
    console.error('Stopping. Fix the error above and re-run.');
    console.error('Completed steps will be skipped automatically (use --reset to force recreate).');
    console.error('');

    // Print partial summary
    printSummary(results, overallStart);
    process.exit(1);
  }
}

// All steps succeeded
printSummary(results, overallStart);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function printSummary(results, startTime) {
  const totalElapsed = Date.now() - startTime;
  const passed = results.filter((r) => r.status === 'OK').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  const remaining = steps.length - results.length;

  console.log('');
  console.log('================================================================');
  console.log('  Summary');
  console.log('================================================================');
  console.log('');

  for (const r of results) {
    const icon = r.status === 'OK' ? '[OK]    ' : '[FAILED]';
    console.log('    %s  %s  %s', icon, r.name.padEnd(12), formatDuration(r.elapsed));
  }

  if (remaining > 0) {
    for (let i = results.length; i < steps.length; i++) {
      console.log('    [SKIP]    %s  (not reached)', steps[i].name.padEnd(12));
    }
  }

  console.log('');
  console.log('  Total:   %d passed, %d failed, %d skipped', passed, failed, remaining);
  console.log('  Elapsed: %s', formatDuration(totalElapsed));

  if (failed === 0 && remaining === 0) {
    console.log('');
    console.log('  All demo data seeded successfully!');
    console.log('  Visit the demo league at: http://demo.localhost:3001');
  }

  console.log('');
  console.log('================================================================');
  console.log('');
}
