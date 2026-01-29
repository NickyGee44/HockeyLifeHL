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

const email = process.argv[2];

if (!email) {
  console.error('Usage: node confirm-email-via-db.mjs <email>');
  console.error('Example: node confirm-email-via-db.mjs user@example.com');
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1
});

console.log(`\nConfirming email for: ${email}\n`);

try {
  // First, check if user exists
  const users = await sql`
    SELECT id, email, email_confirmed_at, created_at
    FROM auth.users
    WHERE email = ${email}
  `;

  if (users.length === 0) {
    console.error(`❌ User not found with email: ${email}`);

    // Show some available users
    const allUsers = await sql`
      SELECT email, email_confirmed_at
      FROM auth.users
      ORDER BY created_at DESC
      LIMIT 5
    `;

    console.log('\nRecent users:');
    allUsers.forEach(u => {
      console.log(`  - ${u.email} (${u.email_confirmed_at ? 'confirmed' : 'NOT confirmed'})`);
    });

    await sql.end();
    process.exit(1);
  }

  const user = users[0];
  console.log(`Found user: ${user.email}`);
  console.log(`User ID: ${user.id}`);
  console.log(`Email confirmed: ${user.email_confirmed_at ? 'YES' : 'NO'}`);
  console.log(`Created: ${user.created_at}`);

  if (user.email_confirmed_at) {
    console.log('\n✅ Email is already confirmed!');
    console.log('You should be able to log in now.');
  } else {
    console.log('\n⚙️  Confirming email...');

    // Update the user to confirm email
    const result = await sql`
      UPDATE auth.users
      SET
        email_confirmed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${user.id}
      RETURNING id, email, email_confirmed_at
    `;

    console.log('✅ Email confirmed successfully!');
    console.log(`   Confirmed at: ${result[0].email_confirmed_at}`);
    console.log('\nYou can now log in with:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: (your password)`);
  }

  // Check league memberships
  console.log('\n📋 Checking league memberships...');
  const memberships = await sql`
    SELECT
      lm.league_id,
      lm.role,
      lm.status,
      l.name as league_name
    FROM league_memberships lm
    LEFT JOIN leagues l ON l.id = lm.league_id
    WHERE lm.user_id = ${user.id}
  `;

  if (memberships.length === 0) {
    console.log('⚠️  User has NO league memberships (free agent)');
    console.log('   This is expected with the new free agent system.');
    console.log('   User should browse leagues at /discover and request to join.');
  } else {
    console.log(`✅ User has ${memberships.length} league membership(s):`);
    memberships.forEach(m => {
      console.log(`   - ${m.league_name || m.league_id} (${m.role}) [${m.status}]`);
    });
  }

  console.log('\n✨ All done!');

  await sql.end();
  process.exit(0);
} catch (err) {
  console.error('❌ Error:', err.message);
  console.error('Full error:', err);
  await sql.end();
  process.exit(1);
}
