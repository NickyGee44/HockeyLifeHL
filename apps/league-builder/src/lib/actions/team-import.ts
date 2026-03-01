'use server';

import { createClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { revalidatePath } from 'next/cache';

export interface TeamImportRow {
  teamName: string;
  division: string;
  color: string;       // hex color like #1a56db (optional)
  captainEmail: string;
}

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

function makeShortName(name: string): string {
  // Take first letters of each word, max 4 chars, uppercase
  const initials = name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 4);
  return initials || name.slice(0, 4).toUpperCase();
}

function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export async function importTeamsFromCSV(
  leagueId: string,
  rows: TeamImportRow[]
): Promise<ActionResult<{ imported: number; skipped: number; errors: string[] }>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: 'Not authorized' };
  }

  if (!rows.length) {
    return { success: false, error: 'No rows to import' };
  }

  if (rows.length > 100) {
    return { success: false, error: 'Maximum 100 teams per import' };
  }

  const supabase = await createClient();

  // Fetch existing team names to detect duplicates
  const { data: existingTeams } = await supabase
    .from('teams')
    .select('name')
    .eq('league_id', leagueId);

  const existingNames = new Set<string>(
    (existingTeams || []).map((t) => t.name.toLowerCase().trim())
  );

  // Fetch divisions for name resolution
  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('league_id', leagueId);

  const divisionsByName = new Map<string, string>();
  for (const div of divisions || []) {
    divisionsByName.set(div.name.toLowerCase().trim(), div.id);
  }

  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const teamName = row.teamName?.trim();
    if (!teamName) {
      errors.push(`Row ${rowNum}: Missing team name`);
      continue;
    }

    // Skip duplicates
    if (existingNames.has(teamName.toLowerCase())) {
      skipped++;
      continue;
    }

    // Resolve division (optional)
    const divisionId = row.division
      ? divisionsByName.get(row.division.toLowerCase().trim()) ?? null
      : null;

    // Validate color if provided
    const color = row.color?.trim() || null;
    const primaryColor = color && HEX_COLOR_REGEX.test(color) ? color : null;

    // Resolve captain (optional)
    let captainId: string | null = null;
    if (row.captainEmail?.trim()) {
      const { data: captain } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', row.captainEmail.trim().toLowerCase())
        .maybeSingle();
      captainId = captain?.id ?? null;
    }

    const { error: insertError } = await supabase
      .from('teams')
      .insert({
        league_id: leagueId,
        name: teamName,
        short_name: makeShortName(teamName),
        slug: makeSlug(teamName),
        primary_color: primaryColor,
        division_id: divisionId,
        captain_id: captainId,
        status: 'active',
      });

    if (insertError) {
      if (insertError.message.includes('duplicate')) {
        skipped++;
        continue;
      }
      errors.push(`Row ${rowNum}: Failed to create "${teamName}" — ${insertError.message}`);
      continue;
    }

    existingNames.add(teamName.toLowerCase());
    imported++;
  }

  if (imported > 0) {
    revalidatePath(`/dashboard/leagues/${leagueId}/teams`);
  }

  return {
    success: true,
    data: { imported, skipped, errors },
  };
}
