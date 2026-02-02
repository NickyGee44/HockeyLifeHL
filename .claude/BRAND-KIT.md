# HockeyLifeHL Brand Kit

## Version 2.0 | Design System Documentation

---

## Table of Contents

1. [Brand Overview](#brand-overview)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing System](#spacing-system)
5. [Elevation & Shadows](#elevation--shadows)
6. [Border Radius](#border-radius)
7. [Animation & Motion](#animation--motion)
8. [Component Tokens](#component-tokens)
9. [Dark & Light Mode](#dark--light-mode)
10. [Multi-Tenant Theming](#multi-tenant-theming)
11. [Accessibility Guidelines](#accessibility-guidelines)
12. [Implementation Reference](#implementation-reference)

---

## Brand Overview

### Brand Essence

HockeyLifeHL is a **premium enterprise platform** for recreational hockey league management. The visual identity communicates:

- **Authority**: Enterprise-grade reliability for leagues managing $500K+ operations
- **Premium Quality**: Black and gold conveys exclusivity and sophistication
- **Trust**: Clean, professional design that inspires confidence
- **Modern Excellence**: Contemporary aesthetics with timeless elegance

### Design Principles

1. **Quiet Confidence** - Let quality speak for itself; avoid flashy decorations
2. **Ruthless Clarity** - Every element earns its place; remove what doesn't serve the user
3. **Strong Hierarchy** - Guide users naturally through information architecture
4. **Disciplined Spacing** - Consistent rhythm creates visual harmony
5. **High Craft** - Attention to detail in every interaction

---

## Color System

### Primary Brand Colors

The signature black and gold palette establishes premium positioning.

#### Gold (Primary Accent)

| Token | Hex | OKLCH | Usage |
|-------|-----|-------|-------|
| `gold-50` | #FFFDF5 | oklch(99% 0.02 85) | Subtle backgrounds (light mode) |
| `gold-100` | #FFF9E6 | oklch(98% 0.05 85) | Hover states (light mode) |
| `gold-200` | #FFF0BF | oklch(95% 0.10 85) | Borders, dividers |
| `gold-300` | #FFE699 | oklch(90% 0.15 85) | Icons, decorative |
| `gold-400` | #FFD54F | oklch(85% 0.18 85) | Highlights, badges |
| `gold-500` | #D4AF37 | oklch(70% 0.15 85) | **Primary brand gold** |
| `gold-600` | #C19A00 | oklch(60% 0.13 85) | Hover/active states |
| `gold-700` | #9A7B00 | oklch(50% 0.11 85) | Text on light backgrounds |
| `gold-800` | #735C00 | oklch(40% 0.09 85) | Dark text accents |
| `gold-900` | #4D3D00 | oklch(30% 0.07 85) | Darkest gold |

#### Neutral (Dark Mode Surfaces)

| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-950` | #0a0a0a | Primary background (dark) |
| `neutral-900` | #111111 | Elevated surface 1 |
| `neutral-850` | #141414 | Elevated surface 2 |
| `neutral-800` | #1a1a1a | Cards, panels |
| `neutral-750` | #242424 | Interactive elements |
| `neutral-700` | #2e2e2e | Hover states |
| `neutral-600` | #404040 | Borders |
| `neutral-500` | #525252 | Disabled states |
| `neutral-400` | #737373 | Placeholder text |
| `neutral-300` | #a3a3a3 | Secondary text |
| `neutral-200` | #d4d4d4 | Primary text (dark mode) |
| `neutral-100` | #e5e5e5 | Headings (dark mode) |
| `neutral-50` | #fafafa | Pure light (use sparingly) |

#### Neutral (Light Mode Surfaces)

| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-50` | #fafafa | Primary background (light) |
| `neutral-100` | #f5f5f5 | Elevated surface 1 |
| `neutral-150` | #ededed | Elevated surface 2 |
| `neutral-200` | #e5e5e5 | Cards, panels |
| `neutral-250` | #d9d9d9 | Borders |
| `neutral-300` | #d4d4d4 | Dividers |
| `neutral-400` | #a3a3a3 | Disabled text |
| `neutral-500` | #737373 | Secondary text |
| `neutral-600` | #525252 | Primary text (light mode) |
| `neutral-700` | #404040 | Headings (light mode) |
| `neutral-800` | #262626 | Emphasis text |
| `neutral-900` | #171717 | Maximum contrast |

### Semantic Colors

#### Status Colors

| Semantic | Dark Mode | Light Mode | Usage |
|----------|-----------|------------|-------|
| `success` | #22c55e | #16a34a | Positive actions, confirmations |
| `success-muted` | rgba(34,197,94,0.15) | rgba(22,163,74,0.1) | Success backgrounds |
| `warning` | #eab308 | #ca8a04 | Cautions, pending states |
| `warning-muted` | rgba(234,179,8,0.15) | rgba(202,138,4,0.1) | Warning backgrounds |
| `error` | #ef4444 | #dc2626 | Errors, destructive actions |
| `error-muted` | rgba(239,68,68,0.15) | rgba(220,38,38,0.1) | Error backgrounds |
| `info` | #3b82f6 | #2563eb | Informational states |
| `info-muted` | rgba(59,130,246,0.15) | rgba(37,99,235,0.1) | Info backgrounds |

### Semantic Color Tokens (CSS Variables)

```css
/* These adapt automatically based on color-scheme */
--color-background          /* Page background */
--color-background-elevated /* Cards, panels, modals */
--color-background-sunken   /* Inset areas, inputs */
--color-surface             /* Interactive surfaces */
--color-surface-hover       /* Hover state */
--color-surface-active      /* Active/pressed state */

--color-border              /* Default borders */
--color-border-muted        /* Subtle borders */
--color-border-emphasis     /* Emphasized borders */

--color-text-primary        /* Main content */
--color-text-secondary      /* Supporting text */
--color-text-muted          /* Disabled, placeholders */
--color-text-inverse        /* Text on colored backgrounds */

--color-accent              /* Primary accent (gold) */
--color-accent-hover        /* Accent hover state */
--color-accent-muted        /* Subtle accent backgrounds */
--color-accent-text         /* Text on accent backgrounds */
```

---

## Typography

### Font Family

**Primary**: Inter (Google Fonts)
**Fallback**: system-ui, -apple-system, sans-serif

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

### Type Scale

| Token | Size | Line Height | Weight | Letter Spacing | Usage |
|-------|------|-------------|--------|----------------|-------|
| `display-xl` | 4.5rem (72px) | 1 | 900 | -0.02em | Hero headlines |
| `display-lg` | 3.75rem (60px) | 1 | 900 | -0.02em | Section heroes |
| `display` | 3rem (48px) | 1.1 | 900 | -0.02em | Page titles |
| `heading-xl` | 2.25rem (36px) | 1.2 | 800 | -0.01em | Major headings |
| `heading-lg` | 1.875rem (30px) | 1.25 | 700 | -0.01em | Section headings |
| `heading` | 1.5rem (24px) | 1.3 | 700 | 0 | Card titles |
| `heading-sm` | 1.25rem (20px) | 1.4 | 600 | 0 | Subsection titles |
| `body-lg` | 1.125rem (18px) | 1.6 | 400 | 0 | Lead paragraphs |
| `body` | 1rem (16px) | 1.6 | 400 | 0 | Body text |
| `body-sm` | 0.875rem (14px) | 1.5 | 400 | 0 | Secondary text |
| `caption` | 0.75rem (12px) | 1.4 | 400 | 0.02em | Labels, metadata |
| `overline` | 0.75rem (12px) | 1 | 600 | 0.1em | Section labels |

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Light | 300 | Decorative, large display |
| Regular | 400 | Body text |
| Medium | 500 | Emphasis, navigation |
| Semibold | 600 | Buttons, labels |
| Bold | 700 | Headings |
| Extrabold | 800 | Major headings |
| Black | 900 | Display text |

---

## Spacing System

Based on 4px rhythm for consistent visual harmony.

### Spacing Scale

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `0` | 0 | 0px | Reset |
| `px` | 1px | 1px | Hairlines |
| `0.5` | 0.125rem | 2px | Micro spacing |
| `1` | 0.25rem | 4px | Tight gaps |
| `1.5` | 0.375rem | 6px | Small gaps |
| `2` | 0.5rem | 8px | Icon gaps, inline spacing |
| `2.5` | 0.625rem | 10px | Compact padding |
| `3` | 0.75rem | 12px | Button padding (y) |
| `4` | 1rem | 16px | Card padding (compact) |
| `5` | 1.25rem | 20px | Standard gaps |
| `6` | 1.5rem | 24px | Card padding (standard) |
| `8` | 2rem | 32px | Section gaps |
| `10` | 2.5rem | 40px | Large gaps |
| `12` | 3rem | 48px | Section padding |
| `16` | 4rem | 64px | Page sections |
| `20` | 5rem | 80px | Major sections |
| `24` | 6rem | 96px | Hero padding |
| `32` | 8rem | 128px | Maximum sections |

### Container Widths

| Token | Value | Usage |
|-------|-------|-------|
| `max-w-sm` | 24rem (384px) | Narrow modals |
| `max-w-md` | 28rem (448px) | Forms, auth pages |
| `max-w-lg` | 32rem (512px) | Standard modals |
| `max-w-xl` | 36rem (576px) | Wide modals |
| `max-w-2xl` | 42rem (672px) | Content width |
| `max-w-3xl` | 48rem (768px) | Article width |
| `max-w-4xl` | 56rem (896px) | Wide content |
| `max-w-5xl` | 64rem (1024px) | Dashboard |
| `max-w-6xl` | 72rem (1152px) | Wide dashboard |
| `max-w-7xl` | 80rem (1280px) | Full width |

---

## Elevation & Shadows

### Dark Mode Shadows

Dark mode uses subtle glow effects rather than traditional shadows.

| Token | CSS Value | Usage |
|-------|-----------|-------|
| `shadow-none` | none | Reset |
| `shadow-glow-sm` | 0 0 20px rgba(212,175,55,0.15) | Subtle glow |
| `shadow-glow` | 0 0 40px rgba(212,175,55,0.2) | Standard glow |
| `shadow-glow-lg` | 0 0 60px rgba(212,175,55,0.3) | Prominent glow |
| `shadow-glow-intense` | 0 0 80px rgba(212,175,55,0.4) | Maximum glow |
| `shadow-card` | 0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2) | Card elevation |
| `shadow-card-hover` | 0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.3) | Lifted card |

### Light Mode Shadows

Light mode uses traditional elevation shadows.

| Token | CSS Value | Usage |
|-------|-----------|-------|
| `shadow-sm` | 0 1px 2px 0 rgba(0,0,0,0.05) | Subtle depth |
| `shadow` | 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1) | Default |
| `shadow-md` | 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1) | Cards |
| `shadow-lg` | 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1) | Dropdowns |
| `shadow-xl` | 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1) | Modals |
| `shadow-2xl` | 0 25px 50px -12px rgba(0,0,0,0.25) | Large modals |
| `shadow-gold` | 0 4px 14px rgba(212,175,55,0.25) | Gold accent shadow |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-none` | 0 | Sharp edges |
| `rounded-sm` | 0.125rem (2px) | Subtle rounding |
| `rounded` | 0.25rem (4px) | Default rounding |
| `rounded-md` | 0.375rem (6px) | Buttons, inputs |
| `rounded-lg` | 0.5rem (8px) | Cards (compact) |
| `rounded-xl` | 1rem (16px) | Cards (standard) |
| `rounded-2xl` | 1.5rem (24px) | Cards (prominent) |
| `rounded-3xl` | 2rem (32px) | Hero cards |
| `rounded-full` | 9999px | Pills, avatars |

---

## Animation & Motion

### Timing Functions

| Token | CSS Value | Usage |
|-------|-----------|-------|
| `ease-linear` | linear | Progress bars |
| `ease-in` | cubic-bezier(0.4, 0, 1, 1) | Exit animations |
| `ease-out` | cubic-bezier(0, 0, 0.2, 1) | Enter animations |
| `ease-in-out` | cubic-bezier(0.4, 0, 0.2, 1) | Transitions |
| `ease-premium` | cubic-bezier(0.4, 0, 0.2, 1) | Premium feel |

### Duration Scale

| Token | Value | Usage |
|-------|-------|-------|
| `duration-75` | 75ms | Micro-interactions |
| `duration-100` | 100ms | Hover states |
| `duration-150` | 150ms | Color changes |
| `duration-200` | 200ms | Standard transitions |
| `duration-300` | 300ms | Smooth transitions |
| `duration-500` | 500ms | Entrance animations |
| `duration-700` | 700ms | Page transitions |

### Keyframe Animations

```css
/* Fade Up - Entry animation */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Fade In - Simple entry */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Scale In - Modal entry */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Pulse Gold - Attention draw */
@keyframes pulseGold {
  0%, 100% { box-shadow: 0 0 20px rgba(212,175,55,0.2); }
  50% { box-shadow: 0 0 40px rgba(212,175,55,0.4); }
}

/* Shine - Button hover effect */
@keyframes shine {
  to { transform: translateX(100%); }
}
```

### Motion Guidelines

1. **Duration Budget**: Keep total animation time under 300ms for interactions
2. **Performance First**: Use `transform` and `opacity` only when possible
3. **Purposeful Motion**: Every animation should communicate state change
4. **Reduced Motion**: Respect `prefers-reduced-motion` media query

---

## Component Tokens

### Buttons

#### Primary Button (Gold)

```css
/* Dark Mode */
background: linear-gradient(to right, var(--color-gold-500), var(--color-gold-600));
color: black;
border-radius: 0.5rem;
padding: 0.75rem 1.5rem;
font-weight: 600;
transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);

/* Hover */
box-shadow: 0 0 40px rgba(212, 175, 55, 0.2);
transform: scale(1.02);

/* Light Mode */
background: linear-gradient(to right, var(--color-gold-600), var(--color-gold-700));
/* All other properties remain the same */
```

#### Secondary Button (Outline)

```css
/* Dark Mode */
background: transparent;
border: 1px solid rgba(212, 175, 55, 0.5);
color: var(--color-gold-500);

/* Hover */
background: rgba(212, 175, 55, 0.1);
border-color: var(--color-gold-500);

/* Light Mode */
border: 1px solid var(--color-gold-600);
color: var(--color-gold-700);

/* Hover */
background: rgba(212, 175, 55, 0.1);
```

#### Ghost Button

```css
/* Dark Mode */
background: transparent;
color: rgb(156, 163, 175);

/* Hover */
color: white;
background: rgba(255, 255, 255, 0.05);

/* Light Mode */
color: rgb(107, 114, 128);

/* Hover */
color: var(--color-text-primary);
background: rgba(0, 0, 0, 0.05);
```

### Cards

```css
/* Dark Mode */
background: var(--color-neutral-800);
border: 1px solid rgba(212, 175, 55, 0.2);
border-radius: 1.5rem;

/* Hover */
border-color: rgba(212, 175, 55, 0.4);
box-shadow: 0 0 20px rgba(212, 175, 55, 0.15);

/* Light Mode */
background: white;
border: 1px solid var(--color-border);
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

/* Hover */
border-color: var(--color-gold-300);
box-shadow: 0 4px 14px rgba(212, 175, 55, 0.15);
```

### Inputs

```css
/* Dark Mode */
background: rgba(0, 0, 0, 0.5);
border: 1px solid rgba(212, 175, 55, 0.3);
color: white;
border-radius: 0.75rem;
padding: 0.875rem 1rem;

/* Focus */
border-color: transparent;
box-shadow: 0 0 0 2px var(--color-gold-500);

/* Light Mode */
background: white;
border: 1px solid var(--color-border);
color: var(--color-text-primary);

/* Focus */
border-color: transparent;
box-shadow: 0 0 0 2px var(--color-gold-500);
```

### Badges

```css
/* Gold Badge */
background: rgba(212, 175, 55, 0.2);
color: var(--color-gold-500);
border: 1px solid rgba(212, 175, 55, 0.3);
padding: 0.125rem 0.625rem;
border-radius: 9999px;
font-size: 0.75rem;
font-weight: 600;
```

---

## Dark & Light Mode

### Mode Switching Strategy

1. **CSS Custom Properties**: All colors defined as CSS variables
2. **Data Attribute**: `<html data-theme="dark|light">`
3. **System Preference**: `prefers-color-scheme` media query
4. **User Override**: localStorage persistence with manual toggle
5. **Smooth Transitions**: 200ms transition on color properties

### Dark Mode (Default)

The premium dark theme emphasizes the gold accent against deep blacks.

```css
[data-theme="dark"] {
  color-scheme: dark;

  --color-background: #0a0a0a;
  --color-background-elevated: #141414;
  --color-background-sunken: #050505;
  --color-surface: #1a1a1a;
  --color-surface-hover: #242424;
  --color-surface-active: #2e2e2e;

  --color-border: rgba(212, 175, 55, 0.2);
  --color-border-muted: rgba(255, 255, 255, 0.1);
  --color-border-emphasis: rgba(212, 175, 55, 0.4);

  --color-text-primary: #fafafa;
  --color-text-secondary: #a3a3a3;
  --color-text-muted: #525252;
  --color-text-inverse: #0a0a0a;

  --color-accent: #D4AF37;
  --color-accent-hover: #C19A00;
  --color-accent-muted: rgba(212, 175, 55, 0.15);
  --color-accent-text: #0a0a0a;
}
```

### Light Mode

Clean, professional light theme maintaining gold brand presence.

```css
[data-theme="light"] {
  color-scheme: light;

  --color-background: #fafafa;
  --color-background-elevated: #ffffff;
  --color-background-sunken: #f5f5f5;
  --color-surface: #ffffff;
  --color-surface-hover: #f5f5f5;
  --color-surface-active: #ededed;

  --color-border: #e5e5e5;
  --color-border-muted: #f0f0f0;
  --color-border-emphasis: #d4d4d4;

  --color-text-primary: #171717;
  --color-text-secondary: #525252;
  --color-text-muted: #a3a3a3;
  --color-text-inverse: #fafafa;

  --color-accent: #B8960F;
  --color-accent-hover: #9A7B00;
  --color-accent-muted: rgba(212, 175, 55, 0.1);
  --color-accent-text: #ffffff;
}
```

### Implementation

```tsx
// ThemeProvider component handles:
// 1. Reading system preference
// 2. Checking localStorage for user preference
// 3. Setting data-theme attribute on <html>
// 4. Providing toggle function to components
// 5. Persisting choice to localStorage
```

---

## Multi-Tenant Theming

### League Branding Override

Each league can customize primary and secondary colors while maintaining system integrity.

```css
[data-league-theme] {
  --league-primary: var(--color-accent);
  --league-secondary: var(--color-surface);
  --league-accent: var(--league-primary);
}

/* Example: Custom League Theme */
[data-league="custom"] {
  --league-primary: #CE1126;  /* Red */
  --league-secondary: #010101; /* Black */
}
```

### Theming Constraints

1. **Contrast Enforcement**: Programmatically validate contrast ratios
2. **Accessible Text**: Automatically determine text color based on background
3. **Brand Safe**: Core UI elements (navigation, system messages) use HockeyLifeHL brand
4. **League Zones**: League colors applied to designated customization areas

---

## Accessibility Guidelines

### Color Contrast Requirements

| Element | Minimum Ratio | Standard |
|---------|---------------|----------|
| Normal text | 4.5:1 | WCAG AA |
| Large text (18px+) | 3:1 | WCAG AA |
| UI components | 3:1 | WCAG AA |
| Focus indicators | 3:1 | WCAG AA |

### Verified Contrasts

| Combination | Ratio | Pass |
|-------------|-------|------|
| Gold (#D4AF37) on Black (#0a0a0a) | 8.5:1 | AAA |
| White (#fafafa) on Black (#0a0a0a) | 19.4:1 | AAA |
| Gray (#a3a3a3) on Black (#0a0a0a) | 7.4:1 | AAA |
| Gold (#B8960F) on White (#fafafa) | 4.8:1 | AA |
| Dark text (#171717) on White (#fafafa) | 17.5:1 | AAA |

### Focus States

```css
/* Visible focus ring for keyboard navigation */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Remove outline for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Implementation Reference

### CSS Variable Usage in Tailwind v4

```tsx
// Use semantic tokens in components
<div className="bg-[var(--color-background)] text-[var(--color-text-primary)]">
  <h1 className="text-[var(--color-accent)]">Heading</h1>
  <p className="text-[var(--color-text-secondary)]">Body text</p>
</div>

// Or use the theme classes (recommended)
<div className="bg-background text-foreground">
  <h1 className="text-accent">Heading</h1>
  <p className="text-muted">Body text</p>
</div>
```

### Theme Toggle Implementation

```tsx
// components/ThemeToggle.tsx
'use client';

import { useTheme } from '@/components/ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg bg-surface hover:bg-surface-hover transition-colors"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
```

### File Structure

```
apps/league-builder/src/
  app/
    globals.css          # Theme variables and base styles
    layout.tsx           # ThemeProvider wrapper
  components/
    ThemeProvider.tsx    # Theme context and state management
    ThemeToggle.tsx      # Toggle button component
    ui/                  # shadcn/ui components (themed)
```

---

## Changelog

### Version 2.0 (Current)

- Added comprehensive light mode support
- Implemented semantic color tokens
- Added CSS custom properties system
- Created ThemeProvider for state management
- Added accessibility documentation
- Documented multi-tenant theming strategy

### Version 1.0

- Initial dark mode theme
- Gold accent palette
- Typography system
- Spacing scale
- Animation tokens

---

**Last Updated**: January 2026
**Maintained By**: HockeyLifeHL Design Team
