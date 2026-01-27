"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { escape } from "html-escaper";
import type { Database } from "@/types/database";
import { requireLeagueRole } from "@/lib/auth/league-context";

/**
 * Division Management Server Actions
 *
 * Provides CRUD operations for divisions in a multi-tenant hockey league platform.
 * All operations are scoped to the active league and enforce role-based authorization.
 *
 * SECURITY:
 * - All actions filter by league_id to enforce tenant isolation
 * - RLS policies enforce additional database-level security
 * - Input validation prevents XSS and injection attacks
 * - Unique constraint on (league_id, name) prevents duplicate divisions within a league
 *
 * DOMAIN INVARIANTS:
 * - Division names must be unique within a league (enforced by DB constraint)
 * - Every division must belong to exactly one league (NOT NULL + FK)
 * - Division names: 3-50 characters
 * - Skill levels: beginner, intermediate, advanced, elite
 * - Max teams: 2-20 range
 * - Game duration: 30-90 minutes
 * - Period count: 1-3 periods
 */

type Division = Database['public']['Tables']['divisions']['Row'];
type DivisionInsert = Database['public']['Tables']['divisions']['Insert'];
type DivisionUpdate = Database['public']['Tables']['divisions']['Update'];

// Valid skill levels (enforced at application level, not DB)
const VALID_SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'elite'] as const;
type SkillLevel = typeof VALID_SKILL_LEVELS[number];

export type DivisionActionResult = {
  error?: string;
  success?: boolean;
  division?: Division;
};

export type DivisionsListResult = {
  error?: string;
  divisions: Division[];
};

/**
 * Get all divisions for the active league
 * Any league member can view divisions
 */
export async function getAllDivisions(): Promise<DivisionsListResult> {
  try {
    // Require league membership (any role can view divisions)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    const { data: divisions, error } = await supabase
      .from("divisions")
      .select("*")
      .eq('league_id', leagueId) // CRITICAL: Filter by league
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching divisions:", error);
      return { error: error.message, divisions: [] };
    }

    return { divisions: divisions || [] };
  } catch (error: any) {
    console.error("Error in getAllDivisions:", error);
    return { error: error.message || 'Unauthorized', divisions: [] };
  }
}

/**
 * Get a single division by ID
 */
export async function getDivisionById(divisionId: string): Promise<{ division: Division | null; error?: string }> {
  try {
    // Require league membership (any role can view divisions)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    const { data: division, error } = await supabase
      .from("divisions")
      .select("*")
      .eq("id", divisionId)
      .eq('league_id', leagueId) // CRITICAL: Verify division belongs to user's league
      .single();

    if (error) {
      console.error("Error fetching division:", error);
      return { error: error.message, division: null };
    }

    return { division };
  } catch (error: any) {
    console.error("Error in getDivisionById:", error);
    return { error: error.message || 'Unauthorized', division: null };
  }
}

/**
 * Create a new division
 *
 * Authorization: Only league owners and admins can create divisions
 *
 * Validates all inputs and enforces business rules:
 * - Name: 3-50 characters, unique within league
 * - Skill level: beginner, intermediate, advanced, elite
 * - Max teams: 2-20
 * - Game duration: 30-90 minutes
 * - Period count: 1-3
 *
 * @param data - Division data object (preferred) or FormData
 * @returns Created division or error
 */
