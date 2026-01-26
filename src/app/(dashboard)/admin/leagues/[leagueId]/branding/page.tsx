"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandingPreview } from "@/components/admin/BrandingPreview";
import { getLeagueBrandingById, updateFullLeagueBranding } from "@/lib/leagues/branding";
import { toast } from "sonner";

/**
 * League Branding Editor Page
 * Allows editing all branding fields for a league
 */
export default function LeagueBrandingPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;

  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    logoUrl: '',
    bannerUrl: '',
    faviconUrl: '',
    primaryColor: '#FF0000',
    secondaryColor: '#000000',
    accentColor: '#FFD700',
    fontFamily: 'Inter, system-ui, sans-serif',
    tagline: '',
  });

  useEffect(() => {
    loadBranding();
  }, [leagueId]);

  async function loadBranding() {
    setLoading(true);
    const result = await getLeagueBrandingById(leagueId);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setBranding(result.data);
    setFormData({
      logoUrl: result.data?.logo_url || '',
      bannerUrl: result.data?.banner_url || '',
      faviconUrl: result.data?.favicon_url || '',
      primaryColor: result.data?.primary_color || '#FF0000',
      secondaryColor: result.data?.secondary_color || '#000000',
      accentColor: result.data?.accent_color || '#FFD700',
      fontFamily: result.data?.font_family || 'Inter, system-ui, sans-serif',
      tagline: result.data?.tagline || '',
    });
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await updateFullLeagueBranding(leagueId, {
      logoUrl: formData.logoUrl,
      bannerUrl: formData.bannerUrl,
      faviconUrl: formData.faviconUrl,
      primaryColor: formData.primaryColor,
      secondaryColor: formData.secondaryColor,
      accentColor: formData.accentColor,
      fontFamily: formData.fontFamily,
      tagline: formData.tagline,
    });
    setIsSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Branding updated successfully');
      loadBranding();
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!branding) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">League not found</p>
            <Button asChild variant="outline">
              <Link href="/admin/leagues">Back to Leagues</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Branding</h1>
          <p className="text-muted-foreground mt-2">{branding.name}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/leagues/${leagueId}`}>
            Back to League
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Branding Form */}
        <div className="space-y-6">
          {/* Logo URLs */}
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>Logo, banner, and favicon URLs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  placeholder="https://example.com/logo.png"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bannerUrl">Banner URL</Label>
                <Input
                  id="bannerUrl"
                  placeholder="https://example.com/banner.png"
                  value={formData.bannerUrl}
                  onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faviconUrl">Favicon URL</Label>
                <Input
                  id="faviconUrl"
                  placeholder="https://example.com/favicon.ico"
                  value={formData.faviconUrl}
                  onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Colors</CardTitle>
              <CardDescription>Brand color palette</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    placeholder="#FF0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.accentColor}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.accentColor}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    placeholder="#FFD700"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>Font and tagline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fontFamily">Font Family</Label>
                <Input
                  id="fontFamily"
                  placeholder="Inter, system-ui, sans-serif"
                  value={formData.fontFamily}
                  onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  placeholder="Your league's tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Preview */}
        <div className="sticky top-8">
          <BrandingPreview
            branding={{
              name: branding.name,
              logo_url: formData.logoUrl || null,
              primary_color: formData.primaryColor,
              secondary_color: formData.secondaryColor,
              accent_color: formData.accentColor,
              tagline: formData.tagline || null,
              font_family: formData.fontFamily,
            }}
          />
        </div>
      </div>
    </div>
  );
}
