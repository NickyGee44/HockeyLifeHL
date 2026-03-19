/**
 * Assign random hockey player headshot images to BMHL players without avatars.
 *
 * Scrapes hockey headshot images from Bing, uploads to Supabase Storage,
 * and updates profiles.avatar_url for players who don't have one.
 *
 * Usage: node scripts/assign-player-headshots.mjs
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from league-builder
dotenv.config({ path: path.join(__dirname, '../apps/league-builder/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/league-builder/.env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// BMHL league slug
const BMHL_SLUG = 'bmhl';

/**
 * Fetch an image from a URL and return it as a Buffer.
 */
function fetchImage(url, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          const parsed = new URL(url);
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        return resolve(fetchImage(redirectUrl, redirectCount + 1));
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

/**
 * Scrape hockey headshot image URLs from Bing image search.
 */
async function scrapeHockeyHeadshots(count = 50) {
  console.log(`Scraping ~${count} hockey headshot images from Bing...`);

  const queries = [
    'hockey+player+headshot+portrait',
    'ice+hockey+player+headshot+photo',
    'beer+league+hockey+player+portrait',
    'hockey+player+face+portrait+photo',
  ];

  const allUrls = [];

  for (const query of queries) {
    if (allUrls.length >= count) break;

    try {
      const searchUrl = `https://www.bing.com/images/async?q=${query}&first=0&count=35&qft=+filterui:photo-photo+filterui:aspect-square&SFX=1`;
      const html = await fetchImage(searchUrl);
      const htmlStr = html.toString('utf-8');

      // Extract murl (media URL) values from Bing's response
      const murlRegex = /murl&quot;:&quot;(https?:\/\/[^&]+?\.(?:jpg|jpeg|png))&quot;/gi;
      let match;
      while ((match = murlRegex.exec(htmlStr)) !== null) {
        const url = match[1].replace(/&amp;/g, '&');
        if (!allUrls.includes(url)) {
          allUrls.push(url);
        }
      }

      console.log(`  Query "${query.replace(/\+/g, ' ')}": found ${allUrls.length} URLs so far`);
    } catch (err) {
      console.warn(`  Failed to search "${query}": ${err.message}`);
    }
  }

  console.log(`Total unique image URLs found: ${allUrls.length}`);
  return allUrls.slice(0, count);
}

/**
 * Download, validate, and upload an image to Supabase storage.
 * Returns the public URL on success, null on failure.
 */
async function downloadAndUpload(imageUrl, playerId) {
  try {
    const imageBuffer = await fetchImage(imageUrl);

    // Basic validation: must be at least 5KB (skip tiny/broken images)
    if (imageBuffer.length < 5000) {
      return null;
    }

    // Detect content type from first bytes
    let ext = 'jpg';
    let contentType = 'image/jpeg';
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) {
      ext = 'png';
      contentType = 'image/png';
    } else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) {
      ext = 'webp';
      contentType = 'image/webp';
    }

    const filename = `${playerId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('player-avatars')
      .upload(filename, imageBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.warn(`    Upload failed for ${playerId}: ${uploadError.message}`);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('player-avatars')
      .getPublicUrl(filename);

    return urlData.publicUrl;
  } catch (err) {
    return null;
  }
}

async function main() {
  // 1. Find the BMHL league
  console.log('Looking up BMHL league...');
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, slug')
    .eq('slug', BMHL_SLUG)
    .single();

  if (leagueError || !league) {
    console.error('Could not find BMHL league. Trying alternative slugs...');

    // Try broader search
    const { data: leagues } = await supabase
      .from('leagues')
      .select('id, name, slug')
      .ilike('name', '%bmhl%');

    if (!leagues || leagues.length === 0) {
      const { data: allLeagues } = await supabase
        .from('leagues')
        .select('id, name, slug')
        .limit(20);
      console.log('Available leagues:', allLeagues?.map(l => `${l.slug} (${l.name})`));
      console.error('No BMHL league found. Update BMHL_SLUG at the top of this script.');
      process.exit(1);
    }

    console.log('Found:', leagues.map(l => `${l.slug} (${l.name})`));
    // Use the first match
    Object.assign(league, leagues[0]);
  }

  console.log(`Found league: ${league.name} (${league.slug}, ID: ${league.id})`);

  // 2. Find all players on rosters in this league who lack an avatar
  console.log('Finding players without avatars...');
  const { data: rosters, error: rosterError } = await supabase
    .from('team_rosters')
    .select('player_id, profiles(id, full_name, avatar_url)')
    .eq('league_id', league.id);

  if (rosterError) {
    console.error('Error fetching rosters:', rosterError.message);
    process.exit(1);
  }

  // Filter to unique players without avatars
  const seen = new Set();
  const playersNeedingAvatars = [];
  for (const roster of rosters) {
    const profile = roster.profiles;
    if (!profile || seen.has(profile.id)) continue;
    seen.add(profile.id);
    if (!profile.avatar_url) {
      playersNeedingAvatars.push({ id: profile.id, name: profile.full_name });
    }
  }

  console.log(`Total rostered players: ${seen.size}`);
  console.log(`Players without avatars: ${playersNeedingAvatars.length}`);

  if (playersNeedingAvatars.length === 0) {
    console.log('All players already have avatars! Nothing to do.');
    return;
  }

  // 3. Scrape hockey headshot images
  const imageUrls = await scrapeHockeyHeadshots(playersNeedingAvatars.length + 20);

  if (imageUrls.length === 0) {
    console.error('No images found. Try running again or check network.');
    process.exit(1);
  }

  // 4. Assign images to players
  console.log(`\nAssigning images to ${playersNeedingAvatars.length} players...`);
  let success = 0;
  let failed = 0;
  let imageIndex = 0;

  for (const player of playersNeedingAvatars) {
    // Try up to 3 different images per player in case some fail to download
    let avatarUrl = null;
    for (let attempt = 0; attempt < 3 && !avatarUrl; attempt++) {
      if (imageIndex >= imageUrls.length) {
        // Wrap around and reuse images
        imageIndex = 0;
      }
      avatarUrl = await downloadAndUpload(imageUrls[imageIndex], player.id);
      imageIndex++;
    }

    if (!avatarUrl) {
      console.log(`  SKIP ${player.name} (${player.id}) - all image downloads failed`);
      failed++;
      continue;
    }

    // Update the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', player.id);

    if (updateError) {
      console.log(`  FAIL ${player.name}: ${updateError.message}`);
      failed++;
    } else {
      console.log(`  OK   ${player.name} -> ${avatarUrl.split('/').pop()}`);
      success++;
    }

    // Small delay to be nice to Bing and Supabase
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\nDone! ${success} avatars assigned, ${failed} failed.`);
}

main().catch(console.error);
