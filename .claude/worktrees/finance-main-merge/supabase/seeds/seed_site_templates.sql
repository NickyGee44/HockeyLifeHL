-- ============================================================================
-- SEED DATA: SITE TEMPLATES
-- ============================================================================
-- Description: Populate site_templates table with 5 default templates
-- Date: 2026-01-28
-- Agent: Agent 1
-- ============================================================================

-- Clean up existing template data (for re-seeding)
TRUNCATE TABLE league_template_settings CASCADE;
TRUNCATE TABLE site_templates CASCADE;

-- ============================================================================
-- TEMPLATE 1: CLASSIC SPORTS
-- ============================================================================
-- Traditional professional sports league aesthetic
-- ============================================================================

INSERT INTO site_templates (
  name,
  slug,
  description,
  preview_image_url,
  is_active,
  sort_order,
  config
) VALUES (
  'Classic Sports',
  'classic-sports',
  'Traditional professional sports league look with bold colors and clean lines',
  '/templates/preview-classic-sports.jpg',
  TRUE,
  1,
  '{
    "colorPresets": [
      {
        "name": "Hockey Red",
        "primary": "#E31837",
        "secondary": "#000000",
        "accent": "#FFD700",
        "background": "#FFFFFF",
        "text": "#1A1A1A"
      },
      {
        "name": "Ice Blue",
        "primary": "#0066CC",
        "secondary": "#FFFFFF",
        "accent": "#C0C0C0",
        "background": "#F8F9FA",
        "text": "#212529"
      },
      {
        "name": "Championship Gold",
        "primary": "#D4AF37",
        "secondary": "#1C1C1C",
        "accent": "#8B0000",
        "background": "#FFFFFF",
        "text": "#2C2C2C"
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
      "headingFont": "system-ui, -apple-system, sans-serif",
      "bodyFont": "system-ui, -apple-system, sans-serif",
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

-- ============================================================================
-- TEMPLATE 2: MODERN MINIMAL
-- ============================================================================
-- Clean, contemporary design with subtle elements
-- ============================================================================

INSERT INTO site_templates (
  name,
  slug,
  description,
  preview_image_url,
  is_active,
  sort_order,
  config
) VALUES (
  'Modern Minimal',
  'modern-minimal',
  'Clean, contemporary design with focus on content and subtle animations',
  '/templates/preview-modern-minimal.jpg',
  TRUE,
  2,
  '{
    "colorPresets": [
      {
        "name": "Slate & Coral",
        "primary": "#FF6B6B",
        "secondary": "#4A5568",
        "accent": "#48BB78",
        "background": "#FFFFFF",
        "text": "#2D3748"
      },
      {
        "name": "Ocean Breeze",
        "primary": "#3182CE",
        "secondary": "#718096",
        "accent": "#38B2AC",
        "background": "#F7FAFC",
        "text": "#1A202C"
      },
      {
        "name": "Sunset Gradient",
        "primary": "#ED8936",
        "secondary": "#805AD5",
        "accent": "#F6AD55",
        "background": "#FFFAF0",
        "text": "#2C3748"
      }
    ],
    "layout": {
      "headerStyle": "minimal",
      "cardStyle": "flat",
      "spacing": "spacious",
      "containerWidth": "1200px",
      "borderRadius": "0.75rem"
    },
    "typography": {
      "headingFont": "Inter, system-ui, sans-serif",
      "bodyFont": "Inter, system-ui, sans-serif",
      "headingWeight": "600",
      "bodyWeight": "400",
      "scale": "1.1"
    },
    "components": {
      "buttons": {
        "style": "rounded",
        "variant": "ghost",
        "size": "medium"
      },
      "cards": {
        "style": "outline",
        "border": "1px solid #E2E8F0",
        "elevation": "none"
      },
      "navigation": {
        "style": "horizontal",
        "position": "top",
        "sticky": false
      }
    }
  }'::JSONB
);

-- ============================================================================
-- TEMPLATE 3: BOLD & VIBRANT
-- ============================================================================
-- High energy colors with dynamic elements
-- ============================================================================

INSERT INTO site_templates (
  name,
  slug,
  description,
  preview_image_url,
  is_active,
  sort_order,
  config
) VALUES (
  'Bold & Vibrant',
  'bold-vibrant',
  'High energy design with bold colors and dynamic visual elements',
  '/templates/preview-bold-vibrant.jpg',
  TRUE,
  3,
  '{
    "colorPresets": [
      {
        "name": "Electric Energy",
        "primary": "#FF0080",
        "secondary": "#7928CA",
        "accent": "#00DFD8",
        "background": "#FFFFFF",
        "text": "#111111"
      },
      {
        "name": "Neon Nights",
        "primary": "#00F5FF",
        "secondary": "#FF006E",
        "accent": "#FFBE0B",
        "background": "#0A0A0A",
        "text": "#FFFFFF"
      },
      {
        "name": "Tropical Punch",
        "primary": "#FF5722",
        "secondary": "#9C27B0",
        "accent": "#00BCD4",
        "background": "#FFF8E1",
        "text": "#212121"
      }
    ],
    "layout": {
      "headerStyle": "bold",
      "cardStyle": "vibrant",
      "spacing": "compact",
      "containerWidth": "1400px",
      "borderRadius": "1rem"
    },
    "typography": {
      "headingFont": "Poppins, system-ui, sans-serif",
      "bodyFont": "Roboto, system-ui, sans-serif",
      "headingWeight": "800",
      "bodyWeight": "400",
      "scale": "1.2"
    },
    "components": {
      "buttons": {
        "style": "pill",
        "variant": "gradient",
        "size": "large"
      },
      "cards": {
        "style": "gradient",
        "border": "2px solid",
        "elevation": "high"
      },
      "navigation": {
        "style": "horizontal",
        "position": "top",
        "sticky": true
      }
    }
  }'::JSONB
);

-- ============================================================================
-- TEMPLATE 4: DARK MODE PRO
-- ============================================================================
-- Premium dark theme with elegant touches
-- ============================================================================

INSERT INTO site_templates (
  name,
  slug,
  description,
  preview_image_url,
  is_active,
  sort_order,
  config
) VALUES (
  'Dark Mode Pro',
  'dark-mode-pro',
  'Premium dark theme with elegant accents and sophisticated styling',
  '/templates/preview-dark-mode-pro.jpg',
  TRUE,
  4,
  '{
    "colorPresets": [
      {
        "name": "Midnight Slate",
        "primary": "#60A5FA",
        "secondary": "#8B5CF6",
        "accent": "#10B981",
        "background": "#0F172A",
        "text": "#F1F5F9"
      },
      {
        "name": "Carbon Fiber",
        "primary": "#34D399",
        "secondary": "#6366F1",
        "accent": "#F59E0B",
        "background": "#111827",
        "text": "#F9FAFB"
      },
      {
        "name": "Arctic Night",
        "primary": "#67E8F9",
        "secondary": "#A78BFA",
        "accent": "#FCD34D",
        "background": "#1E293B",
        "text": "#E2E8F0"
      }
    ],
    "layout": {
      "headerStyle": "dark-elegant",
      "cardStyle": "dark",
      "spacing": "normal",
      "containerWidth": "1280px",
      "borderRadius": "0.625rem"
    },
    "typography": {
      "headingFont": "Montserrat, system-ui, sans-serif",
      "bodyFont": "Open Sans, system-ui, sans-serif",
      "headingWeight": "700",
      "bodyWeight": "400",
      "scale": "1"
    },
    "components": {
      "buttons": {
        "style": "rounded",
        "variant": "glow",
        "size": "medium"
      },
      "cards": {
        "style": "glass",
        "border": "1px solid rgba(255,255,255,0.1)",
        "elevation": "low"
      },
      "navigation": {
        "style": "horizontal",
        "position": "top",
        "sticky": true
      }
    }
  }'::JSONB
);

