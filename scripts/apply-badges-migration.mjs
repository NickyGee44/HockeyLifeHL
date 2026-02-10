import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://ntplczcmhvfkijjxavdl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cGxjemNtaHZma2lqanhhdmRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3OTQwNywiZXhwIjoyMDgzODU1NDA3fQ.hza-FltTs_UZzH1nEpKUSZpAvVD7DvsKoOsPI8QFj3M';
const PROJECT_REF = 'ntplczcmhvfkijjxavdl';

// Read the migration SQL
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260209_create_player_badges.sql');
const sql = readFileSync(migrationPath, 'utf-8');

async function main() {
  console.log('Applying player_badges migration via Supabase pg-meta API...\n');

  // Use the pg-meta SQL endpoint
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'x-connection-encrypted': 'false',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    const data = await res.json();
    console.log('Migration applied successfully!');
    console.log('Response:', JSON.stringify(data, null, 2));
    return;
  }

  const errText = await res.text();
  console.log(`pg-meta attempt: ${res.status}`, errText);

  // Try alternate endpoint
  console.log('\nTrying /rest/v1/rpc endpoint...');

  // We need to create a helper function in the database first, or use an existing one
  // Let's try the Supabase Management API
  const mgmtRes = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  console.log('REST API status:', mgmtRes.status);

  console.log('\n--- Manual steps required ---');
  console.log('The migration cannot be applied programmatically due to migration history mismatch.');
  console.log('Please apply the migration manually:');
  console.log('1. Go to https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/sql/new');
  console.log('2. Paste the contents of: supabase/migrations/20260209_create_player_badges.sql');
  console.log('3. Click "Run"');
  console.log('4. Then run: node scripts/seed-test-badges.mjs');
}

main().catch(console.error);
