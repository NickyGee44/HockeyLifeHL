#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

type Check = {
  name: string;
  ok: boolean;
  detail?: string;
  critical?: boolean;
};

function runCommand(cmd: string, args: string[]): { ok: boolean; output: string } {
  const result = spawnSync(cmd, args, {
    cwd: process.cwd(),
    stdio: 'pipe',
    encoding: 'utf8',
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout || ''}${result.stderr || ''}`.trim(),
  };
}

function main() {
  const checks: Check[] = [];
  const hasChecklist = fs.existsSync(path.join(process.cwd(), 'docs/PLATFORM_HARDENING_10X_EXECUTION.md'));
  checks.push({ name: 'Release checklist exists', ok: hasChecklist, critical: true });

  const hasLeagueSiteResponsiveTest = fs.existsSync(
    path.join(process.cwd(), 'e2e/tests/league-site-responsive-regression.spec.ts')
  );
  checks.push({ name: 'Responsive regression E2E test exists', ok: hasLeagueSiteResponsiveTest, critical: true });

  const hasTenantAuditScript = fs.existsSync(
    path.join(process.cwd(), 'scripts/platform/audit-tenant-query-scoping.ts')
  );
  checks.push({ name: 'Tenant query audit script exists', ok: hasTenantAuditScript, critical: true });

  const hasStripePricingAudit = fs.existsSync(
    path.join(process.cwd(), 'scripts/platform/validate-stripe-pricing.ts')
  );
  checks.push({ name: 'Stripe pricing audit script exists', ok: hasStripePricingAudit, critical: true });

  const runFull = process.env.RUN_FULL_READINESS === '1';
  if (runFull) {
    const builderTypecheck = runCommand('pnpm', ['--filter', '@hockey-life/league-builder', 'type-check']);
    checks.push({
      name: 'league-builder type-check',
      ok: builderTypecheck.ok,
      detail: builderTypecheck.ok ? undefined : builderTypecheck.output,
      critical: true,
    });

    const sitesTypecheck = runCommand('pnpm', ['--filter', '@hockey-life/league-sites', 'type-check']);
    checks.push({
      name: 'league-sites type-check',
      ok: sitesTypecheck.ok,
      detail: sitesTypecheck.ok ? undefined : sitesTypecheck.output,
      critical: true,
    });
  } else {
    checks.push({
      name: 'Runtime checks',
      ok: true,
      detail: 'Skipped. Set RUN_FULL_READINESS=1 to execute type-checks.',
    });
  }

  let failed = 0;
  console.log('\nRelease Readiness');
  console.log('=================\n');
  for (const check of checks) {
    const icon = check.ok ? '✅' : check.critical ? '❌' : '⚠️';
    console.log(`${icon} ${check.name}`);
    if (check.detail) console.log(`   ${check.detail.split('\n')[0]}`);
    if (!check.ok && check.critical) failed++;
  }

  if (failed > 0) {
    console.log(`\nResult: FAIL (${failed} critical checks failed)`);
    process.exit(1);
  }
  console.log('\nResult: PASS');
}

main();
