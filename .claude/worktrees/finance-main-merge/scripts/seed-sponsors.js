const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedSponsors() {
  const leagueId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const platformSponsors = [
    {
      name: 'Molson Canadian',
      website_url: 'https://www.molsoncanadian.ca',
      logo_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/Molson_Canadian_logo.svg/1200px-Molson_Canadian_logo.svg.png',
      tier: 'gold',
      is_active: true
    },
    {
      name: 'CCM Hockey',
      website_url: 'https://ccmhockey.com',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/CCM_Hockey_logo.svg/2560px-CCM_Hockey_logo.svg.png',
      tier: 'gold',
      is_active: true
    },
    {
      name: 'Bauer',
      website_url: 'https://www.bauer.com',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Bauer_Logo.svg/1200px-Bauer_Logo.svg.png',
      tier: 'silver',
      is_active: true
    }
  ];

  const leagueSponsors = [
    {
      league_id: leagueId,
      name: "The Local Pub & Grill",
      website_url: "https://example.com/local-pub",
      logo_url: null,
      tier: 'gold',
      is_active: true
    },
    {
      league_id: leagueId,
      name: "Hockey Stop Pro Shop",
      website_url: "https://example.com/pro-shop",
      logo_url: null,
      tier: 'silver',
      is_active: true
    }
  ];

  console.log('Seeding platform sponsors...');
  const { error: pError } = await supabase.from('platform_sponsors').insert(platformSponsors);
  if (pError && pError.code !== '23505') console.error('Error seeding platform sponsors:', pError);
  else console.log('Platform sponsors seeded successfully (or already exist)!');

  console.log('Seeding league sponsors...');
  const { error: lError } = await supabase.from('league_sponsors').insert(leagueSponsors);
  if (lError && lError.code !== '23505') console.error('Error seeding league sponsors:', lError);
  else console.log('League sponsors seeded successfully (or already exist)!');
}

seedSponsors();
