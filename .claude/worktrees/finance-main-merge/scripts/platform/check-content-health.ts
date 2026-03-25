#!/usr/bin/env tsx

import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type LeagueHealth = {
  id: string;
  slug: string;
  name: string;
  issues: string[];
};

async function main() {
  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('id, slug, name, logo_url, banner_url, status')
    .eq('status', 'active')
    .order('name', { ascending: true });

  if (error || !leagues) {
    console.error('Failed to load leagues:', error?.message);
    process.exit(1);
  }

  const results: LeagueHealth[] = [];
  for (const league of leagues) {
    const issues: string[] = [];

    if (!league.logo_url) issues.push('missing_logo');
    if (!league.banner_url) issues.push('missing_banner');

    const nowIso = new Date().toISOString();
    const [{ count: newsCount }, { count: sponsorCount }, { count: upcomingGamesCount }] = await Promise.all([
      supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', league.id)
        .eq('published', true)
        .in('type', ['news', 'game_recap', 'weekly_wrap']),
      supabase
        .from('league_sponsors')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', league.id)
        .eq('active', true),
      supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', league.id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', nowIso),
    ]);

    if (!newsCount) issues.push('no_published_news');
    if (!sponsorCount) issues.push('no_active_sponsors');
    if (!upcomingGamesCount) issues.push('no_upcoming_games');

    results.push({
      id: league.id,
      slug: league.slug,
      name: league.name,
      issues,
    });
  }

  const unhealthy = results.filter((r) => r.issues.length > 0);
  console.log('\nLeague Content Health');
  console.log('====================');
  console.log(`Active leagues: ${results.length}`);
  console.log(`Leagues with issues: ${unhealthy.length}\n`);

  for (const league of unhealthy) {
    console.log(`- ${league.slug} (${league.name})`);
    console.log(`  issues: ${league.issues.join(', ')}`);
  }

  const highRisk = unhealthy.filter((r) => r.issues.includes('no_upcoming_games') && r.issues.includes('no_published_news'));
  if (highRisk.length > 0) {
    console.log('\nHigh risk leagues (no games + no news):');
    for (const league of highRisk) {
      console.log(`- ${league.slug}`);
    }
  }

  console.log('\nResult:', unhealthy.length > 0 ? 'WARN' : 'PASS');
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
