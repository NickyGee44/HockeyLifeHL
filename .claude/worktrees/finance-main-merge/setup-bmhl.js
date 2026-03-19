// Setup BMHL League - Execute SQL script via Supabase client
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupBMHL() {
  console.log('🏒 Setting up BMHL League...\n');

  try {
    // Read the SQL file
    const sql = fs.readFileSync('supabase/seeds/setup_bmhl_league_enterprise.sql', 'utf8');

    console.log('📝 Executing setup script...');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('⚠️  Trying alternative method...');

      // Split into individual statements and execute
      const statements = sql
        .split(';')
        .filter(s => s.trim() && !s.trim().startsWith('--'))
        .map(s => s.trim() + ';');

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.includes('BEGIN') || stmt.includes('COMMIT')) continue;

        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        const { error: stmtError } = await supabase.rpc('exec', { sql: stmt });

        if (stmtError) {
          console.warn(`⚠️  Statement ${i + 1} warning:`, stmtError.message);
        }
      }
    }

    // Verify BMHL was created
    console.log('\n✅ Verifying BMHL setup...\n');

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, slug, subdomain, status')
      .eq('slug', 'bmhl')
      .single();

    if (leagueError || !league) {
      console.error('❌ BMHL league not found:', leagueError?.message);
      console.log('\n📋 Manual Setup Required:');
      console.log('1. Go to: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl');
      console.log('2. Click "SQL Editor"');
      console.log('3. Copy contents of: supabase/seeds/setup_bmhl_league_enterprise.sql');
      console.log('4. Paste and click RUN');
      return;
    }

    console.log('✅ BMHL League Created:');
    console.log(`   Name: ${league.name}`);
    console.log(`   Slug: ${league.slug}`);
    console.log(`   Subdomain: ${league.subdomain}`);
    console.log(`   Status: ${league.status}`);

    // Check divisions
    const { count: divCount } = await supabase
      .from('divisions')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

    console.log(`\n✅ Divisions: ${divCount} (should be 8)`);

    // Check teams
    const { count: teamCount } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

    console.log(`✅ Teams: ${teamCount} (should be ~25)`);

    // Check season
    const { data: season } = await supabase
      .from('seasons')
      .select('name, status')
      .eq('league_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
      .single();

    if (season) {
      console.log(`✅ Season: ${season.name} (${season.status})`);
    }

    console.log('\n🎉 BMHL Setup Complete!');
    console.log('\n📱 Test URLs:');
    console.log('   Local: http://localhost:3000/bmhl');
    console.log('   Production: https://beerleaguehockey.ca/bmhl');

    console.log('\n⚠️  Note: No admin user assigned yet');
    console.log('   Add admin via Supabase dashboard or update line 222 in setup script');

  } catch (err) {
    console.error('❌ Error setting up BMHL:', err.message);
    console.log('\n📋 Fallback: Manual Setup Required');
    console.log('1. Go to: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl');
    console.log('2. Click "SQL Editor"');
    console.log('3. Copy contents of: supabase/seeds/setup_bmhl_league_enterprise.sql');
    console.log('4. Paste and click RUN');
  }
}

setupBMHL();
