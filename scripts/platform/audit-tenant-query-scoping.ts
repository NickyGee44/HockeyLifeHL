#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['apps/league-builder/src', 'apps/league-sites/src'];
const SERVER_PATH_HINTS = ['/app/api/', '/lib/actions/', '/lib/data.ts', '/middleware.ts'];
const EXTENSIONS = new Set(['.ts', '.tsx']);

const ALLOWLIST_TABLES = new Set([
  'profiles',
  'organizations',
  'organization_addons',
  'feature_flags',
]);

type Finding = {
  file: string;
  table: string;
  querySnippet: string;
  reason: string;
};

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '__tests__') {
        continue;
      }
      walk(full, files);
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function shouldAudit(file: string): boolean {
  const normalized = file.replace(ROOT, '');
  return SERVER_PATH_HINTS.some((hint) => normalized.includes(hint));
}

function hasTenantScope(queryChunk: string): boolean {
  const tenantPatterns = [
    /\.eq\(['"]league_id['"]/,
    /\.in\(['"]league_id['"]/,
    /\.eq\(['"]organization_id['"]/,
    /\.in\(['"]organization_id['"]/,
    /\.rpc\(/,
    /\.maybeSingle\(/,
  ];
  return tenantPatterns.some((pattern) => pattern.test(queryChunk));
}

function runAudit(): number {
  const findings: Finding[] = [];
  const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));

  for (const file of files) {
    if (!shouldAudit(file)) continue;
    const source = fs.readFileSync(file, 'utf8');

    const regex = /\.from\(['"]([a-zA-Z0-9_]+)['"]\)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(source)) !== null) {
      const table = match[1];
      if (ALLOWLIST_TABLES.has(table)) continue;

      const start = match.index;
      const chunk = source.slice(start, Math.min(source.length, start + 450));

      if (!hasTenantScope(chunk)) {
        findings.push({
          file: file.replace(`${ROOT}/`, ''),
          table,
          querySnippet: chunk.split('\n').slice(0, 5).join(' ').trim(),
          reason: 'Missing obvious league_id/organization_id scope near query.',
        });
      }
    }
  }

  console.log('\nTenant Query Scoping Audit');
  console.log('==========================');
  console.log(`Files scanned: ${files.length}`);
  console.log(`Potential findings: ${findings.length}\n`);

  for (const finding of findings.slice(0, 120)) {
    console.log(`- ${finding.file}`);
    console.log(`  table: ${finding.table}`);
    console.log(`  reason: ${finding.reason}`);
    console.log(`  snippet: ${finding.querySnippet}\n`);
  }

  if (findings.length > 120) {
    console.log(`... ${findings.length - 120} more findings omitted`);
  }

  if (findings.length > 0) {
    const strict = process.env.STRICT_TENANT_AUDIT === '1';
    console.log(`\nResult: ${strict ? 'FAIL' : 'WARN'} (set STRICT_TENANT_AUDIT=1 to fail on findings)`);
    return strict ? 1 : 0;
  }

  console.log('Result: PASS');
  return 0;
}

process.exit(runAudit());