-- ============================================================================
-- TEMPLATE 5: COMMUNITY FRIENDLY
-- ============================================================================
-- Warm, welcoming design for recreational leagues
-- ============================================================================

INSERT INTO site_templates (
  name,
  slug,
  description,
  preview_image_url,
  is_active,
  sort_order,
  config
) VALUES (
  'Community Friendly',
  'community-friendly',
  'Warm, welcoming design perfect for recreational and community leagues',
  '/templates/preview-community-friendly.jpg',
  TRUE,
  5,
  '{
    "colorPresets": [
      {
        "name": "Friendly Orange",
        "primary": "#FB923C",
        "secondary": "#059669",
        "accent": "#0EA5E9",
        "background": "#FFFBEB",
        "text": "#292524"
      },
      {
        "name": "Happy Hour",
        "primary": "#F59E0B",
        "secondary": "#8B5CF6",
        "accent": "#EC4899",
        "background": "#FEF3C7",
        "text": "#1C1917"
      },
      {
        "name": "Neighborhood",
        "primary": "#10B981",
        "secondary": "#3B82F6",
        "accent": "#F97316",
        "background": "#F0FDF4",
        "text": "#1F2937"
      }
    ],
    "layout": {
      "headerStyle": "friendly",
      "cardStyle": "soft",
      "spacing": "cozy",
      "containerWidth": "1200px",
      "borderRadius": "1rem"
    },
    "typography": {
      "headingFont": "Nunito, system-ui, sans-serif",
      "bodyFont": "Lato, system-ui, sans-serif",
      "headingWeight": "700",
      "bodyWeight": "400",
      "scale": "1.05"
    },
    "components": {
      "buttons": {
        "style": "rounded",
        "variant": "soft",
        "size": "medium"
      },
      "cards": {
        "style": "soft-shadow",
        "border": "none",
        "elevation": "low"
      },
      "navigation": {
        "style": "horizontal",
        "position": "top",
        "sticky": false
      }
    }
  }'::JSONB
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all templates were inserted
DO $$
DECLARE
  template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count FROM site_templates;

  IF template_count != 5 THEN
    RAISE EXCEPTION 'Expected 5 templates, found %', template_count;
  END IF;

  RAISE NOTICE 'Successfully seeded % site templates', template_count;
END $$;

-- ============================================================================
-- END OF SEED FILE
-- ============================================================================
