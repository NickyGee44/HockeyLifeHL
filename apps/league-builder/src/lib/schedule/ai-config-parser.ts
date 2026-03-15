/**
 * AI Config Parser
 *
 * Parses AI chat responses (from the schedule-chat API route) and extracts
 * structured config patches. The AI returns natural language text with an
 * optional JSON block in markdown fences.
 */

import type {
  ScheduleConfig,
  ScheduleConstraint,
  ScheduleConstraintConfig,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface ConfigPatch {
  configUpdates: Partial<ScheduleConfig>;
  newConstraints: Partial<ScheduleConstraint>[];
  constraintConfig: Partial<ScheduleConstraintConfig>;
  summary: string;
}

// ============================================================================
// EXTRACT CONFIG PATCH
// ============================================================================

/**
 * Extract a JSON config patch from an AI response string.
 * Looks for ```json ... ``` blocks and parses the JSON.
 * Returns null if no valid JSON block found.
 */
export function extractConfigPatch(aiResponse: string): ConfigPatch | null {
  try {
    const jsonString = extractJsonBlock(aiResponse);
    if (!jsonString) return null;

    const parsed: unknown = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') return null;

    const obj = parsed as Record<string, unknown>;

    // Build the patch with defaults for missing fields
    const patch: ConfigPatch = {
      configUpdates: isPlainObject(obj.configUpdates)
        ? (obj.configUpdates as Partial<ScheduleConfig>)
        : {},
      newConstraints: Array.isArray(obj.newConstraints)
        ? (obj.newConstraints as Partial<ScheduleConstraint>[])
        : [],
      constraintConfig: isPlainObject(obj.constraintConfig)
        ? (obj.constraintConfig as Partial<ScheduleConstraintConfig>)
        : {},
      summary: typeof obj.summary === 'string' ? obj.summary : '',
    };

    // Return null if the patch is completely empty (no meaningful data)
    const hasConfigUpdates = Object.keys(patch.configUpdates).length > 0;
    const hasConstraints = patch.newConstraints.length > 0;
    const hasConstraintConfig = Object.keys(patch.constraintConfig).length > 0;
    const hasSummary = patch.summary.length > 0;

    if (!hasConfigUpdates && !hasConstraints && !hasConstraintConfig && !hasSummary) {
      return null;
    }

    return patch;
  } catch {
    return null;
  }
}

// ============================================================================
// APPLY CONFIG PATCH
// ============================================================================

/**
 * Apply a config patch to an existing ScheduleConfig.
 * Deep-merges configUpdates, handling date string to Date conversions.
 */
export function applyConfigPatch(
  currentConfig: ScheduleConfig,
  patch: ConfigPatch
): ScheduleConfig {
  const updates = { ...patch.configUpdates };

  // Convert date strings to Date objects
  if (updates.startDate !== undefined) {
    updates.startDate = toDate(updates.startDate);
  }
  if (updates.endDate !== undefined) {
    updates.endDate = toDate(updates.endDate);
  }

  // Spread currentConfig, then overlay updates.
  // Array fields (gameDays, gameTimes, holidayDates) from the patch replace
  // entirely rather than merging, which is the default spread behavior.
  return {
    ...currentConfig,
    ...updates,
  };
}

// ============================================================================
// NORMALIZE CONSTRAINTS
// ============================================================================

/**
 * Validate and normalize constraints from AI.
 * Generates UUIDs for IDs, ensures required fields exist.
 */
export function normalizeConstraints(
  constraints: Partial<ScheduleConstraint>[]
): ScheduleConstraint[] {
  return constraints
    .filter((c) => {
      // Must have a constraintType (also accept snake_case variant from AI)
      return (
        c.constraintType !== undefined ||
        (c as Record<string, unknown>).constraint_type !== undefined
      );
    })
    .map((c) => {
      const raw = c as Record<string, unknown>;

      // Accept either camelCase or snake_case for constraintType
      const constraintType =
        c.constraintType ?? (raw.constraint_type as ScheduleConstraint['constraintType']);

      return {
        id: c.id || crypto.randomUUID(),
        seasonId: c.seasonId ?? '',
        leagueId: c.leagueId ?? '',
        constraintType,
        teamId: c.teamId ?? null,
        venueId: c.venueId ?? null,
        opponentTeamId: c.opponentTeamId ?? null,
        startDate: c.startDate ? toDate(c.startDate) : null,
        endDate: c.endDate ? toDate(c.endDate) : null,
        dayOfWeek: c.dayOfWeek ?? null,
        startTime: c.startTime ?? null,
        endTime: c.endTime ?? null,
        priority: c.priority ?? 5,
        isHardConstraint: c.isHardConstraint ?? (raw.is_hard_constraint as boolean) ?? false,
        notes: c.notes ?? null,
        maxOccurrences: c.maxOccurrences ?? null,
        timeSlotCategory: c.timeSlotCategory ?? null,
        appliesToWeekends: c.appliesToWeekends ?? null,
        appliesToWeekdays: c.appliesToWeekdays ?? null,
      } satisfies ScheduleConstraint;
    });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract the first JSON block from a markdown-formatted string.
 * Tries ```json first, then bare ``` blocks.
 */
function extractJsonBlock(text: string): string | null {
  // Try ```json ... ``` first
  const jsonFenced = /```json\s*\n?([\s\S]*?)```/i.exec(text);
  if (jsonFenced?.[1]) {
    return jsonFenced[1].trim();
  }

  // Fall back to bare ``` ... ```
  const bareFenced = /```\s*\n?([\s\S]*?)```/.exec(text);
  if (bareFenced?.[1]) {
    const content = bareFenced[1].trim();
    // Only use if it looks like JSON (starts with { or [)
    if (content.startsWith('{') || content.startsWith('[')) {
      return content;
    }
  }

  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Convert a value to a Date. Handles Date objects, ISO strings, and numeric timestamps.
 */
function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (typeof value === 'number') return new Date(value);
  return new Date();
}
