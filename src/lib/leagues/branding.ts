"use server";

import { createClient } from "@/lib/supabase/server";
import { requireLeagueRole } from "@/lib/auth/league-context";
import { stripHtml } from "@/lib/input-sanitization";
import { revalidatePath } from "next/cache";

export type BrandingResult = {
  error?: string;
  success?: boolean;
  branding?: any;
};

/**
 * Extended branding data type for full branding updates
 */
export type FullBrandingUpdate = {
  logoUrl?: string;
  bannerUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  customCss?: string;
  tagline?: string;
};

/**
 * League branding data returned from getLeagueBrandingById
 */
export type LeagueBrandingData = {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  logo_url: string | null;
  banner_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  custom_css: string | null;
  tagline: string | null;
  status: string;
};

/**
 * League Branding Management
 *
 * Allows league owners to customize their league's visual appearance:
 * - Logo upload
 * - Primary and secondary colors
 * - Custom domain (Pro/Enterprise plans)
 */

/**
 * Update league branding (colors, logo, etc.)
 * Requires owner or admin role
 */
export async function updateLeagueBranding(
  leagueId: string,
  updates: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
    tagline?: string;
  }
): Promise<BrandingResult> {
  try {
    // Require owner or admin role
    await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    const sanitized: any = {};

    // Validate and sanitize colors (hex format)
    if (updates.primary_color) {
      const colorValidation = validateHexColor(updates.primary_color);
      if (!colorValidation.valid) {
        return { error: `Primary color: ${colorValidation.error}` };
      }
      sanitized.primary_color = updates.primary_color;
    }

    if (updates.secondary_color) {
      const colorValidation = validateHexColor(updates.secondary_color);
      if (!colorValidation.valid) {
        return { error: `Secondary color: ${colorValidation.error}` };
      }
      sanitized.secondary_color = updates.secondary_color;
    }

    if (updates.logo_url) {
      // Validate URL format
      try {
        new URL(updates.logo_url);
        sanitized.logo_url = updates.logo_url;
      } catch {
        return { error: 'Invalid logo URL format' };
      }
    }

    if (updates.tagline !== undefined) {
      sanitized.tagline = stripHtml(updates.tagline);
      if (sanitized.tagline.length > 200) {
        return { error: 'Tagline must be less than 200 characters' };
      }
    }

    // Update league branding
    const { data: league, error } = await supabase
      .from('leagues')
      .update({
        ...sanitized,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId)
      .select()
      .single();

    if (error) {
      console.error('Error updating league branding:', error);
      return { error: 'Failed to update branding' };
    }

    return { success: true, branding: league };
  } catch (error: any) {
    console.error('Error in updateLeagueBranding:', error);
    return { error: error.message || 'Failed to update branding' };
  }
}

/**
 * Upload a league logo to Supabase Storage
 * Requires owner or admin role
 */
export async function uploadLeagueLogo(
  leagueId: string,
  file: File
): Promise<{ logoUrl?: string; error?: string }> {
  try {
    // Require owner or admin role
    await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return { error: 'Invalid file type. Please upload a JPEG, PNG, GIF, WebP, or SVG image.' };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { error: 'File size exceeds 5MB limit' };
    }

    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${leagueId}-${Date.now()}.${fileExt}`;
    const filePath = `league-logos/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('league-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return { error: 'Failed to upload logo' };
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('league-assets')
      .getPublicUrl(filePath);

    const logoUrl = urlData.publicUrl;

    // Update league with new logo URL
    const { error: updateError } = await supabase
      .from('leagues')
      .update({
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId);

    if (updateError) {
      console.error('Error updating league logo URL:', updateError);
      // Clean up uploaded file
      await supabase.storage.from('league-assets').remove([filePath]);
      return { error: 'Failed to save logo URL' };
    }

    return { logoUrl };
  } catch (error: any) {
    console.error('Error in uploadLeagueLogo:', error);
    return { error: error.message || 'Failed to upload logo' };
  }
}

/**
 * Configure custom domain for a league (Pro/Enterprise feature)
 * Requires owner role
 */
export async function setCustomDomain(
  leagueId: string,
  domain: string
): Promise<BrandingResult> {
  try {
    // Require owner role
    await requireLeagueRole(['owner']);

    const supabase = await createClient();

    // Validate domain format
    const domainValidation = validateDomain(domain);
    if (!domainValidation.valid) {
      return { error: domainValidation.error };
    }

    // Check if domain is already in use by another league
    const { data: existingLeague } = await supabase
      .from('leagues')
      .select('id')
      .eq('custom_domain', domain)
      .neq('id', leagueId)
      .single();

    if (existingLeague) {
      return { error: 'This domain is already in use by another league' };
    }

    // Update league with custom domain
    const { error } = await supabase
      .from('leagues')
      .update({
        custom_domain: domain,
        custom_domain_verified: false, // Will be verified via DNS check
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId);

    if (error) {
      console.error('Error setting custom domain:', error);
      return { error: 'Failed to set custom domain' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in setCustomDomain:', error);
    return { error: error.message || 'Failed to set custom domain' };
  }
}

/**
 * Remove custom domain from a league
 * Requires owner role
 */
export async function removeCustomDomain(leagueId: string): Promise<BrandingResult> {
  try {
    // Require owner role
    await requireLeagueRole(['owner']);

    const supabase = await createClient();

    const { error } = await supabase
      .from('leagues')
      .update({
        custom_domain: null,
        custom_domain_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId);

    if (error) {
      console.error('Error removing custom domain:', error);
      return { error: 'Failed to remove custom domain' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in removeCustomDomain:', error);
    return { error: error.message || 'Failed to remove custom domain' };
  }
}

/**
 * Get league branding information
 */
export async function getLeagueBranding(leagueId: string): Promise<BrandingResult> {
  try {
    const supabase = await createClient();

    const { data: league, error } = await supabase
      .from('leagues')
      .select('logo_url, primary_color, secondary_color, tagline, custom_domain, custom_domain_verified')
      .eq('id', leagueId)
      .single();

    if (error) {
      console.error('Error fetching league branding:', error);
      return { error: 'Failed to fetch branding' };
    }

    return { success: true, branding: league };
  } catch (error: any) {
    console.error('Error in getLeagueBranding:', error);
    return { error: error.message || 'Failed to fetch branding' };
  }
}

// Helper functions

/**
 * Validate a hex color code
 */
function validateHexColor(color: string): { valid: boolean; error?: string } {
  // Remove # if present
  const cleanColor = color.replace(/^#/, '');

  // Check if valid hex (3 or 6 characters)
  const hexRegex = /^[0-9A-Fa-f]{6}$|^[0-9A-Fa-f]{3}$/;
  if (!hexRegex.test(cleanColor)) {
    return { valid: false, error: 'Invalid color format. Use hex format like #FF0000 or #F00' };
  }

  return { valid: true };
}

/**
 * Validate a domain name
 */
function validateDomain(domain: string): { valid: boolean; error?: string } {
  // Remove protocol if present
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Basic domain validation
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  if (!domainRegex.test(cleanDomain)) {
    return { valid: false, error: 'Invalid domain format. Example: yourleague.com' };
  }

  // Check for reserved domains
  if (cleanDomain.includes('hockeylifehl.app') || cleanDomain.includes('localhost')) {
    return { valid: false, error: 'Cannot use platform domains' };
  }

  return { valid: true };
}

// ============================================================================
// NEW FUNCTIONS FOR MULTI-INSTANCE ARCHITECTURE
// ============================================================================

/**
 * Get complete league branding information by ID
 * Returns all branding fields for use in settings pages
 *
 * @param leagueId - The UUID of the league
 * @returns BrandingResult with full branding data
 */
export async function getLeagueBrandingById(
  leagueId: string
): Promise<{ data?: LeagueBrandingData; error?: string }> {
  try {
    const supabase = await createClient();

    // Note: Using type assertion because branding columns were added by Agent 1's migration
    // and the database types may not be regenerated yet
    const { data, error } = await supabase
      .from('leagues')
      .select(`
        id,
        name,
        slug,
        subdomain,
        custom_domain,
        custom_domain_verified,
        logo_url,
        banner_url,
        favicon_url,
        primary_color,
        secondary_color,
        accent_color,
        font_family,
        custom_css,
        tagline,
        status
      `)
      .eq('id', leagueId)
      .single() as unknown as { data: LeagueBrandingData | null; error: any };

    if (error) {
      console.error('[Branding] Error fetching league branding by ID:', error);
      return { error: error.message };
    }

    if (!data) {
      return { error: 'League not found' };
    }

    return { data };
  } catch (error: any) {
    console.error('[Branding] Unexpected error in getLeagueBrandingById:', error);
    return { error: error.message || 'Failed to fetch branding' };
  }
}

/**
 * Update full league branding (all fields)
 * Requires owner role for full branding updates
 *
 * This function handles all branding fields including:
 * - Logo, banner, favicon URLs
 * - Primary, secondary, accent colors
 * - Font family
 * - Custom CSS (for Pro/Enterprise)
 * - Tagline
 *
 * @param leagueId - The UUID of the league
 * @param branding - Partial branding update object
 * @returns BrandingResult with success status
 */
export async function updateFullLeagueBranding(
  leagueId: string,
  branding: FullBrandingUpdate
): Promise<BrandingResult> {
  try {
    // Require owner role for full branding updates
    await requireLeagueRole(['owner']);

    const supabase = await createClient();

    // Build the update object, only including defined values
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Validate and add URL fields
    if (branding.logoUrl !== undefined) {
      if (branding.logoUrl && !isValidUrl(branding.logoUrl)) {
        return { error: 'Invalid logo URL format' };
      }
      updateData.logo_url = branding.logoUrl || null;
    }

    if (branding.bannerUrl !== undefined) {
      if (branding.bannerUrl && !isValidUrl(branding.bannerUrl)) {
        return { error: 'Invalid banner URL format' };
      }
      updateData.banner_url = branding.bannerUrl || null;
    }

    if (branding.faviconUrl !== undefined) {
      if (branding.faviconUrl && !isValidUrl(branding.faviconUrl)) {
        return { error: 'Invalid favicon URL format' };
      }
      updateData.favicon_url = branding.faviconUrl || null;
    }

    // Validate and add color fields
    if (branding.primaryColor !== undefined) {
      const validation = validateHexColor(branding.primaryColor);
      if (!validation.valid) {
        return { error: `Primary color: ${validation.error}` };
      }
      updateData.primary_color = branding.primaryColor;
    }

    if (branding.secondaryColor !== undefined) {
      const validation = validateHexColor(branding.secondaryColor);
      if (!validation.valid) {
        return { error: `Secondary color: ${validation.error}` };
      }
      updateData.secondary_color = branding.secondaryColor;
    }

    if (branding.accentColor !== undefined) {
      const validation = validateHexColor(branding.accentColor);
      if (!validation.valid) {
        return { error: `Accent color: ${validation.error}` };
      }
      updateData.accent_color = branding.accentColor;
    }

    // Validate and add font family
    if (branding.fontFamily !== undefined) {
      if (branding.fontFamily && branding.fontFamily.length > 200) {
        return { error: 'Font family must be less than 200 characters' };
      }
      updateData.font_family = branding.fontFamily || 'Inter, system-ui, sans-serif';
    }

    // Validate and add custom CSS (sanitize for security)
    if (branding.customCss !== undefined) {
      if (branding.customCss && branding.customCss.length > 10000) {
        return { error: 'Custom CSS must be less than 10,000 characters' };
      }
      // Basic CSS sanitization - remove potentially dangerous constructs
      if (branding.customCss && containsDangerousCss(branding.customCss)) {
        return { error: 'Custom CSS contains potentially unsafe content' };
      }
      updateData.custom_css = branding.customCss || null;
    }

    // Validate and add tagline
    if (branding.tagline !== undefined) {
      const sanitizedTagline = stripHtml(branding.tagline || '');
      if (sanitizedTagline.length > 200) {
        return { error: 'Tagline must be less than 200 characters' };
      }
      updateData.tagline = sanitizedTagline || null;
    }

    // Perform the update
    const { data, error } = await supabase
      .from('leagues')
      .update(updateData)
      .eq('id', leagueId)
      .select()
      .single();

    if (error) {
      console.error('[Branding] Error updating league branding:', error);
      return { error: 'Failed to update branding' };
    }

    // Revalidate paths that might display this branding
    revalidatePath('/league');
    revalidatePath('/[league]/settings/branding');

    return { success: true, branding: data };
  } catch (error: any) {
    console.error('[Branding] Unexpected error in updateFullLeagueBranding:', error);
    return { error: error.message || 'Failed to update branding' };
  }
}

/**
 * Validate a URL format
 */
function isValidUrl(url: string): boolean {
  // Allow relative URLs starting with /
  if (url.startsWith('/')) {
    return true;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check for potentially dangerous CSS patterns
 * This is a basic check - production should use a proper CSS sanitizer
 */
function containsDangerousCss(css: string): boolean {
  const dangerousPatterns = [
    /javascript:/i,
    /expression\s*\(/i,
    /behavior\s*:/i,
    /@import\s+url\s*\(/i,
    /url\s*\(\s*["']?data:/i,
    /<script/i,
    /<\/script/i,
  ];

  return dangerousPatterns.some(pattern => pattern.test(css));
}
