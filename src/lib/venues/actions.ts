"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireLeagueRole } from "@/lib/auth/league-context";
import { stripHtml, sanitizePhone, sanitizeUrl, sanitizeText } from "@/lib/input-sanitization";
import type { Venue } from "@/types/database";

/**
 * Venue Management Actions
 *
 * Implements production-grade venue CRUD operations with:
 * - Multi-tenant isolation via league_id scoping
 * - Row Level Security (RLS) enforcement
 * - Input sanitization and validation
 * - Proper error handling and user feedback
 * - Cache invalidation via revalidatePath
 *
 * Domain Invariants:
 * - Venue names must be unique within a league (enforced by DB constraint)
 * - Only league owners/admins can create/update/delete venues
 * - All league members can view venues
 * - RLS policies provide defense-in-depth for tenant isolation
 */

export type VenueActionResult = {
  error?: string;
  success?: boolean;
  venue?: Venue;
};

export type VenuesListResult = {
  error?: string;
  venues: Venue[];
};

/**
 * Common amenities for hockey venues
 * Used for UI dropdown/checkbox selection
 */
export const COMMON_AMENITIES = [
  "Locker Rooms",
  "Parking",
  "Concessions",
  "Pro Shop",
  "Viewing Area",
  "WiFi",
  "Heated Locker Rooms",
  "Skate Sharpening",
  "Equipment Rental",
  "Restaurant/Bar",
] as const;

/**
 * Validate phone number format
 * Accepts common formats: (555) 123-4567, 555-123-4567, +1 555 123 4567
 */
function validatePhoneFormat(phone: string): boolean {
  if (!phone) return true; // Optional field

  // Remove all formatting characters
  const digitsOnly = phone.replace(/[\s\-()]/g, '');

  // Must be 10-15 digits (with optional + prefix)
  const phoneRegex = /^\+?\d{10,15}$/;
  return phoneRegex.test(digitsOnly);
}

/**
 * Validate URL format
 * Only allows http/https protocols
 */
function validateUrlFormat(url: string): boolean {
  if (!url) return true; // Optional field

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate venue name
 * Must be 3-100 characters, non-empty after sanitization
 */
function validateVenueName(name: string): { valid: boolean; error?: string } {
  const sanitized = stripHtml(name.trim());

  if (sanitized.length < 3) {
    return { valid: false, error: "Venue name must be at least 3 characters" };
  }

  if (sanitized.length > 100) {
    return { valid: false, error: "Venue name cannot exceed 100 characters" };
  }

  return { valid: true };
}

/**
 * Get all venues for the active league
 *
 * Authorization: Any authenticated league member
 * Returns: List of venues ordered by name
 *
 * @returns Promise with venues array or error
 */
export async function getAllVenues(): Promise<VenuesListResult> {
  try {
    // Require league membership (any role can view venues)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    const { data: venues, error } = await supabase
      .from("venues")
      .select("*")
      .eq('league_id', leagueId) // CRITICAL: Filter by league for tenant isolation
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching venues:", error);
      return { error: error.message, venues: [] };
    }

    return { venues: venues || [] };
  } catch (error: any) {
    console.error("Error in getAllVenues:", error);
    return { error: error.message || 'Unauthorized', venues: [] };
  }
}

/**
 * Get a single venue by ID
 *
 * Authorization: Any authenticated league member
 * Security: Verifies venue belongs to user's active league
 *
 * @param venueId - UUID of the venue to fetch
 * @returns Promise with venue or error
 */
export async function getVenueById(venueId: string): Promise<{ error?: string; venue: Venue | null }> {
  try {
    // Require league membership (any role can view venues)
    const { leagueId } = await requireLeagueRole(['owner', 'admin', 'captain', 'scorekeeper', 'player']);

    const supabase = await createClient();

    const { data: venue, error } = await supabase
      .from("venues")
      .select("*")
      .eq("id", venueId)
      .eq('league_id', leagueId) // CRITICAL: Verify venue belongs to user's league
      .single();

    if (error) {
      console.error("Error fetching venue:", error);
      return { error: error.message, venue: null };
    }

    return { venue };
  } catch (error: any) {
    console.error("Error in getVenueById:", error);
    return { error: error.message || 'Unauthorized', venue: null };
  }
}

