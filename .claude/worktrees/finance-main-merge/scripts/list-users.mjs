import dotenv from 'dotenv';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('Error: SUPABASE_DB_URL environment variable not set');
  console.error('Please set this in .env.local');
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1
});

console.log('\n📋 Listing recent users...\n');

try {
  const users = await sql`
    SELECT
      id,
      email,
      email_confirmed_at,
      created_at,
      last_sign_in_at
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 10
  `;

  console.log(`Found ${users.length} recent user(s):\n`);

  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email confirmed: ${user.email_confirmed_at ? '✅ YES (' + user.email_confirmed_at.toISOString() + ')' : '❌ NO'}`);
    console.log(`   Created: ${user.created_at.toISOString()}`);
    console.log(`   Last sign in: ${user.last_sign_in_at ? user.last_sign_in_at.toISOString() : 'Never'}`);
    console.log();
  });

  // Count unconfirmed users
  const unconfirmedCount = await sql`
    SELECT COUNT(*) as count
    FROM auth.users
    WHERE email_confirmed_at IS NULL
  `;

  console.log(`\n⚠️  Total unconfirmed users: ${unconfirmedCount[0].count}`);

  console.log('\n💡 To confirm an email, run:');
  console.log('   node scripts/confirm-email-via-db.mjs <email>');

  await sql.end();
  process.exit(0);
} catch (err) {
  console.error('❌ Error:', err.message);
  console.error('Full error:', err);
  await sql.end();
  process.exit(1);
}
