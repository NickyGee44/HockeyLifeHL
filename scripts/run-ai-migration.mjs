import pg from 'pg';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Get the database URL from the pooler URL stored by supabase CLI
const poolerUrl = readFileSync('supabase/.temp/pooler-url', 'utf8').trim();

// We need the database password - check env vars
const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;

if (!dbPassword) {
  // Try to construct from the service role key approach
  console.error('Need SUPABASE_DB_PASSWORD in .env.local');
  console.error('You can find it in Supabase Dashboard > Settings > Database > Connection string');
  console.error('');
  console.error('Alternative: Copy the SQL below and run it in the Supabase SQL Editor:');
  console.error('Dashboard > SQL Editor > New query > Paste > Run');
  console.error('');
  console.log(readFileSync('supabase/migrations/20260211_ai_articles_system.sql', 'utf8'));
  process.exit(1);
}

const connectionString = poolerUrl.replace('postgresql://postgres.', `postgresql://postgres.`).replace('@', `:${dbPassword}@`);

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log('Connected to database');

  const sql = readFileSync('supabase/migrations/20260211_ai_articles_system.sql', 'utf8');

  try {
    await client.query(sql);
    console.log('Migration executed successfully!');
  } catch (error) {
    console.error('Migration error:', error.message);
    if (error.message.includes('already exists')) {
      console.log('(Some objects already exist, which is expected with IF NOT EXISTS)');
    }
  }

  // Verify
  try {
    const { rows: aptRows } = await client.query("SELECT count(*) FROM information_schema.tables WHERE table_name = 'article_player_tags'");
    console.log('article_player_tags:', aptRows[0].count > 0 ? 'EXISTS' : 'MISSING');

    const { rows: logRows } = await client.query("SELECT count(*) FROM information_schema.tables WHERE table_name = 'ai_generation_log'");
    console.log('ai_generation_log:', logRows[0].count > 0 ? 'EXISTS' : 'MISSING');

    const { rows: colRows } = await client.query("SELECT count(*) FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'division_id'");
    console.log('articles.division_id column:', colRows[0].count > 0 ? 'EXISTS' : 'MISSING');
  } catch (e) {
    console.error('Verify error:', e.message);
  }

  await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
