# PWA Icons

This directory contains all Progressive Web App (PWA) icons for the Hockey Stats application.

## Quick Start

### Option 1: Generate from Your Logo

If you have a league logo, generate all required icon sizes automatically:

```bash
# Install sharp (image processing library)
npm install --save-dev sharp

# Generate icons from your logo
node scripts/generate-pwa-icons.js path/to/your-logo.png
```

**Logo Requirements:**
- Minimum size: 512x512 pixels
- Square aspect ratio (1:1)
- Format: PNG or SVG
- Transparent background recommended
- High contrast for visibility

### Option 2: Use Placeholder Icons

Placeholder icons are provided for testing. To generate them:

```bash
node scripts/generate-pwa-icons.js public/icons/placeholder-logo.svg
```

## Required Icon Sizes

The PWA manifest requires the following icon sizes:

| Size | Purpose | File Name |
|------|---------|-----------|
| 72x72 | Small devices | icon-72x72.png |
| 96x96 | Medium devices | icon-96x96.png |
| 128x128 | Desktop shortcuts | icon-128x128.png |
| 144x144 | Windows tiles | icon-144x144.png |
| 152x152 | iOS devices | icon-152x152.png |
| 192x192 | Android devices | icon-192x192.png |
| 384x384 | Large displays | icon-384x384.png |
| 512x512 | Splash screens | icon-512x512.png |
| 512x512 | Maskable icon (with padding) | maskable-icon-512x512.png |
| 180x180 | Apple Touch Icon | apple-touch-icon.png |
| 32x32 | Favicon | favicon-32x32.png |
| 16x16 | Favicon | favicon-16x16.png |

## Icon Types

### Standard Icons
Regular PWA icons with transparent backgrounds. Used on most platforms.

### Maskable Icons
Icons with padding to ensure the important content stays visible when masked by different shapes (circle, squircle, rounded square) on Android devices.

The generator adds 10% padding around your logo on a red background (#E31837).

### Apple Touch Icon
Special icon for iOS home screen. Has a white background to ensure visibility.

### Favicons
Small icons for browser tabs and bookmarks.

## Manual Icon Creation

If you prefer to create icons manually:

1. **Design at 512x512** - Start with the largest size for best quality
2. **Keep it simple** - Icons should be recognizable at small sizes
3. **High contrast** - Use bold colors and shapes
4. **Centered design** - Leave padding around edges for maskable icons
5. **Test at all sizes** - Ensure legibility from 16px to 512px

### Recommended Tools:
- **Figma** - Professional design tool (free tier available)
- **Inkscape** - Free vector graphics editor
- **GIMP** - Free raster graphics editor
- **Canva** - Simple online design tool

## Testing Icons

### iOS (Safari)
1. Open app in Safari on iPhone/iPad
2. Tap Share button
3. Tap "Add to Home Screen"
4. Verify icon appears correctly

### Android (Chrome)
1. Open app in Chrome on Android
2. Tap menu (three dots)
3. Tap "Add to Home screen" or "Install app"
4. Verify icon appears correctly

### Desktop (Chrome/Edge)
1. Open app in Chrome or Edge
2. Look for install icon in address bar
3. Click to install
4. Verify icon on desktop/taskbar

## Troubleshooting

### Icons not updating after regeneration
- Clear browser cache (Ctrl/Cmd + Shift + R)
- Uninstall PWA and reinstall
- Check browser DevTools → Application → Manifest

### Icons appear blurry
- Ensure source logo is high resolution (512x512+)
- Use PNG or SVG format (not JPG)
- Don't upscale small images

### Maskable icon gets clipped
- Increase padding in source logo
- Keep important content in center 80% of image
- Test with [Maskable.app](https://maskable.app/)

## Current Status

- ⏳ **Placeholder SVG logo** - Ready for icon generation
- ⏳ **Icon generation script** - Ready to use
- ⏳ **Actual icons** - Need to be generated from league logo

## Next Steps

1. Obtain league logo from stakeholder
2. Run generation script: `node scripts/generate-pwa-icons.js path/to/logo.png`
3. Test icons on iOS and Android devices
4. Update manifest.json if icon paths change
5. Commit generated icons to repository

## Files

```
public/icons/
├── README.md                       # This file
├── placeholder-logo.svg            # Temporary placeholder logo
├── icon-72x72.png                  # (to be generated)
├── icon-96x96.png                  # (to be generated)
├── icon-128x128.png                # (to be generated)
├── icon-144x144.png                # (to be generated)
├── icon-152x152.png                # (to be generated)
├── icon-192x192.png                # (to be generated)
├── icon-384x384.png                # (to be generated)
├── icon-512x512.png                # (to be generated)
├── maskable-icon-512x512.png       # (to be generated)
├── apple-touch-icon.png            # (to be generated)
├── favicon-32x32.png               # (to be generated)
└── favicon-16x16.png               # (to be generated)
```

## Additional Resources

- [PWA Icons Best Practices](https://web.dev/maskable-icon/)
- [Maskable Icon Tester](https://maskable.app/)
- [Favicon Generator](https://favicon.io/)
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
