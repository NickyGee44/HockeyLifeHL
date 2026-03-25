import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
  const publicDir = join(__dirname, '..', 'apps', 'league-sites', 'public', 'leagues', 'woha');

  const uploads = [
    // History/Championship photos (updated high-res versions)
    {
      bucket: 'gallery-images',
      folder: 'history',
      prefix: 'woha/history/',
      files: [
        '16_17.jpg',
        '86_87.jpg',
        '88_92.jpg',
        '94_95.jpg',
        '96_97.jpg',
        '99_00.jpg',
        '2025_champs_universal.jpg',
        'founders.jpg'
      ]
    },
    // Gallery - 2021-2022 team photos (updated high-res)
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
    // Gallery - Father-son photos (updated high-res + new images)
    {
      bucket: 'gallery-images',
      folder: 'gallery/father-son',
      prefix: 'woha/father-son/',
      files: [
        'father_son_Franklands.jpg',
        'father_son_Mrusek.jpg',
        'father_son_Oderico.jpg',
        'father_son_goalie_trio.jpg',
        'father_son_grossi_trio.png'
      ]
    },
    // Gallery - 2023-2024 team photos (NEW)
    {
      bucket: 'gallery-images',
      folder: 'gallery/2023-2024',
      prefix: 'woha/2023-2024/',
      files: [
        '2023_2024_photos_1.jpg',
        '2023_2024_photos_2.jpg',
        '2023_2024_photos_3.jpg',
        '2023_2024_photos_4.jpg',
        '2023_2024_photos_5.jpg',
        '2023_2024_photos_6.jpg',
        '2023_2024_photos_7.jpg',
        '2023_2024_photos_8.jpg',
        '2023_2024_photos_9.jpg'
      ]
    }
  ];

  for (const upload of uploads) {
    console.log(`\nUploading to bucket: ${upload.bucket}, folder: ${upload.folder}`);
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
  console.log('\nNext step: Update database gallery albums with new 2023-2024 album');
}

uploadImages();
