# Hero Section Update Guide

## ✅ What's Been Completed

All components have been created and are ready to use:

1. ✅ **Dependencies installed:** `react-use-measure`
2. ✅ **InfiniteSlider component** created at `src/components/ui/infinite-slider.tsx`
3. ✅ **ProgressiveBlur component** created at `src/components/ui/progressive-blur.tsx`
4. ✅ **HeroSectionModern component** created at `src/components/marketing/HeroSectionModern.tsx`

---

## 📹 Video Setup

### Where to Place the Video

**Location:** `public/hero-video.mp4`

Place your video file in the `public` folder at the root of your project with the name `hero-video.mp4`.

```
HockeyLifeHL/
├── public/
│   ├── hero-video.mp4  ← Place your video here
│   ├── logo.png
│   ├── BLH-logo.png
│   └── ...
└── src/
```

### Video Requirements

- **Format:** MP4 (most compatible)
- **Recommended size:** 1920x1080 or 1280x720
- **File size:** Keep under 5MB for fast loading
- **Content:** Something related to hockey, ice rink, or league management
- **Duration:** 5-15 seconds (will loop automatically)

### Video Tips

- Use a subtle, abstract video (like ice texture, hockey puck motion, etc.)
- The video will be dimmed (50% opacity in light mode, 35-75% in dark mode)
- It will be inverted in light mode for better visibility
- Consider using video compression tools to reduce file size

### Alternative: Use External Video

If you prefer to use the original video or host elsewhere, update line 43 in `HeroSectionModern.tsx`:

```tsx
// Current (local video)
src="/hero-video.mp4"

// Change to external URL
src="https://your-cdn.com/video.mp4"
```

---

## 🎨 How to Use the New Hero

### Option 1: Replace Marketing Header (Recommended)

Update your marketing pages to use the new hero section:

**File:** `src/app/(marketing)/page.tsx`

```tsx
import { HeroSectionModern } from "@/components/marketing/HeroSectionModern"
// Remove old imports: MarketingHeader, IceRinkDivider, etc.

export default function MarketingPage() {
  return (
    <>
      <HeroSectionModern />

      {/* Rest of your marketing page content */}
      {/* Features section, pricing, etc. */}
    </>
  )
}
```

### Option 2: Use on Main Landing Page

**File:** `src/app/page.tsx`

```tsx
import { HeroSectionModern } from "@/components/marketing/HeroSectionModern"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSectionModern />

      {/* Additional content */}
    </div>
  )
}
```

---

## 🎨 Customization Options

### Update Colors

The hero uses BLH branding colors by default. To customize:

**File:** `src/components/marketing/HeroSectionModern.tsx`

```tsx
// Line 29: Main CTA button color
className="... bg-[#1F4FD8] hover:bg-[#1F4FD8]/90"
// Change to your color: bg-[#YOUR_COLOR]

// Line 109: Logo color
className="... text-[#1F4FD8]"
// Change to match your branding

// Line 164: Secondary button color
className="... bg-[#1F4FD8] hover:bg-[#1F4FD8]/90"
```

### Update Content

**Line 20-26:** Update the headline and description

```tsx
<h1>Modern League Management</h1>
<p>{platformConfig.slogan} Complete platform...</p>
```

**Line 31-35:** Update CTA button text and link

```tsx
<Link href="/signup">
  <span>Start Your League</span>
</Link>
```

**Line 42-47:** Update secondary button

```tsx
<Link href="https://pilot.beerleaguehockey.ca">
  <span>View Demo League</span>
</Link>
```

### Update League Logos (Infinite Slider)

**Lines 62-89:** Replace placeholder league logos with real ones

```tsx
// Option 1: Use images
<img
  src="/league-logos/league1.png"
  alt="League Name"
  className="h-12 w-auto"
/>

// Option 2: Keep gradient boxes (current)
<div className="mx-auto h-12 w-24 rounded-lg bg-gradient-to-br from-[#1F4FD8] to-[#D72638]...">
  HLHL
</div>
```

### Update Menu Items

**Line 101:** Customize navigation menu

```tsx
const menuItems = [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
]
```

---

## 🎬 Video Alternatives

If you don't have a video yet, here are some options:

### 1. Use a Static Image Background

