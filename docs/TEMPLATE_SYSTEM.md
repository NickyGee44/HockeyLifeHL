# 🎨 Template System Documentation

**Version**: 1.0.0
**Last Updated**: January 28, 2026
**Maintained By**: Agent 1

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Available Templates](#available-templates)
5. [Adding a New Template](#adding-a-new-template)
6. [Template Configuration](#template-configuration)
7. [Using Templates in Code](#using-templates-in-code)
8. [CSS Variables](#css-variables)
9. [Component Customization](#component-customization)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Template System allows leagues to select from professionally designed site templates during signup and customize them post-launch. Each template defines a complete visual identity including:

- **Color Schemes**: Multiple presets per template
- **Layout Configuration**: Header, card, spacing styles
- **Typography**: Font families, weights, scales
- **Component Styles**: Button, card, navigation variants

### Key Features

- 🎨 **5 Professional Templates** - Ready to use out of the box
- 🎯 **Color Presets** - 3-4 preset options per template
- ⚡ **Live Preview** - See changes before applying
- 🔧 **Customizable** - Override colors, fonts, layouts
- 💾 **Persistent** - Stored per-league in database
- 🚀 **Performance** - CSS variables for instant theme switching

### User Flow

```
Signup → Select Template → Customize Colors → Launch League
  ↓                                               ↓
Settings → Change Template → Preview → Apply
```

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Database Layer                        │
│  ┌──────────────────┐      ┌───────────────────────┐   │
│  │  site_templates  │      │ league_template_...   │   │
│  │  (5 templates)   │◄─────┤  (per-league config)  │   │
│  └──────────────────┘      └───────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Server Actions                        │
│  • getAllTemplates()       • setLeagueTemplate()        │
│  • getTemplateById()       • updateTemplateCustomizations│
│  • getLeagueTemplate()     • resetLeagueTemplate()      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   React Components                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Template     │  │ Template     │  │ Design        │ │
│  │ Selector     │  │ Preview      │  │ Settings      │ │
│  └──────────────┘  └──────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Template Application Layer                  │
│  • CSS Variables Generation                             │
│  • Component Variant Selection                          │
│  • Layout Configuration Application                     │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Template Selection**:
   - User selects template from TemplateSelector component
   - Server action `setLeagueTemplate()` saves selection to database
   - Template ID and customizations stored in `league_template_settings`

2. **Template Application**:
   - Server action `getLeagueTemplate()` fetches league's template
   - Template config merged with league customizations
   - CSS variables injected into page
   - Components render with template styles

3. **Customization**:
   - User modifies colors in DesignSettings
   - Server action `updateTemplateCustomizations()` updates database
   - Page reloads with new colors via CSS variables

---

## Database Schema

### Table: `site_templates`

Stores the 5 default site templates and their configurations.

```sql
CREATE TABLE site_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,              -- Display name (e.g., "Classic Sports")
  slug TEXT NOT NULL UNIQUE,              -- URL-safe slug (e.g., "classic-sports")
  description TEXT NOT NULL,              -- Short description
  preview_image_url TEXT,                 -- Preview image URL
  is_active BOOLEAN DEFAULT TRUE,         -- Whether selectable
  config JSONB NOT NULL DEFAULT '{}',     -- Template configuration
  sort_order INTEGER DEFAULT 0,           -- Display order
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**config JSONB Structure**:
```json
{
  "colorPresets": [
    {
      "name": "Hockey Red",
      "primary": "#E31837",
      "secondary": "#000000",
      "accent": "#FFD700",
      "background": "#FFFFFF",
      "text": "#1A1A1A"
    }
  ],
  "layout": {
    "headerStyle": "classic",
    "cardStyle": "elevated",
    "spacing": "normal",
    "containerWidth": "1280px",
    "borderRadius": "0.5rem"
  },
  "typography": {
    "headingFont": "system-ui, sans-serif",
    "bodyFont": "system-ui, sans-serif",
    "headingWeight": "700",
    "bodyWeight": "400",
    "scale": "1"
  },
  "components": {
    "buttons": { "style": "square", "variant": "solid", "size": "medium" },
    "cards": { "style": "shadow", "border": "none", "elevation": "medium" },
    "navigation": { "style": "horizontal", "position": "top", "sticky": true }
  }
}
```

### Table: `league_template_settings`

Stores each league's template selection and customizations.

```sql
CREATE TABLE league_template_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL UNIQUE REFERENCES leagues(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES site_templates(id) ON DELETE RESTRICT,
  customizations JSONB NOT NULL DEFAULT '{}',    -- League-specific overrides
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**customizations JSONB Structure**:
```json
{
  "primaryColor": "#FF0000",      -- Custom primary color (overrides preset)
  "secondaryColor": "#0000FF",    -- Custom secondary color
  "accentColor": "#00FF00",       -- Custom accent color
  "logoUrl": "/uploads/logo.png", -- Custom logo URL
  "selectedPreset": "Hockey Red"  -- Which preset was selected
}
```

### Helper Functions

**`get_active_site_templates()`**
- Returns all active templates sorted by sort_order
- Used in template selection UI

**`get_league_template_config(league_id UUID)`**
- Returns template + customizations merged
- Used when rendering league site

**`get_template_usage_stats()`**
- Returns template popularity analytics
- Used for admin dashboards

---

## Available Templates

### 1. Classic Sports

**Slug**: `classic-sports`
**Description**: Traditional professional sports league aesthetic
**Best For**: Competitive leagues, established organizations

**Color Presets**:
- Hockey Red (#E31837, #000000, #FFD700)
- Ice Blue (#0066CC, #FFFFFF, #C0C0C0)
- Championship Gold (#D4AF37, #1C1C1C, #8B0000)

**Layout**: Classic header, elevated cards, square buttons
**Typography**: System UI, bold headings (700)

---

### 2. Modern Minimal

**Slug**: `modern-minimal`
**Description**: Clean, contemporary design with focus on content
**Best For**: New leagues, modern brands

**Color Presets**:
- Slate & Coral (#FF6B6B, #4A5568, #48BB78)
- Ocean Breeze (#3182CE, #718096, #38B2AC)
- Sunset Gradient (#ED8936, #805AD5, #F6AD55)

**Layout**: Minimal header, flat cards, rounded buttons
**Typography**: Inter font, medium headings (600)

---

### 3. Bold & Vibrant

**Slug**: `bold-vibrant`
**Description**: High energy design with bold colors
**Best For**: Youth leagues, fun/casual leagues

**Color Presets**:
- Electric Energy (#FF0080, #7928CA, #00DFD8)
- Neon Nights (#00F5FF, #FF006E, #FFBE0B)
- Tropical Punch (#FF5722, #9C27B0, #00BCD4)

**Layout**: Bold header, gradient cards, pill buttons
**Typography**: Poppins, extra-bold headings (800)

---

### 4. Dark Mode Pro

**Slug**: `dark-mode-pro`
**Description**: Premium dark theme with elegant accents
**Best For**: Evening leagues, premium brands

**Color Presets**:
- Midnight Slate (#60A5FA, #8B5CF6, #10B981 on #0F172A)
- Carbon Fiber (#34D399, #6366F1, #F59E0B on #111827)
- Arctic Night (#67E8F9, #A78BFA, #FCD34D on #1E293B)

**Layout**: Dark elegant header, glass cards, glow buttons
**Typography**: Montserrat, bold headings (700)

---

### 5. Community Friendly

**Slug**: `community-friendly`
**Description**: Warm, welcoming design for recreational leagues
**Best For**: Beer leagues, community leagues

**Color Presets**:
- Friendly Orange (#FB923C, #059669, #0EA5E9)
- Happy Hour (#F59E0B, #8B5CF6, #EC4899)
- Neighborhood (#10B981, #3B82F6, #F97316)

**Layout**: Friendly header, soft cards, soft buttons
**Typography**: Nunito, medium-bold headings (700)

---

## Adding a New Template

### Step 1: Design the Template

Plan your template with these elements:

1. **Color Presets** (3-4 options)
   - Primary, secondary, accent colors
   - Background and text colors
   - Ensure good contrast for accessibility

2. **Layout Style**
   - Header: classic | minimal | bold | dark-elegant | friendly
   - Cards: elevated | flat | vibrant | dark | soft
   - Spacing: compact | normal | spacious | cozy

3. **Typography**
   - Heading and body fonts
   - Font weights
   - Scale multiplier

4. **Component Variants**
   - Button styles
   - Card styles
   - Navigation layout

### Step 2: Create the SQL Insert

```sql
-- Add to supabase/seeds/seed_site_templates.sql
-- or run directly in SQL editor

INSERT INTO site_templates (
  name,
  slug,
  description,
  preview_image_url,
  is_active,
  sort_order,
  config
) VALUES (
  'Your Template Name',
  'your-template-slug',
  'Description of your template style and use case',
  '/templates/preview-your-template-slug.svg',
  TRUE,
  6, -- Next sort order
  '{
    "colorPresets": [
      {
        "name": "Preset Name",
        "primary": "#FF0000",
        "secondary": "#0000FF",
        "accent": "#00FF00",
        "background": "#FFFFFF",
        "text": "#1A1A1A"
      }
    ],
    "layout": {
      "headerStyle": "classic",
      "cardStyle": "elevated",
      "spacing": "normal",
      "containerWidth": "1280px",
      "borderRadius": "0.5rem"
    },
    "typography": {
      "headingFont": "system-ui, sans-serif",
      "bodyFont": "system-ui, sans-serif",
      "headingWeight": "700",
      "bodyWeight": "400",
      "scale": "1"
    },
    "components": {
      "buttons": {
        "style": "square",
        "variant": "solid",
        "size": "medium"
      },
      "cards": {
        "style": "shadow",
        "border": "none",
        "elevation": "medium"
      },
      "navigation": {
        "style": "horizontal",
        "position": "top",
        "sticky": true
      }
    }
  }'::JSONB
);
```

### Step 3: Create Preview Image

Create a preview image showing your template:

- **Format**: SVG (scalable) or JPG (optimized)
- **Size**: 1920x1080 (16:9 aspect ratio)
- **Location**: `public/templates/preview-your-template-slug.svg`
- **Content**: Show header, hero section, cards, navigation

Example SVG structure:
```html
<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1920" height="1080" fill="#FFFFFF"/>

  <!-- Header -->
  <rect y="0" width="1920" height="80" fill="#E31837"/>
  <text x="40" y="50" font-size="24" fill="#FFFFFF">League Name</text>

  <!-- Hero Section -->
  <rect y="80" width="1920" height="400" fill="#F8F9FA"/>
  <text x="960" y="300" text-anchor="middle" font-size="48">Welcome</text>

  <!-- Cards -->
  <rect x="100" y="520" width="400" height="300" fill="#FFFFFF" rx="8"/>
  <rect x="540" y="520" width="400" height="300" fill="#FFFFFF" rx="8"/>
</svg>
```

### Step 4: Test the Template

1. **Apply Migration**:
   ```sql
   -- Verify template was inserted
   SELECT id, name, slug FROM site_templates WHERE slug = 'your-template-slug';
   ```

2. **Test Selection**:
   - Go to signup flow or design settings
   - Verify template appears in selector
   - Select and preview it

3. **Test Application**:
   - Apply template to a test league
   - Verify colors, layout, components render correctly

---

## Template Configuration

### Color Presets

Color presets provide quick-select options for users:

```typescript
interface ColorPreset {
  name: string;        // Display name
  primary: string;     // Main brand color (buttons, links)
  secondary: string;   // Supporting color (accents)
  accent: string;      // Highlight color (badges, alerts)
  background: string;  // Page background
  text: string;        // Primary text color
}
```

**Guidelines**:
- Ensure good contrast between text and background (WCAG AA)
- Primary should be bold and recognizable
- Secondary complements primary
- Accent used sparingly for emphasis

### Layout Configuration

```typescript
interface LayoutConfig {
  headerStyle: 'classic' | 'minimal' | 'bold' | 'dark-elegant' | 'friendly';
  cardStyle: 'elevated' | 'flat' | 'vibrant' | 'dark' | 'soft' | ...;
  spacing: 'compact' | 'normal' | 'spacious' | 'cozy';
  containerWidth: string;   // e.g., "1280px", "1400px"
  borderRadius: string;     // e.g., "0.5rem", "1rem"
}
```

### Typography Configuration

```typescript
interface TypographyConfig {
  headingFont: string;    // Font family for headings
  bodyFont: string;       // Font family for body text
  headingWeight: string;  // e.g., "600", "700", "800"
  bodyWeight: string;     // e.g., "400", "500"
  scale: string;          // Size multiplier: "1", "1.1", "1.2"
}
```

### Component Styles

```typescript
interface ComponentStyles {
  buttons: {
    style: 'square' | 'rounded' | 'pill';
    variant: 'solid' | 'ghost' | 'gradient' | 'glow' | 'soft';
    size: 'small' | 'medium' | 'large';
  };
  cards: {
    style: 'shadow' | 'outline' | 'gradient' | 'glass' | 'soft-shadow';
    border: string;      // e.g., "none", "1px solid #E2E8F0"
    elevation: 'none' | 'low' | 'medium' | 'high';
  };
  navigation: {
    style: 'horizontal' | 'vertical' | 'sidebar';
    position: 'top' | 'left' | 'right';
    sticky: boolean;
  };
}
```

---

## Using Templates in Code

### Fetching Templates

```typescript
import { getAllTemplates } from '@/lib/templates/actions';

// Get all active templates
const result = await getAllTemplates();
if (result.success && result.data) {
  const templates = result.data; // SiteTemplate[]
}
```

### Getting League Template

```typescript
import { getLeagueTemplate } from '@/lib/templates/actions';

// Get league's selected template
const result = await getLeagueTemplate('league-id');
if (result.success && result.data) {
  const { template, settings, customizations } = result.data;
}
```

### Setting League Template

```typescript
import { setLeagueTemplate } from '@/lib/templates/actions';

// Set template for a league
const result = await setLeagueTemplate(
  'league-id',
  'template-id',
  {
    primaryColor: '#FF0000',
    selectedPreset: 'Hockey Red',
  }
);
```

### Updating Customizations

```typescript
import { updateTemplateCustomizations } from '@/lib/templates/actions';

// Update only customizations (keeps template)
const result = await updateTemplateCustomizations(
  'league-id',
  {
    primaryColor: '#FF0000',
    logoUrl: '/uploads/logo.png',
  }
);
```

---

## CSS Variables

Templates use CSS variables for dynamic theming:

### Generated Variables

```css
:root {
  /* Colors */
  --template-primary: #E31837;
  --template-secondary: #000000;
  --template-accent: #FFD700;
  --template-background: #FFFFFF;
  --template-text: #1A1A1A;

  /* Layout */
  --template-border-radius: 0.5rem;
  --template-container-width: 1280px;
  --template-spacing: 1rem;

  /* Components */
  --template-card-shadow: 0 4px 6px rgba(0,0,0,0.1);
  --template-button-radius: 0.5rem;
}
```

### Using in Components

```tsx
// In your component styles
<button style={{
  backgroundColor: 'var(--template-primary)',
  borderRadius: 'var(--template-button-radius)',
}}>
  Click Me
</button>

// Or in CSS
.my-button {
  background-color: var(--template-primary);
  border-radius: var(--template-button-radius);
}
```

### TypeScript Constants

```typescript
// From src/types/site-templates.ts
export const CSS_VARIABLE_NAMES = {
  PRIMARY: '--template-primary',
  SECONDARY: '--template-secondary',
  ACCENT: '--template-accent',
  BORDER_RADIUS: '--template-border-radius',
  // ...
} as const;
```

---

## Component Customization

### Button Variants

Based on `components.buttons.style`:

```tsx
// square
<Button className="rounded-none" />

// rounded
<Button className="rounded-md" />

// pill
<Button className="rounded-full" />
```

### Card Variants

Based on `components.cards.style`:

```tsx
// shadow
<Card className="shadow-md" />

// outline
<Card className="border-2" />

// glass
<Card className="backdrop-blur-sm bg-white/10" />
```

### Navigation Styles

Based on `components.navigation.style`:

```tsx
// horizontal
<nav className="flex flex-row" />

// vertical
<nav className="flex flex-col" />
```

---

## Troubleshooting

### Template Not Showing in Selector

**Problem**: New template doesn't appear in selection UI

**Solutions**:
1. Check `is_active` is TRUE:
   ```sql
   SELECT name, is_active FROM site_templates WHERE slug = 'your-slug';
   ```

2. Check database was refreshed:
   ```typescript
   const result = await getAllTemplates(); // Should include your template
   ```

3. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run dev
   ```

### Template Colors Not Applying

**Problem**: Colors don't update after changing template

**Solutions**:
1. Verify template settings saved:
   ```sql
   SELECT * FROM league_template_settings WHERE league_id = 'your-league-id';
   ```

2. Check customizations JSONB:
   ```sql
   SELECT customizations FROM league_template_settings WHERE league_id = 'your-league-id';
   ```

3. Ensure CSS variables injected:
   - Inspect page in browser DevTools
   - Check `:root` element for `--template-*` variables

4. Force page reload:
   ```typescript
   router.refresh(); // In your component
   ```

### Database Type Errors

**Problem**: TypeScript errors accessing template tables

**Solutions**:
1. Regenerate Supabase types:
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
   ```

2. Use type assertions temporarily:
   ```typescript
   const { data } = await (supabase as any)
     .from('site_templates')
     .select('*');
   ```

### Migration Errors

**Problem**: Migration fails with "table already exists"

**Solutions**:
1. Drop and recreate (development only):
   ```sql
   DROP TABLE IF EXISTS league_template_settings CASCADE;
   DROP TABLE IF EXISTS site_templates CASCADE;
   -- Then run migration again
   ```

2. Check if tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_name IN ('site_templates', 'league_template_settings');
   ```

---

## Best Practices

### Template Design

✅ **DO**:
- Provide 3-4 color presets per template
- Ensure WCAG AA contrast ratios
- Test on mobile and desktop
- Include preview images
- Document intended use case

❌ **DON'T**:
- Use extremely bright/neon colors as defaults
- Ignore accessibility
- Create templates too similar to existing ones
- Forget to set `sort_order`

### Customization

✅ **DO**:
- Validate color hex codes
- Limit custom CSS injection
- Preserve template integrity
- Provide reset functionality

❌ **DON'T**:
- Allow SQL injection via customizations
- Store sensitive data in customizations JSONB
- Override all template settings (defeats purpose)

### Performance

✅ **DO**:
- Use CSS variables for theming
- Cache template queries
- Optimize preview images
- Use dynamic imports for heavy components

❌ **DON'T**:
- Re-fetch templates on every render
- Inline large images
- Load all templates upfront

---

## Related Documentation

- [Enhanced Signup Implementation Plan](../ENHANCED_SIGNUP_IMPLEMENTATION_PLAN.md)
- [Migration Application Guide](../MIGRATION_APPLICATION_GUIDE_JAN28.md)
- [Site Templates Types](../src/types/site-templates.ts)
- [Template Server Actions](../src/lib/templates/actions.ts)

---

## Support

For questions or issues:
1. Check this documentation first
2. Review troubleshooting section
3. Check template configuration in database
4. Verify server action responses
5. Contact development team

---

**Maintained By**: Agent 1 (Backend Specialist)
**Version**: 1.0.0
**Last Updated**: January 28, 2026

---

*This documentation is part of the HockeyLifeHL Enhanced Signup Implementation project.*
