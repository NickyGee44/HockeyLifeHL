import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

interface BrandingPreviewProps {
  branding: {
    name: string;
    logo_url?: string | null;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    tagline?: string | null;
    font_family?: string;
  };
}

/**
 * Live preview of league branding
 * Shows logo, colors, and tagline
 */
export function BrandingPreview({ branding }: BrandingPreviewProps) {
  const {
    name,
    logo_url,
    primary_color = '#FF0000',
    secondary_color = '#000000',
    accent_color = '#FFD700',
    tagline,
    font_family = 'Inter, system-ui, sans-serif',
  } = branding;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding Preview</CardTitle>
        <CardDescription>How your league branding will appear</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Preview */}
        <div>
          <h4 className="text-sm font-medium mb-2">Logo</h4>
          <div className="border border-border rounded-lg p-4 bg-muted/50 flex items-center justify-center h-32">
            {logo_url ? (
              <div className="relative h-24 w-24">
                <Image
                  src={logo_url}
                  alt={`${name} logo`}
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">No logo uploaded</div>
            )}
          </div>
        </div>

        {/* Color Swatches */}
        <div>
          <h4 className="text-sm font-medium mb-2">Colors</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Primary</div>
              <div className="flex items-center gap-2">
                <div
                  className="w-12 h-12 rounded border border-border"
                  style={{ backgroundColor: primary_color }}
                />
                <span className="text-xs font-mono">{primary_color}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Secondary</div>
              <div className="flex items-center gap-2">
                <div
                  className="w-12 h-12 rounded border border-border"
                  style={{ backgroundColor: secondary_color }}
                />
                <span className="text-xs font-mono">{secondary_color}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Accent</div>
              <div className="flex items-center gap-2">
                <div
                  className="w-12 h-12 rounded border border-border"
                  style={{ backgroundColor: accent_color }}
                />
                <span className="text-xs font-mono">{accent_color}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Font Preview */}
        <div>
          <h4 className="text-sm font-medium mb-2">Typography</h4>
          <div className="border border-border rounded-lg p-4 bg-muted/50">
            <p
              className="text-2xl font-bold mb-2"
              style={{
                fontFamily: font_family,
                color: primary_color,
              }}
            >
              {name}
            </p>
            {tagline && (
              <p
                className="text-sm"
                style={{
                  fontFamily: font_family,
                  color: secondary_color,
                }}
              >
                {tagline}
              </p>
            )}
          </div>
        </div>

        {/* Sample Button */}
        <div>
          <h4 className="text-sm font-medium mb-2">Sample Button</h4>
          <button
            className="px-4 py-2 rounded-md font-medium text-white transition-colors"
            style={{
              backgroundColor: primary_color,
              fontFamily: font_family,
            }}
          >
            Primary Button
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