export async function createDivision(
  data: FormData | {
    name: string;
    description?: string;
    skill_level?: string;
    max_teams?: number;
    game_duration_minutes?: number;
    period_count?: number;
  }
): Promise<DivisionActionResult> {
  try {
    // Require owner or admin role to create divisions
    const { leagueId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Extract data from FormData or object
    let name: string;
    let description: string | undefined;
    let skillLevel: string | null;
    let maxTeams: string | number;
    let gameDuration: string | number;
    let periodCount: string | number;

    if (data instanceof FormData) {
      name = data.get("name") as string;
      description = (data.get("description") as string) || undefined;
      skillLevel = (data.get("skillLevel") as string) || null;
      maxTeams = data.get("maxTeams") as string;
      gameDuration = data.get("gameDuration") as string;
      periodCount = data.get("periodCount") as string;
    } else {
      name = data.name;
      description = data.description;
      skillLevel = data.skill_level || null;
      maxTeams = data.max_teams || "";
      gameDuration = data.game_duration_minutes || "";
      periodCount = data.period_count || "";
    }

    // SECURITY: Validation with length limits
    if (!name || name.trim().length < 3) {
      return { error: "Division name must be at least 3 characters" };
    }
    if (name.trim().length > 50) {
      return { error: "Division name cannot exceed 50 characters" };
    }

    // Validate skill level (optional field)
    if (skillLevel) {
      const normalizedLevel = skillLevel.toLowerCase();
      if (!VALID_SKILL_LEVELS.includes(normalizedLevel as SkillLevel)) {
        return { error: `Skill level must be one of: ${VALID_SKILL_LEVELS.join(', ')}` };
      }
      skillLevel = normalizedLevel; // Use normalized value
    }

    // Validate max teams (optional field with defaults)
    let maxTeamsNum: number | null = null;
    if (maxTeams) {
      maxTeamsNum = typeof maxTeams === 'string' ? parseInt(maxTeams) : maxTeams;
      if (isNaN(maxTeamsNum) || maxTeamsNum < 2 || maxTeamsNum > 20) {
        return { error: "Max teams must be between 2 and 20" };
      }
    }

    // Validate game duration (optional field with defaults)
    let gameDurationNum: number | null = null;
    if (gameDuration) {
      gameDurationNum = typeof gameDuration === 'string' ? parseInt(gameDuration) : gameDuration;
      if (isNaN(gameDurationNum) || gameDurationNum < 30 || gameDurationNum > 90) {
        return { error: "Game duration must be between 30 and 90 minutes" };
      }
    }

    // Validate period count (optional field with defaults)
    let periodCountNum: number | null = null;
    if (periodCount) {
      periodCountNum = typeof periodCount === 'string' ? parseInt(periodCount) : periodCount;
      if (isNaN(periodCountNum) || periodCountNum < 1 || periodCountNum > 3) {
        return { error: "Period count must be between 1 and 3" };
      }
    }

    // SECURITY: HTML-escape user inputs to prevent XSS
    const sanitizedName = escape(name.trim());
    const sanitizedDescription = description ? escape(description.trim()) : null;

    // Check for duplicate name within the league (case-insensitive)
    const { data: existing } = await supabase
      .from("divisions")
      .select("id, name")
      .eq('league_id', leagueId) // Check within league
      .ilike("name", name.trim())
      .single();

    if (existing) {
      return { error: `A division named "${existing.name}" already exists in this league` };
    }

    const divisionData: DivisionInsert = {
      league_id: leagueId, // CRITICAL: Associate division with league
      name: sanitizedName,
      description: sanitizedDescription,
      skill_level: skillLevel,
      max_teams: maxTeamsNum,
      game_duration_minutes: gameDurationNum,
      period_count: periodCountNum,
    };

    const { data: division, error } = await supabase
      .from("divisions")
      .insert(divisionData)
      .select()
      .single();

    if (error) {
      console.error("Error creating division:", error);

      // Handle unique constraint violation (23505 = unique_violation)
      if (error.code === '23505') {
        return { error: "A division with this name already exists in this league" };
      }

      return { error: error.message };
    }

    // Revalidate relevant paths
    revalidatePath("/admin/divisions");
    revalidatePath("/divisions");
    revalidatePath("/schedule");

    return { success: true, division };
  } catch (error: any) {
    console.error("Error in createDivision:", error);
    return { error: error.message || 'Unauthorized or failed to create division' };
  }
}

/**
 * Update an existing division
 *
 * Authorization: Only league owners and admins can update divisions
 *
 * Validates all inputs and checks for duplicate names.
 * Only updates fields that are provided (partial updates supported).
 *
 * @param id - Division UUID
 * @param data - Division update data (FormData or object)
 * @returns Updated division or error
 */
export async function updateDivision(
  id: string,
  data: FormData | {
    name?: string;
    description?: string;
    skill_level?: string;
    max_teams?: number;
    game_duration_minutes?: number;
    period_count?: number;
  }
): Promise<DivisionActionResult> {
  try {
    // Require owner or admin role to update divisions
    const { leagueId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Verify division exists and belongs to league
    const { data: existingDivision, error: fetchError } = await supabase
      .from("divisions")
      .select("id, name, league_id")
      .eq("id", id)
      .eq("league_id", leagueId)
      .single();

    if (fetchError || !existingDivision) {
      return { error: "Division not found or does not belong to your league" };
    }

    // Extract data from FormData or object
    let name: string | undefined;
    let description: string | undefined;
    let skillLevel: string | null | undefined;
    let maxTeams: string | number | undefined;
    let gameDuration: string | number | undefined;
    let periodCount: string | number | undefined;

    if (data instanceof FormData) {
      name = (data.get("name") as string) || undefined;
      description = (data.get("description") as string) || undefined;
      skillLevel = (data.get("skillLevel") as string) || undefined;
      maxTeams = (data.get("maxTeams") as string) || undefined;
      gameDuration = (data.get("gameDuration") as string) || undefined;
      periodCount = (data.get("periodCount") as string) || undefined;
    } else {
      name = data.name;
      description = data.description;
      skillLevel = data.skill_level;
      maxTeams = data.max_teams;
      gameDuration = data.game_duration_minutes;
      periodCount = data.period_count;
    }

    // Validate name if provided
    if (name !== undefined) {
      if (!name || name.trim().length < 3) {
        return { error: "Division name must be at least 3 characters" };
      }
      if (name.trim().length > 50) {
        return { error: "Division name cannot exceed 50 characters" };
      }

      // Check for duplicate name (case-insensitive), excluding current division
      const { data: duplicate } = await supabase
        .from("divisions")
        .select("id, name")
        .eq('league_id', leagueId)
        .ilike("name", name.trim())
        .neq("id", id)
        .single();

      if (duplicate) {
        return { error: `A division named "${duplicate.name}" already exists in this league` };
      }
    }

    // Validate skill level if provided
    if (skillLevel !== undefined) {
      if (skillLevel) {
        const normalizedLevel = skillLevel.toLowerCase();
        if (!VALID_SKILL_LEVELS.includes(normalizedLevel as SkillLevel)) {
          return { error: `Skill level must be one of: ${VALID_SKILL_LEVELS.join(', ')}` };
        }
        skillLevel = normalizedLevel;
      } else {
        skillLevel = null; // Allow clearing
      }
    }

    // Validate max teams if provided
    let maxTeamsNum: number | null | undefined = undefined;
    if (maxTeams !== undefined) {
      if (maxTeams) {
        maxTeamsNum = typeof maxTeams === 'string' ? parseInt(maxTeams) : maxTeams;
        if (isNaN(maxTeamsNum) || maxTeamsNum < 2 || maxTeamsNum > 20) {
          return { error: "Max teams must be between 2 and 20" };
        }
      } else {
        maxTeamsNum = null; // Allow clearing
      }
    }

    // Validate game duration if provided
    let gameDurationNum: number | null | undefined = undefined;
    if (gameDuration !== undefined) {
      if (gameDuration) {
        gameDurationNum = typeof gameDuration === 'string' ? parseInt(gameDuration) : gameDuration;
        if (isNaN(gameDurationNum) || gameDurationNum < 30 || gameDurationNum > 90) {
          return { error: "Game duration must be between 30 and 90 minutes" };
        }
      } else {
        gameDurationNum = null; // Allow clearing
      }
    }

    // Validate period count if provided
    let periodCountNum: number | null | undefined = undefined;
    if (periodCount !== undefined) {
      if (periodCount) {
        periodCountNum = typeof periodCount === 'string' ? parseInt(periodCount) : periodCount;
        if (isNaN(periodCountNum) || periodCountNum < 1 || periodCountNum > 3) {
          return { error: "Period count must be between 1 and 3" };
        }
      } else {
        periodCountNum = null; // Allow clearing
      }
    }

    // Prepare update data (only include fields that are being updated)
    const updateData: DivisionUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      updateData.name = escape(name.trim());
    }
    if (description !== undefined) {
      updateData.description = description ? escape(description.trim()) : null;
    }
    if (skillLevel !== undefined) {
      updateData.skill_level = skillLevel;
    }
    if (maxTeamsNum !== undefined) {
      updateData.max_teams = maxTeamsNum;
    }
    if (gameDurationNum !== undefined) {
      updateData.game_duration_minutes = gameDurationNum;
    }
    if (periodCountNum !== undefined) {
      updateData.period_count = periodCountNum;
    }

    const { data: division, error } = await supabase
      .from("divisions")
      .update(updateData)
      .eq("id", id)
      .eq("league_id", leagueId) // CRITICAL: Only update divisions in this league
      .select()
      .single();

    if (error) {
      console.error("Error updating division:", error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return { error: "A division with this name already exists in this league" };
      }

      return { error: error.message };
    }

    // Revalidate relevant paths
    revalidatePath("/admin/divisions");
    revalidatePath("/divisions");
    revalidatePath(`/divisions/${id}`);
    revalidatePath("/schedule");

    return { success: true, division };
  } catch (error: any) {
    console.error("Error in updateDivision:", error);
    return { error: error.message || 'Unauthorized or failed to update division' };
  }
}

/**
 * Delete a division
 *
 * Authorization: Only league owners and admins can delete divisions
 *
 * IMPORTANT: This will cascade delete related data (games assigned to division, etc.)
 * Consider checking for dependent records before deletion in production.
 *
 * @param id - Division UUID
 * @returns Success or error
 */
export async function deleteDivision(id: string): Promise<DivisionActionResult> {
  try {
    // Require owner or admin role to delete divisions
    const { leagueId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Verify division exists and belongs to league
    const { data: division, error: fetchError } = await supabase
      .from("divisions")
      .select("id, name")
      .eq("id", id)
      .eq("league_id", leagueId)
      .single();

    if (fetchError || !division) {
      return { error: "Division not found or does not belong to your league" };
    }

    // TODO: Consider checking for dependent records (games, teams) and warn user
    // For now, rely on ON DELETE CASCADE behavior or FK constraints

    const { error } = await supabase
      .from("divisions")
      .delete()
      .eq("id", id)
      .eq("league_id", leagueId); // CRITICAL: Only delete divisions in this league

    if (error) {
      console.error("Error deleting division:", error);

      // Handle foreign key constraint violations
      if (error.code === '23503') {
        return { error: "Cannot delete division because it has dependent records (games, teams, etc.)" };
      }

      return { error: error.message };
    }

    // Revalidate relevant paths
    revalidatePath("/admin/divisions");
    revalidatePath("/divisions");
    revalidatePath("/schedule");

    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteDivision:", error);
    return { error: error.message || 'Unauthorized or failed to delete division' };
  }
}
