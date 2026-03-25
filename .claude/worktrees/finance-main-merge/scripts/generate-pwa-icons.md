# Generate PWA Icons and Favicon

Since we can't programmatically generate images, here's how to create the required icons:

## Required Icon Sizes

1. **favicon.ico** - 32x32 (multi-resolution ICO file)
2. **favicon-16x16.png** - 16x16
3. **favicon-32x32.png** - 32x32
4. **apple-touch-icon.png** - 180x180
5. **icon-192x192.png** - 192x192 (PWA)
6. **icon-512x512.png** - 512x512 (PWA)

## Quick Method: Online Tools

1. Go to https://realfavicongenerator.net/
2. Upload `public/logo.png`
3. Configure:
   - iOS: 180x180
   - Android Chrome: 192x192 and 512x512
   - Favicon: 32x32
4. Download the generated files
5. Place them in `public/icons/` directory

## Manual Method: Image Editor

1. Open `public/logo.png` in an image editor (Photoshop, GIMP, etc.)
2. Resize to each required size
3. Save as PNG (except favicon.ico)
4. For favicon.ico, use an online converter or ImageMagick:
   ```bash
   convert logo.png -resize 32x32 favicon.ico
   ```

## File Structure After Generation

```
public/
├── icons/
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   ├── icon-192x192.png
│   └── icon-512x512.png
├── logo.png (source)
└── manifest.json
```

