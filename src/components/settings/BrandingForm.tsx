"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { updateFullLeagueBranding, type LeagueBrandingData } from "@/lib/leagues/branding";
import { toast } from "sonner";
import { Palette, Image as ImageIcon, Code, Type, Save, RotateCcw } from "lucide-react";

/**
 * Branding Form Component
 *
 * Comprehensive form for league branding customization with:
 * - Color pickers synchronized with hex inputs
 * - Image URL inputs for logos and banners
 * - Font family selection
 * - Custom CSS editor
 * - Real-time preview panel
 * - Save/reset functionality
 */

interface BrandingFormProps {
  initialBranding: LeagueBrandingData;
  leagueId: string;
}

export function BrandingForm({ initialBranding, leagueId }: BrandingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [logoUrl, setLogoUrl] = useState(initialBranding.logo_url || "");
  const [bannerUrl, setBannerUrl] = useState(initialBranding.banner_url || "");
  const [faviconUrl, setFaviconUrl] = useState(initialBranding.favicon_url || "");
  const [primaryColor, setPrimaryColor] = useState(initialBranding.primary_color || "#1F4FD8");
  const [secondaryColor, setSecondaryColor] = useState(initialBranding.secondary_color || "#D72638");
  const [accentColor, setAccentColor] = useState(initialBranding.accent_color || "#FFD700");
  const [fontFamily, setFontFamily] = useState(initialBranding.font_family || "Inter, system-ui, sans-serif");
  const [customCss, setCustomCss] = useState(initialBranding.custom_css || "");
  const [tagline, setTagline] = useState(initialBranding.tagline || "");

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateFullLeagueBranding(leagueId, {
        logoUrl: logoUrl || null,
        bannerUrl: bannerUrl || null,
        faviconUrl: faviconUrl || null,
        primaryColor,
        secondaryColor,
        accentColor,
        fontFamily,
        customCss: customCss || null,
        tagline: tagline || null,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Branding updated successfully!");
        // Refresh the page to show updated branding
        router.refresh();
      }
    } catch (error) {
      console.error("Error updating branding:", error);
      toast.error("Failed to update branding. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Reset to initial values
  function handleReset() {
    setLogoUrl(initialBranding.logo_url || "");
    setBannerUrl(initialBranding.banner_url || "");
    setFaviconUrl(initialBranding.favicon_url || "");
    setPrimaryColor(initialBranding.primary_color || "#1F4FD8");
    setSecondaryColor(initialBranding.secondary_color || "#D72638");
    setAccentColor(initialBranding.accent_color || "#FFD700");
    setFontFamily(initialBranding.font_family || "Inter, system-ui, sans-serif");
    setCustomCss(initialBranding.custom_css || "");
    setTagline(initialBranding.tagline || "");
    toast.info("Form reset to original values");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="colors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="colors">
            <Palette className="h-4 w-4 mr-2" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="images">
            <ImageIcon className="h-4 w-4 mr-2" />
            Images
          </TabsTrigger>
          <TabsTrigger value="typography">
            <Type className="h-4 w-4 mr-2" />
            Typography
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Code className="h-4 w-4 mr-2" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Colors</CardTitle>
              <CardDescription>
                Choose colors that represent your league brand. These will be used throughout your site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primary Color */}
              <div className="space-y-2">
                <Label htmlFor="primaryColor">
                  Primary Color <Badge variant="secondary">Main Brand Color</Badge>
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-12 w-20 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#1F4FD8"
                    className="flex-1 uppercase font-mono"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Used for primary buttons, links, and highlights
                </p>
              </div>

              {/* Secondary Color */}
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">
                  Secondary Color <Badge variant="secondary">Accent Elements</Badge>
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-12 w-20 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#D72638"
                    className="flex-1 uppercase font-mono"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Used for secondary buttons and contrast elements
                </p>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <Label htmlFor="accentColor">
                  Accent Color <Badge variant="secondary">Special Highlights</Badge>
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="accentColor"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-12 w-20 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#FFD700"
                    className="flex-1 uppercase font-mono"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Used for special highlights, badges, and awards
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Images</CardTitle>
              <CardDescription>
                Upload logos, banners, and icons. URLs should point to publicly accessible images.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo URL */}
              <div className="space-y-2">
                <Label htmlFor="logoUrl">League Logo URL</Label>
                <Input
                  id="logoUrl"
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png or /logo.png"
                />
                <p className="text-sm text-muted-foreground">
                  Recommended: 512x512px PNG with transparent background
                </p>
              </div>

              {/* Banner URL */}
              <div className="space-y-2">
                <Label htmlFor="bannerUrl">Banner Image URL (Optional)</Label>
                <Input
                  id="bannerUrl"
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://example.com/banner.png"
                />
                <p className="text-sm text-muted-foreground">
                  Recommended: 1920x400px for header banners
                </p>
              </div>

              {/* Favicon URL */}
              <div className="space-y-2">
                <Label htmlFor="faviconUrl">Favicon URL (Optional)</Label>
                <Input
                  id="faviconUrl"
                  type="url"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="https://example.com/favicon.ico"
                />
                <p className="text-sm text-muted-foreground">
                  Recommended: 32x32px ICO or PNG file
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>
                Customize fonts and text appearance for your league site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Font Family */}
              <div className="space-y-2">
                <Label htmlFor="fontFamily">Font Family</Label>
                <Input
                  id="fontFamily"
                  type="text"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  placeholder="Inter, system-ui, sans-serif"
                  className="font-mono"
                />
                <p className="text-sm text-muted-foreground">
                  Use Google Fonts or system fonts. Include fallbacks separated by commas.
                </p>
              </div>

              {/* Tagline */}
              <div className="space-y-2">
                <Label htmlFor="tagline">League Tagline (Optional)</Label>
                <Input
                  id="tagline"
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="For Fun, For Beers, For Glory"
                  maxLength={200}
                />
                <p className="text-sm text-muted-foreground">
                  A short phrase that captures your league spirit (max 200 characters)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom CSS</CardTitle>
              <CardDescription>
                Add custom CSS for advanced styling. Use with caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                id="customCss"
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                rows={12}
                placeholder={`/* Example custom CSS */
.league-header {
  background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
}

.team-card {
  border: 2px solid var(--accent-color);
}`}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                You can use CSS variables: --primary-color, --secondary-color, --accent-color
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>
            See how your branding choices will look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="p-6 rounded-lg border-2 space-y-4"
            style={{
              borderColor: primaryColor,
              backgroundColor: `${primaryColor}05`,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                ) : (
                  "LOGO"
                )}
              </div>
              <div>
                <h3
                  className="text-2xl font-bold"
                  style={{ color: primaryColor, fontFamily }}
                >
                  {initialBranding.name}
                </h3>
                {tagline && (
                  <p className="text-sm text-muted-foreground" style={{ fontFamily }}>
                    {tagline}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                style={{ backgroundColor: primaryColor }}
                className="hover:opacity-90"
              >
                Primary Button
              </Button>
              <Button
                type="button"
                style={{ backgroundColor: secondaryColor }}
                className="hover:opacity-90"
              >
                Secondary Button
              </Button>
              <Badge style={{ backgroundColor: accentColor, color: "#000" }}>
                Accent Badge
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={handleReset} disabled={loading}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Saving..." : "Save Branding"}
        </Button>
      </div>
    </form>
  );
}
