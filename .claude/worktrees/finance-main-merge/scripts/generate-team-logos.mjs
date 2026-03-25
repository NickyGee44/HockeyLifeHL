/**
 * Generate team logos using Gemini API image generation.
 *
 * Uses gemini-2.0-flash-exp-image-generation model to create hockey team logos,
 * uploads them to Supabase storage, and updates team records.
 *
 * Usage: node scripts/generate-team-logos.mjs
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from league-builder
dotenv.config({ path: path.join(__dirname, '../apps/league-builder/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.0-flash-exp-image-generation';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
  console.error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Process 3 at a time to respect rate limits
const BATCH_SIZE = 3;
const DELAY_BETWEEN_BATCHES_MS = 5000;

async function generateLogoImage(teamName, primaryColor) {
  const prompt = `Generate a professional hockey team logo for a beer league hockey team called "${teamName}".
Use ${primaryColor} as the primary color. Dark background.
Clean modern sports emblem/crest style, suitable as a team avatar at small sizes.
Feature imagery that relates to the team name "${teamName}".
Generate ONLY the image.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      }
    );

    if (response.status === 429) {
      console.log(`    Rate limited for ${teamName}, waiting 30s...`);
      await sleep(30000);
      return generateLogoImage(teamName, primaryColor); // retry
    }

    if (response.status !== 200) {
      const errText = await response.text();
      console.error(`    API error for ${teamName}: ${response.status} - ${errText.slice(0, 200)}`);
      return null;
    }

    const data = await response.json();
    const candidates = data.candidates || [];

    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          return Buffer.from(part.inlineData.data, 'base64');
        }
      }
    }

    console.error(`    No image generated for ${teamName}`);
    return null;
  } catch (err) {
    console.error(`    Error generating logo for ${teamName}:`, err.message);
    return null;
  }
}

async function uploadToSupabase(teamId, imageBuffer) {
  const filePath = `team-logos/${teamId}-${Date.now()}.png`;

  const { error } = await supabase.storage
    .from('public')
    .upload(filePath, imageBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    console.error(`    Upload error for ${teamId}:`, error.message);
    return null;
  }

  const { data: urlData } = supabase.storage.from('public').getPublicUrl(filePath);
  return urlData.publicUrl;
}

async function updateTeamLogoUrl(teamId, logoUrl) {
  const { error } = await supabase
    .from('teams')
    .update({ logo_url: logoUrl })
    .eq('id', teamId);

  if (error) {
    console.error(`    DB update error for ${teamId}:`, error.message);
    return false;
  }
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== BMHL Team Logo Generator ===\n');

  // Find BMHL league
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, slug')
    .ilike('name', '%barrie%')
    .single();

  if (!league) {
    console.error('Could not find BMHL league');
    process.exit(1);
  }

  console.log(`League: ${league.name} (${league.slug})\n`);

  // Fetch teams without logos
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, name, primary_color, logo_url')
    .eq('league_id', league.id)
    .is('logo_url', null)
    .order('name');

  if (error || !teams) {
    console.error('Error fetching teams:', error);
    process.exit(1);
  }

  console.log(`Found ${teams.length} teams without logos\n`);

  if (teams.length === 0) {
    console.log('All teams already have logos!');
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < teams.length; i += BATCH_SIZE) {
    const batch = teams.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(teams.length / BATCH_SIZE);
    console.log(`--- Batch ${batchNum}/${totalBatches} ---`);

    for (const team of batch) {
      const color = team.primary_color || '#D4AF37';
      console.log(`  [${i + batch.indexOf(team) + 1}/${teams.length}] ${team.name} (${color})`);

      const imageBuffer = await generateLogoImage(team.name, color);
      if (!imageBuffer) {
        failed++;
        continue;
      }

      console.log(`    Generated ${(imageBuffer.length / 1024).toFixed(0)}KB, uploading...`);
      const logoUrl = await uploadToSupabase(team.id, imageBuffer);
      if (!logoUrl) {
        failed++;
        continue;
      }

      const updated = await updateTeamLogoUrl(team.id, logoUrl);
      if (updated) {
        console.log(`    Done!`);
        success++;
      } else {
        failed++;
      }

      // Small delay between individual requests
      await sleep(1500);
    }

    if (i + BATCH_SIZE < teams.length) {
      console.log(`  Waiting ${DELAY_BETWEEN_BATCHES_MS / 1000}s...\n`);
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${teams.length}`);
}

main().catch(console.error);
