/**
 * Generate team logos using Gemini API image generation.
 *
 * Uses the Gemini CLI's OAuth credentials and the @google/genai SDK
 * to generate hockey team logos, then uploads them to Supabase storage
 * and updates the team records.
 *
 * Usage: npx tsx scripts/generate-team-logos.ts
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env from league-builder
dotenv.config({ path: path.join(__dirname, '../apps/league-builder/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_CONFIG_DIR = path.join(process.env.USERPROFILE || process.env.HOME || '', '.gemini');

// Supabase client with service role for uploads
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Batch size to avoid rate limits
const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES_MS = 3000;

interface Team {
  id: string;
  name: string;
  primary_color: string | null;
  logo_url: string | null;
}

async function getOAuthAccessToken(): Promise<string> {
  const credsPath = path.join(GEMINI_CONFIG_DIR, 'oauth_creds.json');
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

  // Check if token is expired (with 5 min buffer)
  if (creds.expiry_date && Date.now() > creds.expiry_date - 300000) {
    console.log('OAuth token may be expired. Run `gemini` once to refresh it, then re-run this script.');
    process.exit(1);
  }

  return creds.access_token;
}

async function generateLogoImage(teamName: string, primaryColor: string): Promise<Buffer | null> {
  const accessToken = await getOAuthAccessToken();

  const prompt = `Generate a professional hockey team logo for a beer league hockey team called "${teamName}".
The logo should:
- Be a clean, modern sports logo design
- Use ${primaryColor} as the primary color
- Have a transparent or dark background
- Be suitable as a team avatar/icon
- Feature imagery that relates to the team name "${teamName}"
- Look like a professional hockey team crest or emblem
- Be simple enough to be recognizable at small sizes (48x48px)

Generate ONLY the logo image, no text explanation.`;

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  API error for ${teamName}: ${response.status} - ${errorText.slice(0, 200)}`);
      return null;
    }

    const data = await response.json();

    // Find the image part in the response
    const candidates = data.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          return Buffer.from(part.inlineData.data, 'base64');
        }
      }
    }

    console.error(`  No image generated for ${teamName}`);
    return null;
  } catch (err) {
    console.error(`  Error generating logo for ${teamName}:`, err);
    return null;
  }
}

async function uploadToSupabase(teamId: string, imageBuffer: Buffer): Promise<string | null> {
  const filePath = `team-logos/${teamId}-${Date.now()}.png`;

  const { error } = await supabase.storage
    .from('public')
    .upload(filePath, imageBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    console.error(`  Upload error for ${teamId}:`, error.message);
    return null;
  }

  const { data: urlData } = supabase.storage.from('public').getPublicUrl(filePath);
  return urlData.publicUrl;
}

async function updateTeamLogoUrl(teamId: string, logoUrl: string): Promise<boolean> {
  const { error } = await supabase
    .from('teams')
    .update({ logo_url: logoUrl })
    .eq('id', teamId);

  if (error) {
    console.error(`  DB update error for ${teamId}:`, error.message);
    return false;
  }
  return true;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== BMHL Team Logo Generator ===\n');

  // Fetch BMHL teams without logos
  const { data: bmhlLeague } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', 'barrie-mens-hockey-league')
    .single();

  if (!bmhlLeague) {
    // Try finding by name
    const { data: league } = await supabase
      .from('leagues')
      .select('id, name, slug')
      .ilike('name', '%barrie%')
      .single();

    if (!league) {
      console.error('Could not find BMHL league');
      process.exit(1);
    }
    console.log(`Found league: ${league.name} (${league.slug})`);
    var leagueId = league.id;
  } else {
    var leagueId = bmhlLeague.id;
  }

  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, name, primary_color, logo_url')
    .eq('league_id', leagueId)
    .is('logo_url', null)
    .order('name');

  if (error || !teams) {
    console.error('Error fetching teams:', error);
    process.exit(1);
  }

  console.log(`Found ${teams.length} BMHL teams without logos\n`);

  if (teams.length === 0) {
    console.log('All teams already have logos!');
    return;
  }

  let success = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < teams.length; i += BATCH_SIZE) {
    const batch = teams.slice(i, i + BATCH_SIZE);
    console.log(`\n--- Batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(teams.length / BATCH_SIZE)} ---`);

    const promises = batch.map(async (team) => {
      const color = team.primary_color || '#D4AF37';
      console.log(`  Generating logo for: ${team.name} (${color})`);

      const imageBuffer = await generateLogoImage(team.name, color);
      if (!imageBuffer) {
        failed++;
        return;
      }

      console.log(`  Uploading ${team.name} logo (${(imageBuffer.length / 1024).toFixed(1)}KB)...`);
      const logoUrl = await uploadToSupabase(team.id, imageBuffer);
      if (!logoUrl) {
        failed++;
        return;
      }

      const updated = await updateTeamLogoUrl(team.id, logoUrl);
      if (updated) {
        console.log(`  ✓ ${team.name} - logo saved`);
        success++;
      } else {
        failed++;
      }
    });

    await Promise.all(promises);

    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < teams.length) {
      console.log(`  Waiting ${DELAY_BETWEEN_BATCHES_MS / 1000}s before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  console.log(`\n=== Done! ===`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${teams.length}`);
}

main().catch(console.error);