/**
 * Create a new venue
 *
 * Authorization: League owner or admin only
 * Validation:
 * - Venue name: 3-100 characters, required
 * - Phone: Optional, must be valid format if provided
 * - Website: Optional, must be valid URL if provided
 * - Amenities: Array of strings
 *
 * Security:
 * - All text inputs are HTML-sanitized
 * - Phone/URL formats validated
 * - Unique constraint on (league_id, name) prevents duplicates
 *
 * @param formData - Form data containing venue information
 * @returns Promise with created venue or error
 */
export async function createVenue(formData: FormData): Promise<VenueActionResult> {
  try {
    // Require owner or admin role to create venues
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Extract and validate required fields
    const name = formData.get("name") as string;

    if (!name) {
      return { error: "Venue name is required" };
    }

    const nameValidation = validateVenueName(name);
    if (!nameValidation.valid) {
      return { error: nameValidation.error };
    }

    // Extract optional fields
    const address = formData.get("address") as string || null;
    const city = formData.get("city") as string || null;
    const stateProvince = formData.get("stateProvince") as string || null;
    const postalCode = formData.get("postalCode") as string || null;
    const country = formData.get("country") as string || "USA";
    const phone = formData.get("phone") as string || null;
    const website = formData.get("website") as string || null;
    const numberOfRinks = formData.get("numberOfRinks") as string || "1";
    const parkingInfo = formData.get("parkingInfo") as string || null;

    // Amenities can be sent as multiple values or as JSON array
    const amenitiesRaw = formData.getAll("amenities");
    let amenities: string[] = [];

    if (amenitiesRaw.length > 0) {
      // If sent as multiple form fields
      amenities = amenitiesRaw.map(a => stripHtml(String(a))).filter(Boolean);
    } else {
      // If sent as JSON string
      const amenitiesJson = formData.get("amenitiesJson") as string;
      if (amenitiesJson) {
        try {
          const parsed = JSON.parse(amenitiesJson);
          amenities = Array.isArray(parsed) ? parsed.map(a => stripHtml(String(a))).filter(Boolean) : [];
        } catch {
          // Invalid JSON, ignore
        }
      }
    }

    // Validate phone format if provided
    if (phone && !validatePhoneFormat(phone)) {
      return { error: "Invalid phone number format. Use formats like (555) 123-4567 or 555-123-4567" };
    }

    // Validate URL format if provided
    if (website && !validateUrlFormat(website)) {
      return { error: "Invalid website URL. Must start with http:// or https://" };
    }

    // Validate number of rinks
    const rinks = parseInt(numberOfRinks, 10);
    if (isNaN(rinks) || rinks < 1 || rinks > 10) {
      return { error: "Number of rinks must be between 1 and 10" };
    }

    // Sanitize all text inputs to prevent XSS
    const sanitizedName = stripHtml(name.trim());
    const sanitizedAddress = address ? stripHtml(address.trim()) : null;
    const sanitizedCity = city ? stripHtml(city.trim()) : null;
    const sanitizedStateProvince = stateProvince ? stripHtml(stateProvince.trim()) : null;
    const sanitizedPostalCode = postalCode ? stripHtml(postalCode.trim()) : null;
    const sanitizedCountry = stripHtml(country.trim());
    const sanitizedPhone = phone ? sanitizePhone(phone) : null;
    const sanitizedWebsite = website ? sanitizeUrl(website) : null;
    const sanitizedParkingInfo = parkingInfo ? sanitizeText(parkingInfo, 500) : null;

    // Check for duplicate venue name within the league
    // Note: UNIQUE constraint will also catch this, but checking first provides better UX
    const { data: existing } = await supabase
      .from("venues")
      .select("id")
      .eq('league_id', leagueId)
      .ilike("name", sanitizedName)
      .maybeSingle();

    if (existing) {
      return { error: "A venue with this name already exists in your league" };
    }

    // Create the venue
    const { data: venue, error } = await supabase
      .from("venues")
      .insert({
        league_id: leagueId, // CRITICAL: Associate venue with league
        name: sanitizedName,
        address: sanitizedAddress,
        city: sanitizedCity,
        state_province: sanitizedStateProvince,
        postal_code: sanitizedPostalCode,
        country: sanitizedCountry,
        phone: sanitizedPhone,
        website: sanitizedWebsite,
        number_of_rinks: rinks,
        parking_info: sanitizedParkingInfo,
        amenities: amenities.length > 0 ? amenities : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating venue:", error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return { error: "A venue with this name already exists in your league" };
      }

      return { error: error.message };
    }

    // Invalidate cache for routes that display venues
    revalidatePath("/admin/venues");
    revalidatePath("/venues");
    revalidatePath("/games");

    return { success: true, venue };
  } catch (error: any) {
    console.error("Error in createVenue:", error);
    return { error: error.message || 'Unauthorized or failed to create venue' };
  }
}

