"use server";

// ============================================================================
// SITE TEMPLATES - SERVER ACTIONS
// ============================================================================
// Description: Server actions for managing site templates and league customizations
// Date: 2026-01-28
// Agent: Agent 1
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  SiteTemplate,
  TemplateCustomization,
  LeagueTemplateSettings,
} from "@/types/site-templates";

// ============================================================================
// RESULT TYPES
// ============================================================================

export type TemplateResult<T> = {
  data?: T;
  error?: string;
  success: boolean;
};

export type TemplateListResult = TemplateResult<SiteTemplate[]>;
export type TemplateSingleResult = TemplateResult<SiteTemplate>;
export type LeagueTemplateResult = TemplateResult<{
  template: SiteTemplate;
  settings: LeagueTemplateSettings | null;
  customizations: TemplateCustomization;
}>;
export type SaveTemplateResult = TemplateResult<LeagueTemplateSettings>;

// ============================================================================
// FUNCTION: getAllTemplates
// ============================================================================
// Purpose: Fetch all active site templates for selection
// ============================================================================

/**
 * Get all active site templates
 * Used in signup wizard and settings pages
 *
 * @returns Promise with array of active templates, sorted by sort_order
 */
export async function getAllTemplates(): Promise<TemplateListResult> {
  try {
    const supabase = await createClient();

    // Fetch all active templates
    // Note: site_templates table exists but types not yet generated
    const { data, error } = await (supabase as any)
      .from("site_templates")
      .select("id, name, slug, description, preview_image_url, is_active, config, sort_order, created_at, updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching templates:", error);
      return {
        success: false,
        error: "Failed to load site templates. Please try again.",
      };
    }

    // Transform database format to match our TypeScript interface
    const templates: SiteTemplate[] = (data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      preview_image_url: t.preview_image_url,
      is_active: true, // Only active templates are returned
      config: t.config,
      sort_order: t.sort_order,
      created_at: new Date().toISOString(), // Not returned by helper function
      updated_at: new Date().toISOString(), // Not returned by helper function
    }));

    return {
      success: true,
      data: templates,
    };
  } catch (error: any) {
    console.error("Unexpected error in getAllTemplates:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

// ============================================================================
// FUNCTION: getTemplateById
// ============================================================================
// Purpose: Fetch a single template by ID
// ============================================================================

/**
 * Get a single site template by ID
 *
 * @param templateId - The template ID to fetch
 * @returns Promise with template data
 */
export async function getTemplateById(
  templateId: string
): Promise<TemplateSingleResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as any)
      .from("site_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (error) {
      console.error("Error fetching template:", error);
      return {
        success: false,
        error: "Template not found",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Template not found",
      };
    }

    return {
      success: true,
      data: data as SiteTemplate,
    };
  } catch (error: any) {
    console.error("Unexpected error in getTemplateById:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

// ============================================================================
// FUNCTION: getTemplateBySlug
// ============================================================================
// Purpose: Fetch a single template by slug
// ============================================================================

/**
 * Get a single site template by slug
 *
 * @param slug - The template slug to fetch (e.g., "classic-sports")
 * @returns Promise with template data
 */
export async function getTemplateBySlug(
  slug: string
): Promise<TemplateSingleResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as any)
      .from("site_templates")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Error fetching template:", error);
      return {
        success: false,
        error: "Template not found",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Template not found",
      };
    }

    return {
      success: true,
      data: data as SiteTemplate,
    };
  } catch (error: any) {
    console.error("Unexpected error in getTemplateBySlug:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

// ============================================================================
// FUNCTION: getLeagueTemplate
// ============================================================================
// Purpose: Get a league's selected template and customizations
// ============================================================================

/**
 * Get a league's selected template and customizations
 * Returns the template configuration merged with league customizations
 *
 * @param leagueId - The league ID
 * @returns Promise with template and customizations
 */
export async function getLeagueTemplate(
  leagueId: string
): Promise<LeagueTemplateResult> {
  try {
    const supabase = await createClient();

    // Use the helper function to get merged template config
    const { data, error } = await (supabase as any).rpc("get_league_template_config", {
      p_league_id: leagueId,
    });

    if (error) {
      console.error("Error fetching league template:", error);
      return {
        success: false,
        error: "Failed to load league template",
      };
    }

    // If no template is configured, return null
    if (!data || data.length === 0) {
      return {
        success: true,
        data: {
          template: null as any, // League has no template selected
          settings: null,
          customizations: {},
        },
      };
    }

    const result = data[0];

    // Construct the template object
    const template: SiteTemplate = {
      id: result.template_id,
      name: result.template_name,
      slug: result.template_slug,
      description: "",
      preview_image_url: null,
      is_active: true,
      config: result.template_config,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      success: true,
      data: {
        template,
        settings: null, // Could fetch full settings if needed
        customizations: result.customizations || {},
      },
    };
  } catch (error: any) {
    console.error("Unexpected error in getLeagueTemplate:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

// ============================================================================
// FUNCTION: setLeagueTemplate
// ============================================================================
// Purpose: Set a league's template selection and initial customizations
// ============================================================================

/**
 * Set a league's template selection and customizations
 * Creates or updates the league_template_settings record
 *
 * @param leagueId - The league ID
 * @param templateId - The template ID to assign
 * @param customizations - Optional customizations to apply
 * @returns Promise with saved settings
 */
export async function setLeagueTemplate(
  leagueId: string,
  templateId: string,
  customizations: TemplateCustomization = {}
): Promise<SaveTemplateResult> {
  try {
    const supabase = await createClient();

    // ========================================================================
    // 1. CHECK AUTHENTICATION
    // ========================================================================

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    // ========================================================================
    // 2. VERIFY USER IS LEAGUE OWNER OR ADMIN
    // ========================================================================

    const { data: membership, error: membershipError } = await supabase
      .from("league_memberships")
      .select("role, status")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return {
        success: false,
        error: "You are not a member of this league",
      };
    }

    if (!["owner", "admin"].includes(membership.role)) {
      return {
        success: false,
        error: "Only league owners and admins can change the template",
      };
    }

    if (membership.status !== "active") {
      return {
        success: false,
        error: "Your membership is not active",
      };
    }

    // ========================================================================
    // 3. VERIFY TEMPLATE EXISTS AND IS ACTIVE
    // ========================================================================

    const { data: template, error: templateError } = await (supabase as any)
      .from("site_templates")
      .select("id, is_active")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      return {
        success: false,
        error: "Template not found",
      };
    }

    if (!template.is_active) {
      return {
        success: false,
        error: "This template is no longer available",
      };
    }

    // ========================================================================
    // 4. UPSERT LEAGUE TEMPLATE SETTINGS
    // ========================================================================

    const { data: settings, error: upsertError } = await (supabase as any)
      .from("league_template_settings")
      .upsert(
        {
          league_id: leagueId,
          template_id: templateId,
          customizations: customizations,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "league_id",
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("Error saving template settings:", upsertError);
      return {
        success: false,
        error: "Failed to save template settings",
      };
    }

    // ========================================================================
    // 5. REVALIDATE PATHS
    // ========================================================================

    revalidatePath(`/[league]`, "layout");
    revalidatePath(`/${leagueId}/settings/design`);

    return {
      success: true,
      data: settings as LeagueTemplateSettings,
    };
  } catch (error: any) {
    console.error("Unexpected error in setLeagueTemplate:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

// ============================================================================
// FUNCTION: updateTemplateCustomizations
// ============================================================================
// Purpose: Update only the customizations for a league's template
// ============================================================================

/**
 * Update template customizations for a league
 * Updates colors, logo, and other custom settings without changing the base template
 *
 * @param leagueId - The league ID
 * @param customizations - Customizations to apply/update
 * @returns Promise with updated settings
 */
export async function updateTemplateCustomizations(
  leagueId: string,
  customizations: TemplateCustomization
): Promise<SaveTemplateResult> {
  try {
    const supabase = await createClient();

    // ========================================================================
    // 1. CHECK AUTHENTICATION
    // ========================================================================

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    // ========================================================================
    // 2. VERIFY USER IS LEAGUE OWNER OR ADMIN
    // ========================================================================

    const { data: membership, error: membershipError } = await supabase
      .from("league_memberships")
      .select("role, status")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return {
        success: false,
        error: "You are not a member of this league",
      };
    }

    if (!["owner", "admin"].includes(membership.role)) {
      return {
        success: false,
        error: "Only league owners and admins can customize the template",
      };
    }

    if (membership.status !== "active") {
      return {
        success: false,
        error: "Your membership is not active",
      };
    }

    // ========================================================================
    // 3. GET EXISTING SETTINGS
    // ========================================================================

    const { data: existingSettings, error: fetchError } = await (supabase as any)
      .from("league_template_settings")
      .select("*")
      .eq("league_id", leagueId)
      .single();

    if (fetchError || !existingSettings) {
      return {
        success: false,
        error: "No template configured for this league. Please select a template first.",
      };
    }

    // ========================================================================
    // 4. MERGE CUSTOMIZATIONS
    // ========================================================================

    const mergedCustomizations = {
      ...existingSettings.customizations,
      ...customizations,
    };

    // ========================================================================
    // 5. UPDATE SETTINGS
    // ========================================================================

    const { data: updatedSettings, error: updateError } = await (supabase as any)
      .from("league_template_settings")
      .update({
        customizations: mergedCustomizations,
        updated_at: new Date().toISOString(),
      })
      .eq("league_id", leagueId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating customizations:", updateError);
      return {
        success: false,
        error: "Failed to update customizations",
      };
    }

    // ========================================================================
    // 6. REVALIDATE PATHS
    // ========================================================================

    revalidatePath(`/[league]`, "layout");
    revalidatePath(`/${leagueId}/settings/design`);

    return {
      success: true,
      data: updatedSettings as LeagueTemplateSettings,
    };
  } catch (error: any) {
    console.error("Unexpected error in updateTemplateCustomizations:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

// ============================================================================
// FUNCTION: resetLeagueTemplate
// ============================================================================
// Purpose: Reset a league's template to default (remove customizations)
// ============================================================================

/**
 * Reset a league's template customizations to default
 * Keeps the selected template but removes all custom colors/settings
 *
 * @param leagueId - The league ID
 * @returns Promise with reset settings
 */
export async function resetLeagueTemplate(
  leagueId: string
): Promise<SaveTemplateResult> {
  try {
    const supabase = await createClient();

    // ========================================================================
    // 1. CHECK AUTHENTICATION
    // ========================================================================

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    // ========================================================================
    // 2. VERIFY USER IS LEAGUE OWNER OR ADMIN
    // ========================================================================

    const { data: membership, error: membershipError } = await supabase
      .from("league_memberships")
      .select("role, status")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return {
        success: false,
        error: "You are not a member of this league",
      };
    }

    if (!["owner", "admin"].includes(membership.role)) {
      return {
        success: false,
        error: "Only league owners and admins can reset the template",
      };
    }

    // ========================================================================
    // 3. RESET CUSTOMIZATIONS
    // ========================================================================

    const { data: updatedSettings, error: updateError } = await (supabase as any)
      .from("league_template_settings")
      .update({
        customizations: {},
        updated_at: new Date().toISOString(),
      })
      .eq("league_id", leagueId)
      .select()
      .single();

    if (updateError) {
      console.error("Error resetting template:", updateError);
      return {
        success: false,
        error: "Failed to reset template",
      };
    }

    // ========================================================================
    // 4. REVALIDATE PATHS
    // ========================================================================

    revalidatePath(`/[league]`, "layout");
    revalidatePath(`/${leagueId}/settings/design`);

    return {
      success: true,
      data: updatedSettings as LeagueTemplateSettings,
    };
  } catch (error: any) {
    console.error("Unexpected error in resetLeagueTemplate:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

// ============================================================================
// END OF TEMPLATE SERVER ACTIONS
// ============================================================================
