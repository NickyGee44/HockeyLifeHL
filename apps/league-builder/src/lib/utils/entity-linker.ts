/**
 * Smart Entity Linking
 *
 * Scans article text for team and player names, converts them to markdown links.
 * Used after AI article generation to make content interactive on league-sites.
 */

interface TeamEntity {
  id: string;
  name: string;
  shortName?: string;
}

interface PlayerEntity {
  id: string;
  fullName: string;
}

/**
 * Link team and player names in article text to their respective pages.
 * Uses longest-match-first to avoid partial replacements.
 */
export function linkEntitiesInText(
  text: string,
  leagueSlug: string,
  teams: TeamEntity[],
  players: PlayerEntity[]
): string {
  if (!text || (teams.length === 0 && players.length === 0)) return text;

  // Build a list of all replacements, sorted by length (longest first)
  const replacements: Array<{
    search: string;
    link: string;
    regex: RegExp;
  }> = [];

  for (const team of teams) {
    // Full team name
    replacements.push({
      search: team.name,
      link: `[${team.name}](/${leagueSlug}/teams/${team.id})`,
      regex: new RegExp(`\\b${escapeRegex(team.name)}\\b`, 'gi'),
    });
    // Short name (if different and at least 3 chars to avoid false positives)
    if (team.shortName && team.shortName !== team.name && team.shortName.length >= 3) {
      replacements.push({
        search: team.shortName,
        link: `[${team.shortName}](/${leagueSlug}/teams/${team.id})`,
        regex: new RegExp(`\\b${escapeRegex(team.shortName)}\\b`, 'gi'),
      });
    }
  }

  for (const player of players) {
    replacements.push({
      search: player.fullName,
      link: `[${player.fullName}](/${leagueSlug}/players/${player.id})`,
      regex: new RegExp(`\\b${escapeRegex(player.fullName)}\\b`, 'gi'),
    });
  }

  // Sort by length descending to replace longer names first
  replacements.sort((a, b) => b.search.length - a.search.length);

  // Track positions that have already been linked to avoid double-linking
  let result = text;
  const linkedRanges: Array<[number, number]> = [];

  for (const replacement of replacements) {
    const matches = [...result.matchAll(replacement.regex)];
    // Process matches in reverse order to preserve indices
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      if (match.index === undefined) continue;

      const start = match.index;
      const end = start + match[0].length;

      // Skip if this range overlaps with an already-linked range
      const overlaps = linkedRanges.some(
        ([ls, le]) => start < le && end > ls
      );
      if (overlaps) continue;

      // Skip if already inside a markdown link [...](...)
      const before = result.substring(Math.max(0, start - 1), start);
      const after = result.substring(end, Math.min(result.length, end + 2));
      if (before === '[' || after.startsWith('](')) continue;

      // Replace this occurrence (only first occurrence per entity)
      const linked = replacement.link.replace(
        replacement.link.split('](')[0].slice(1),
        match[0]
      );
      result = result.substring(0, start) + linked + result.substring(end);

      // Track this range (adjusted for the new link length)
      linkedRanges.push([start, start + linked.length]);

      // Only link each entity once
      break;
    }
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