/**
 * Update an existing venue
 *
 * Authorization: League owner or admin only
 * Security:
 * - Verifies venue belongs to user's league before update
 * - All text inputs are HTML-sanitized
 * - Phone/URL formats validated
 *
 * @param venueId - UUID of the venue to update
 * @param formData - Form data containing updated venue information
 * @returns Promise with updated venue or error
 */
export async function updateVenue(venueId: string, formData: FormData): Promise<VenueActionResult> {
  try {
    // Require owner or admin role to update venues
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Verify venue exists and belongs to this league
    const { data: existingVenue } = await supabase
      .from("venues")
      .select("id")
      .eq("id", venueId)
      .eq('league_id', leagueId) // CRITICAL: Verify venue belongs to league
      .single();

    if (!existingVenue) {
      return { error: "Venue not found or does not belong to your league" };
    }

    // Extract and validate fields (same as create)
    const name = formData.get("name") as string;

    if (!name) {
      return { error: "Venue name is required" };
    }

    const nameValidation = validateVenueName(name);
    if (!nameValidation.valid) {
      return { error: nameValidation.error };
    }

    // Extract optional fields
    const address = formData.get("address") as string || null;
    const city = formData.get("city") as string || null;
    const stateProvince = formData.get("stateProvince") as string || null;
    const postalCode = formData.get("postalCode") as string || null;
    const country = formData.get("country") as string || "USA";
    const phone = formData.get("phone") as string || null;
    const website = formData.get("website") as string || null;
    const numberOfRinks = formData.get("numberOfRinks") as string || "1";
    const parkingInfo = formData.get("parkingInfo") as string || null;

    // Amenities handling
    const amenitiesRaw = formData.getAll("amenities");
    let amenities: string[] = [];

    if (amenitiesRaw.length > 0) {
      amenities = amenitiesRaw.map(a => stripHtml(String(a))).filter(Boolean);
    } else {
      const amenitiesJson = formData.get("amenitiesJson") as string;
      if (amenitiesJson) {
        try {
          const parsed = JSON.parse(amenitiesJson);
          amenities = Array.isArray(parsed) ? parsed.map(a => stripHtml(String(a))).filter(Boolean) : [];
        } catch {
          // Invalid JSON, ignore
        }
      }
    }

    // Validate phone format if provided
    if (phone && !validatePhoneFormat(phone)) {
      return { error: "Invalid phone number format. Use formats like (555) 123-4567 or 555-123-4567" };
    }

    // Validate URL format if provided
    if (website && !validateUrlFormat(website)) {
      return { error: "Invalid website URL. Must start with http:// or https://" };
    }

    // Validate number of rinks
    const rinks = parseInt(numberOfRinks, 10);
    if (isNaN(rinks) || rinks < 1 || rinks > 10) {
      return { error: "Number of rinks must be between 1 and 10" };
    }

    // Sanitize all text inputs
    const sanitizedName = stripHtml(name.trim());
    const sanitizedAddress = address ? stripHtml(address.trim()) : null;
    const sanitizedCity = city ? stripHtml(city.trim()) : null;
    const sanitizedStateProvince = stateProvince ? stripHtml(stateProvince.trim()) : null;
    const sanitizedPostalCode = postalCode ? stripHtml(postalCode.trim()) : null;
    const sanitizedCountry = stripHtml(country.trim());
    const sanitizedPhone = phone ? sanitizePhone(phone) : null;
    const sanitizedWebsite = website ? sanitizeUrl(website) : null;
    const sanitizedParkingInfo = parkingInfo ? sanitizeText(parkingInfo, 500) : null;

    // Check for duplicate name (excluding current venue)
    const { data: duplicateName } = await supabase
      .from("venues")
      .select("id")
      .eq('league_id', leagueId)
      .ilike("name", sanitizedName)
      .neq("id", venueId)
      .maybeSingle();

    if (duplicateName) {
      return { error: "Another venue with this name already exists in your league" };
    }

    // Update the venue
    const { data: venue, error } = await supabase
      .from("venues")
      .update({
        name: sanitizedName,
        address: sanitizedAddress,
        city: sanitizedCity,
        state_province: sanitizedStateProvince,
        postal_code: sanitizedPostalCode,
        country: sanitizedCountry,
        phone: sanitizedPhone,
        website: sanitizedWebsite,
        number_of_rinks: rinks,
        parking_info: sanitizedParkingInfo,
        amenities: amenities.length > 0 ? amenities : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", venueId)
      .eq('league_id', leagueId) // CRITICAL: Only update venues in this league
      .select()
      .single();

    if (error) {
      console.error("Error updating venue:", error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return { error: "A venue with this name already exists in your league" };
      }

      return { error: error.message };
    }

    // Invalidate cache
    revalidatePath("/admin/venues");
    revalidatePath("/venues");
    revalidatePath(`/venues/${venueId}`);
    revalidatePath("/games");

    return { success: true, venue };
  } catch (error: any) {
    console.error("Error in updateVenue:", error);
    return { error: error.message || 'Unauthorized or failed to update venue' };
  }
}

/**
 * Delete a venue
 *
 * Authorization: League owner or admin only
 * Security:
 * - Verifies venue belongs to user's league before deletion
 * - Checks for references in games table to prevent orphaned data
 *
 * Note: If venue is referenced by games, consider:
 * - Option A: Prevent deletion (current implementation)
 * - Option B: Set games.venue_id to NULL on deletion
 * - Option C: Cascade delete (destructive, not recommended)
 *
 * @param venueId - UUID of the venue to delete
 * @returns Promise with success status or error
 */
export async function deleteVenue(venueId: string): Promise<VenueActionResult> {
  try {
    // Require owner or admin role to delete venues
    const { leagueId, userId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Verify venue exists and belongs to this league
    const { data: venue } = await supabase
      .from("venues")
      .select("id, name")
      .eq("id", venueId)
      .eq('league_id', leagueId) // CRITICAL: Verify venue belongs to league
      .single();

    if (!venue) {
      return { error: "Venue not found or does not belong to your league" };
    }

    // Check if venue is referenced by any games
    // Note: We rely on the database foreign key constraint to prevent deletion
    // if games reference this venue (FK constraint will return an error)

    // Delete the venue
    const { error } = await supabase
      .from("venues")
      .delete()
      .eq("id", venueId)
      .eq('league_id', leagueId); // CRITICAL: Only delete venues in this league

    if (error) {
      console.error("Error deleting venue:", error);

      // Handle foreign key violation (games reference)
      if (error.code === '23503') {
        return { error: "Cannot delete venue because it is referenced by games" };
      }

      return { error: error.message };
    }

    // Invalidate cache
    revalidatePath("/admin/venues");
    revalidatePath("/venues");
    revalidatePath("/games");

    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteVenue:", error);
    return { error: error.message || 'Unauthorized or failed to delete venue' };
  }
}

/**
 * Get venues with game count statistics
 *
 * Useful for admin dashboard to show which venues are most used
 *
 * Authorization: League owner or admin
 *
 * @returns Promise with venues including game counts
 */
export async function getVenuesWithStats(): Promise<{
  error?: string;
  venues: Array<Venue & { game_count?: number }>;
}> {
  try {
    // Require owner or admin role
    const { leagueId } = await requireLeagueRole(['owner', 'admin']);

    const supabase = await createClient();

    // Fetch venues with game count
    // Note: This requires a LEFT JOIN aggregation
    const { data: venues, error } = await supabase
      .from("venues")
      .select(`
        *,
        games:games(count)
      `)
      .eq('league_id', leagueId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching venues with stats:", error);
      return { error: error.message, venues: [] };
    }

    // Transform the response to include game_count
    const venuesWithStats = (venues || []).map((v: any) => ({
      ...v,
      game_count: v.games?.[0]?.count || 0,
      games: undefined, // Remove the nested games object
    }));

    return { venues: venuesWithStats };
  } catch (error: any) {
    console.error("Error in getVenuesWithStats:", error);
    return { error: error.message || 'Unauthorized', venues: [] };
  }
}
