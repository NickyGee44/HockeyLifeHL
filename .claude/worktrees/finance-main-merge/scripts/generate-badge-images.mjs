/**
 * Generate Badge Images & BLH Sponsor Logo via Gemini API
 *
 * Usage: node scripts/generate-badge-images.mjs
 *
 * Generates PNG images for all 15 badge types + Beer League Hockey sponsor logo.
 * Uses Google's Gemini API with native image generation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BADGES_DIR = path.join(__dirname, '..', 'apps', 'league-sites', 'public', 'badges');
const SPONSORS_DIR = path.join(__dirname, '..', 'apps', 'league-sites', 'public', 'sponsors');

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${API_KEY}`;

if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY. Set it in your environment before running this script.');
  process.exit(1);
}

// Delay between API calls to avoid rate limiting
const DELAY_MS = 3000;

const BADGE_PROMPTS = [
  {
    type: 'championship',
    name: 'Championship',
    prompt:
      'Create a polished hockey achievement badge icon for "League Champion". A gleaming gold trophy/cup surrounded by a laurel wreath with crossed hockey sticks behind it. Rich gold and dark navy color scheme. Badge/medal circular shape. Clean vector-style design, 512x512px, white background.',
  },
  {
    type: 'top_scorer',
    name: 'Top Scorer',
    prompt:
      'Create a polished hockey achievement badge icon for "Top Goal Scorer". A hockey puck hitting the back of a net with a red goal light glowing above. Red and gold color scheme with a circular medal border. Clean vector-style design, 512x512px, white background.',
  },
  {
    type: 'points_leader',
    name: 'Points Leader',
    prompt:
      'Create a polished hockey achievement badge icon for "Points Leader". A hockey stick with a rising graph/arrow trending upward, surrounded by stars. Blue and gold color scheme with a circular medal border. Clean vector-style design, 512x512px, white background.',
  },
  {
    type: 'top_goalie',
    name: 'Top Goalie',
    prompt:
      'Create a polished hockey achievement badge icon for "Top Goalie". A goalie mask with a glowing shield emblem in front of a hockey net. Emerald green and silver color scheme with a circular medal border. Clean vector-style design, 512x512px, white background.',
  },
  {
    type: 'iron_man',
    name: 'Iron Man',
    prompt:
      'Create a polished hockey achievement badge icon for "Iron Man - Every Game Played". A strong iron fist gripping a hockey stick with chain links forming a circle border. Orange and dark steel color scheme. Clean vector-style design, 512x512px, white background.',
  },
  {
    type: 'most_assists',
    name: 'Most Assists',
    prompt:
      'Create a polished hockey achievement badge icon for "Most Assists". Two hockey sticks passing a puck between them with motion lines and a golden assist star. Purple and gold color scheme with a circular medal border. Clean vector-style design, 512x512px, white background.',
  },
  {
    type: 'best_plus_minus',
    name: 'Best Plus/Minus',
    prompt:
      'Create a polished hockey achievement badge icon for "Best Plus/Minus Rating". A bold "+" symbol with an upward arrow, hockey rink markings in background. Teal and gold color scheme with a circular medal border. Clean vector-style design, 512x512px, white background.',
  },
  {
    type: 'penalty_free',
    name: 'Penalty Free Season',
    prompt:
      'Create a polished hockey achievement badge icon for "Clean Sheet - Zero Penalties". A white glove/hand with a halo above it and a penalty box with an X through it. White, gold, and sky blue color scheme with a circular medal border. Clean vector-style design, 512x512px, white background.',
  },
  {
    type: 'division_top_scorer',
    name: 'Division Top Scorer',
    prompt:
      'Create a polished hockey achievement badge icon for "Division Top Scorer". A hockey puck on fire entering a net with a division bracket symbol. Crimson red and silver color scheme with a shield-shaped border. Clean vector-style design, 512x512px, white background.',
  },
  {
    type: 'division_points_leader',
    name: 'Division Points Leader',
    prompt:
      'Create a polished hockey achievement badge icon for "Division Points Leader". A crown sitting atop a hockey stick with a division bracket in the background. Royal blue and gold color scheme with a shield-shaped border. Clean vector-style design, 512x512px, white background.',
  },
  {
    type: 'division_top_goalie',
    name: 'Division Top Goalie',
    prompt:
      'Create a polished hockey achievement badge icon for "Division Top Goalie". A goalie glove making a spectacular save with a division shield behind it. Forest green and gold color scheme with a shield-shaped border. Clean vector-style design, 512x512px, white background.',
  },
  {
    type: 'team_mvp',
    name: 'Team MVP',
    prompt:
      'Create a polished hockey achievement badge icon for "Team MVP - Most Valuable Player". A golden star with "MVP" text centered, hockey sticks crossed behind. Gold, black, and white color scheme with a star-burst medal border. Clean vector-style design, 512x512px, white background.',
  },
  {
    type: 'rookie_of_the_year',
    name: 'Rookie of the Year',
    prompt:
      'Create a polished hockey achievement badge icon for "Rookie of the Year". A fresh green leaf sprouting from a hockey puck with a "1st" ribbon. Green and gold color scheme with a circular medal border. Clean vector-style design, 512x512px, white background.',
  },
  {
    type: 'hall_of_fame',
    name: 'Hall of Fame',
    prompt:
      'Create a polished hockey achievement badge icon for "Beer League Hockey Hall of Fame". A grand golden plaque with pillars on each side, a hockey stick and puck centered, and "HOF" engraved. Premium gold and dark marble color scheme with an ornate border. Clean vector-style design, 512x512px, white background.',
  },
  {
    type: 'shutout_king',
    name: 'Shutout King',
    prompt:
      'Create a polished hockey achievement badge icon for "Shutout King". A padlocked hockey net with a crown on top and a big zero. Royal purple and gold color scheme with a circular medal border. Clean vector-style design, 512x512px, white background.',
  },
];

const SPONSOR_PROMPT = {
  name: 'Beer League Hockey',
  filename: 'beer-league-hockey.png',
  prompt:
    'Create a professional sports league sponsor logo banner for "Beer League Hockey". Modern, clean design featuring a stylized beer mug integrated with a hockey stick and puck. Bold text reads "BEER LEAGUE HOCKEY" in a strong sans-serif font. Gold (#D4A843) and dark navy (#1a1a2e) color scheme. Rectangular banner format (roughly 3:1 aspect ratio), suitable for website sponsor placement. White background. Professional and fun tone.',
};

async function generateImage(prompt) {
  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      temperature: 1.0,
    },
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  // Extract image data from response
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith('image/')) {
      return Buffer.from(part.inlineData.data, 'base64');
    }
  }

  throw new Error('No image data in response');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // Ensure output directories exist
  fs.mkdirSync(BADGES_DIR, { recursive: true });
  fs.mkdirSync(SPONSORS_DIR, { recursive: true });

  console.log('=== Generating Badge Images via Gemini API ===\n');

  let successCount = 0;
  let failCount = 0;

  // Generate badge images
  for (const badge of BADGE_PROMPTS) {
    const outputPath = path.join(BADGES_DIR, `${badge.type}.png`);

    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`  [SKIP] ${badge.name} - already exists`);
      successCount++;
      continue;
    }

    process.stdout.write(`  Generating ${badge.name}...`);

    try {
      const imageBuffer = await generateImage(badge.prompt);
      fs.writeFileSync(outputPath, imageBuffer);
      console.log(` OK (${(imageBuffer.length / 1024).toFixed(1)}KB)`);
      successCount++;
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
      failCount++;
    }

    await sleep(DELAY_MS);
  }

  // Generate sponsor logo
  console.log('\n=== Generating BLH Sponsor Logo ===\n');

  const sponsorPath = path.join(SPONSORS_DIR, SPONSOR_PROMPT.filename);

  if (fs.existsSync(sponsorPath)) {
    console.log(`  [SKIP] ${SPONSOR_PROMPT.name} - already exists`);
    successCount++;
  } else {
    process.stdout.write(`  Generating ${SPONSOR_PROMPT.name} sponsor logo...`);

    try {
      const imageBuffer = await generateImage(SPONSOR_PROMPT.prompt);
      fs.writeFileSync(sponsorPath, imageBuffer);
      console.log(` OK (${(imageBuffer.length / 1024).toFixed(1)}KB)`);
      successCount++;
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n=== Done: ${successCount} success, ${failCount} failed ===`);

  if (failCount > 0) {
    console.log('\nTo retry failed images, just run this script again (it skips existing files).');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