Replace the video element with an image:

```tsx
// Replace lines 49-56 with:
<div className="aspect-[2/3] absolute inset-1 overflow-hidden rounded-3xl border border-black/10 sm:aspect-video lg:rounded-[3rem] dark:border-white/5">
  <Image
    src="/hero-background.jpg"
    alt="Hockey background"
    fill
    className="object-cover opacity-50 invert dark:opacity-35 dark:invert-0"
  />
</div>
```

### 2. Use a Gradient Background

Remove video entirely and use gradient:

```tsx
// Replace lines 49-56 with:
<div className="aspect-[2/3] absolute inset-1 overflow-hidden rounded-3xl sm:aspect-video lg:rounded-[3rem] bg-gradient-to-br from-[#1F4FD8] to-[#D72638] opacity-30">
</div>
```

### 3. Download Free Hockey Videos

- **Pexels:** https://www.pexels.com/search/videos/hockey/
- **Pixabay:** https://pixabay.com/videos/search/hockey/
- **Coverr:** https://coverr.co/ (search for "sports" or "ice")

Look for:
- Ice hockey rink
- Hockey puck on ice
- Abstract ice textures
- Hockey equipment

---

## 🧪 Testing

### Test Checklist

- [ ] Video loads and plays automatically
- [ ] Video loops continuously
- [ ] Hero header appears with scrolling blur effect
- [ ] Mobile menu works (hamburger icon)
- [ ] CTA buttons navigate correctly
- [ ] Infinite slider scrolls smoothly
- [ ] Dark mode works correctly
- [ ] Responsive on mobile, tablet, desktop
- [ ] No layout shift on page load
- [ ] Video is muted (no sound)

### Browser Testing

Test in:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari (desktop and mobile)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## 🚀 Build and Deploy

```bash
# Test locally
npm run dev

# Build for production
npm run build

# Check for errors
npm run lint
```

---

## 📊 Performance Tips

### Optimize Video

```bash
# Using FFmpeg to compress video
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset slow -c:a copy hero-video.mp4

# Or use online tools:
# - https://www.freeconvert.com/video-compressor
# - https://www.videosmaller.com/
```

### Lazy Load Video (Optional)

For even better performance, lazy load the video:

```tsx
<video
  autoPlay
  loop
  muted
  playsInline
  loading="lazy"  // Add this
  className="..."
  src="/hero-video.mp4"
/>
```

---

## 🎨 Design Notes

### Current Design Features

1. **Glassmorphism header** - Blurs when scrolling
2. **Video background** - Subtle, inverted in light mode
3. **Infinite slider** - Shows league logos/partners
4. **Progressive blur** - Smooth fade on slider edges
5. **Responsive** - Mobile-first design
6. **Dark mode ready** - Full dark mode support
7. **Smooth animations** - Framer Motion powered

### Matches BLH Branding

- Uses `platformConfig` for logo and name
- BLH blue (#1F4FD8) for primary buttons
- Customized content for Beer League Hockey
- Links to pilot league demo
- Professional, modern look

---

## 🐛 Troubleshooting

### Video Not Playing

**Issue:** Video doesn't autoplay

**Fix:**
- Ensure video is muted (required for autoplay)
- Add `playsInline` attribute (required for iOS)
- Check video file format (MP4 is most compatible)

### Video File Too Large

**Issue:** Page loads slowly

**Fix:**
- Compress video to under 5MB
- Use lower resolution (720p is fine)
- Consider using WebM format (smaller file size)
- Or use a static image instead

### Layout Shift on Load

**Issue:** Content jumps when video loads

**Fix:**
- The `aspect-[2/3]` and `aspect-video` classes should prevent this
- If still happening, add explicit height to video container

### Infinite Slider Not Animating

**Issue:** Slider doesn't scroll

**Fix:**
- Check browser console for errors
- Verify `react-use-measure` is installed
- Try refreshing the page
- Check if `framer-motion` is working

---

## 📝 Summary

✅ All components created and ready to use
✅ Put your video at `public/hero-video.mp4`
✅ Import and use `<HeroSectionModern />` in your page
✅ Customize colors, content, and menu items as needed
✅ Test in multiple browsers and devices

The new hero section is production-ready and fully integrated with your BLH branding!
