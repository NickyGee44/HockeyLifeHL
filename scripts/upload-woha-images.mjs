import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ntplczcmhvfkijjxavdl.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadImages() {
  const publicDir = join(__dirname, '..', 'public', 'leagues', 'woha');

  const uploads = [
    // Team logos
    {
      bucket: 'team-logos',
      folder: 'teams',
      prefix: 'woha/',
      files: [
        'advanced-tile.png',
        'big-m-steel.png',
        'edgewood.png',
        'provincial.png',
        'sun-brite.png',
        'universal.png'
      ]
    },
    // Sponsor logos
    {
      bucket: 'sponsor-logos',
      folder: 'sponsors',
      prefix: 'woha/',
      files: [
        'advanced-tile.png',
        'big-m-steel.png',
        'edgewood.png',
        'provincial.png',
        'sun-brite.png',
        'universal.png'
      ]
    },
    // Gallery - 2021-2022 team photos
    {
      bucket: 'gallery-images',
      folder: 'gallery/2021-2022',
      prefix: 'woha/2021-2022/',
      files: [
        '21_22_provincial.jpg',
        '21_22_whiteleafs.jpg',
        '21_22_wohabbyblue.jpg',
        '21_22_wohared.jpg',
        '21_22_wohawhite.jpg',
        '21_22_wohayellow.jpg'
      ]
    },
    // Gallery - Father-son photos
    {
      bucket: 'gallery-images',
      folder: 'gallery/father-son',
      prefix: 'woha/father-son/',
      files: [
        'father_son_Franklands.jpg',
        'father_son_Mrusek.jpg',
        'father_son_Oderico.jpg',
        'father_son_goalie_trio.jpg'
      ]
    },
    // History/Championship photos
    {
      bucket: 'gallery-images',
      folder: 'history',
      prefix: 'woha/history/',
      files: [
        '86_87.jpg',
        '88_92.jpg',
        '94_95.jpg',
        '96_97.jpg',
        '99_00.jpg',
        '16_17.jpg',
        '2025_champs_universal.jpg',
        'founders.jpg'
      ]
    }
  ];

  for (const upload of uploads) {
    console.log(`\nUploading to bucket: ${upload.bucket}`);
    const folderPath = join(publicDir, upload.folder);

    for (const file of upload.files) {
      const filePath = join(folderPath, file);
      const storagePath = `${upload.prefix}${file}`;

      try {
        const fileBuffer = readFileSync(filePath);
        const contentType = file.endsWith('.png') ? 'image/png' : 'image/jpeg';

        const { data, error } = await supabase.storage
          .from(upload.bucket)
          .upload(storagePath, fileBuffer, {
            contentType,
            upsert: true
          });

        if (error) {
          console.error(`  ✗ ${file}: ${error.message}`);
        } else {
          console.log(`  ✓ ${file} -> ${storagePath}`);
        }
      } catch (err) {
        console.error(`  ✗ ${file}: ${err.message}`);
      }
    }
  }

  console.log('\n✅ Upload complete!');
  console.log('\nNext step: Update database URLs to use Supabase Storage URLs');
}

uploadImages();
