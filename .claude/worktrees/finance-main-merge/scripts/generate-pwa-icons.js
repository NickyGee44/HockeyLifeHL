#!/usr/bin/env node

/**
 * PWA Icon Generator
 *
 * This script generates all required PWA icon sizes from a source logo image.
 *
 * Usage:
 *   node scripts/generate-pwa-icons.js <source-logo-path>
 *
 * Example:
 *   node scripts/generate-pwa-icons.js assets/logo.png
 *
 * Requirements:
 *   npm install sharp
 *
 * Output:
 *   - public/icons/icon-72x72.png
 *   - public/icons/icon-96x96.png
 *   - public/icons/icon-128x128.png
 *   - public/icons/icon-144x144.png
 *   - public/icons/icon-152x152.png
 *   - public/icons/icon-192x192.png
 *   - public/icons/icon-384x384.png
 *   - public/icons/icon-512x512.png
 *   - public/icons/maskable-icon-512x512.png (with padding for maskable)
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Error: sharp is not installed');
  console.log('📦 Install it with: npm install sharp');
  console.log('   or: npm install --save-dev sharp');
  process.exit(1);
}

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

async function generateIcons(sourcePath) {
  // Validate source file exists
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Error: Source file not found: ${sourcePath}`);
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created directory: ${OUTPUT_DIR}`);
  }

  console.log(`🎨 Generating PWA icons from: ${sourcePath}\n`);

  try {
    // Get source image metadata
    const metadata = await sharp(sourcePath).metadata();
    console.log(`Source image: ${metadata.width}x${metadata.height} (${metadata.format})\n`);

    // Generate standard icons
    for (const size of ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

      await sharp(sourcePath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated: icon-${size}x${size}.png`);
    }

    // Generate maskable icon (512x512 with padding)
    const maskableSize = 512;
    const maskablePadding = Math.floor(maskableSize * 0.1); // 10% padding
    const contentSize = maskableSize - (maskablePadding * 2);

    const maskablePath = path.join(OUTPUT_DIR, `maskable-icon-${maskableSize}x${maskableSize}.png`);

    await sharp(sourcePath)
      .resize(contentSize, contentSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .extend({
        top: maskablePadding,
        bottom: maskablePadding,
        left: maskablePadding,
        right: maskablePadding,
        background: { r: 227, g: 24, b: 55, alpha: 1 } // HockeyLife red
      })
      .png()
      .toFile(maskablePath);

    console.log(`✅ Generated: maskable-icon-${maskableSize}x${maskableSize}.png (with padding)`);

    // Generate Apple Touch Icon (180x180)
    const appleTouchPath = path.join(OUTPUT_DIR, 'apple-touch-icon.png');
    await sharp(sourcePath)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(appleTouchPath);

    console.log(`✅ Generated: apple-touch-icon.png`);

    // Generate favicon (32x32 and 16x16)
    const favicon32Path = path.join(OUTPUT_DIR, 'favicon-32x32.png');
    const favicon16Path = path.join(OUTPUT_DIR, 'favicon-16x16.png');

    await sharp(sourcePath)
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(favicon32Path);

    await sharp(sourcePath)
      .resize(16, 16, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(favicon16Path);

    console.log(`✅ Generated: favicon-32x32.png`);
    console.log(`✅ Generated: favicon-16x16.png`);

    console.log('\n✨ All icons generated successfully!');
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Review the generated icons in public/icons/');
    console.log('   2. Update manifest.json if needed');
    console.log('   3. Add icon links to your HTML <head>');
    console.log('   4. Test PWA installation on iOS and Android');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('🎨 PWA Icon Generator\n');
  console.log('Usage:');
  console.log('  node scripts/generate-pwa-icons.js <source-logo-path>');
  console.log('\nExample:');
  console.log('  node scripts/generate-pwa-icons.js assets/logo.png');
  console.log('  node scripts/generate-pwa-icons.js assets/logo.svg');
  console.log('\nThe source logo should be:');
  console.log('  - At least 512x512 pixels');
  console.log('  - Square aspect ratio (1:1)');
  console.log('  - PNG or SVG format');
  console.log('  - Transparent background (optional but recommended)');
  console.log('\nOutput:');
  console.log('  All icons will be generated in public/icons/');
  process.exit(0);
}

const sourcePath = path.resolve(args[0]);
generateIcons(sourcePath);
