#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ROUTES_ROOT = path.join(ROOT, 'apps/league-builder/src/app/api');

const TARGET_HINTS = [
  'stripe/create-checkout-session',
  'stripe/create-registration-checkout',
  'webhooks/stripe',
  'scorekeeper',
  'games',
];

function walk(dir: string, results: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
    } else if (entry.name === 'route.ts') {
      results.push(full);
    }
  }
  return results;
}

function main() {
  const routes = walk(ROUTES_ROOT);
  const findings: string[] = [];
  let checked = 0;

  for (const route of routes) {
    const normalized = route.replace(`${ROOT}/`, '');
    if (!TARGET_HINTS.some((hint) => normalized.includes(hint))) continue;
    checked++;
    const source = fs.readFileSync(route, 'utf8');
    const hasIdempotency =
      source.includes('idempotency') ||
      source.includes('Idempotency') ||
      source.includes('stripe_event_id') ||
      source.includes('duplicate event');

    if (!hasIdempotency) {
      findings.push(normalized);
    }
  }

  console.log('\nIdempotency Audit');
  console.log('=================');
  console.log(`Routes checked: ${checked}`);
  console.log(`Potential gaps: ${findings.length}\n`);

  for (const finding of findings) {
    console.log(`- ${finding}`);
  }

  if (findings.length > 0) {
    console.log('\nResult: WARN');
    process.exit(0);
  }
  console.log('Result: PASS');
}

main();
