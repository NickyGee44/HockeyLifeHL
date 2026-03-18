export type ArticleMentionKind = 'player' | 'team' | 'game';

export interface ArticleLinkablePlayer {
  id: string;
  fullName: string;
}

export interface ArticleLinkableTeam {
  id: string;
  name: string;
  slug: string;
}

export interface ArticleLinkableGame {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
}

export interface ArticleMention {
  text: string;
  href: string;
  kind: ArticleMentionKind;
  priority: number;
}

export interface ArticleParagraphSegment {
  text: string;
  href: string | null;
  kind: ArticleMentionKind | null;
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isWordCharacter(char: string | undefined) {
  return Boolean(char && /[\p{L}\p{N}]/u.test(char));
}

function addMention(
  mentions: Map<string, ArticleMention>,
  mention: ArticleMention,
) {
  const normalizedText = normalizeWhitespace(mention.text);
  if (!normalizedText) return;

  const key = normalizedText.toLowerCase();
  const existing = mentions.get(key);

  if (
    !existing ||
    mention.priority < existing.priority ||
    (mention.priority === existing.priority && normalizedText.length > existing.text.length)
  ) {
    mentions.set(key, {
      ...mention,
      text: normalizedText,
    });
  }
}

function getUniqueTaggedLastNames(players: ArticleLinkablePlayer[]) {
  const counts = new Map<string, number>();

  for (const player of players) {
    const parts = normalizeWhitespace(player.fullName).split(' ').filter(Boolean);
    const lastName = parts[parts.length - 1];
    if (!lastName || lastName.length < 4) continue;
    const key = lastName.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}

export function buildArticleMentions(args: {
  leagueSlug: string;
  players: ArticleLinkablePlayer[];
  teams: ArticleLinkableTeam[];
  relatedGame: ArticleLinkableGame | null;
}): ArticleMention[] {
  const mentions = new Map<string, ArticleMention>();
  const uniqueLastNames = getUniqueTaggedLastNames(args.players);

  for (const player of args.players) {
    const fullName = normalizeWhitespace(player.fullName);
    if (!fullName) continue;

    addMention(mentions, {
      text: fullName,
      href: `/${args.leagueSlug}/players/${player.id}`,
      kind: 'player',
      priority: 0,
    });

    const nameParts = fullName.split(' ').filter(Boolean);
    const lastName = nameParts[nameParts.length - 1];
    if (!lastName || uniqueLastNames.get(lastName.toLowerCase()) !== 1) continue;

    addMention(mentions, {
      text: lastName,
      href: `/${args.leagueSlug}/players/${player.id}`,
      kind: 'player',
      priority: 1,
    });
  }

  for (const team of args.teams) {
    addMention(mentions, {
      text: team.name,
      href: `/${args.leagueSlug}/teams/${team.slug}`,
      kind: 'team',
      priority: 3,
    });
  }

  if (args.relatedGame) {
    const gameHref = `/${args.leagueSlug}/games/${args.relatedGame.id}`;
    const home = normalizeWhitespace(args.relatedGame.homeTeamName);
    const away = normalizeWhitespace(args.relatedGame.awayTeamName);

    for (const phrase of [
      `${away} @ ${home}`,
      `${away} at ${home}`,
      `${home} vs ${away}`,
      `${home} vs. ${away}`,
      `${home} v ${away}`,
      `${home} v. ${away}`,
      `${home} versus ${away}`,
      `${home} against ${away}`,
      `${away} against ${home}`,
    ]) {
      addMention(mentions, {
        text: phrase,
        href: gameHref,
        kind: 'game',
        priority: 2,
      });
    }
  }

  return [...mentions.values()].sort((left, right) => {
    if (right.text.length !== left.text.length) {
      return right.text.length - left.text.length;
    }

    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    return left.text.localeCompare(right.text);
  });
}

export function splitArticleParagraphIntoSegments(
  paragraph: string,
  mentions: ArticleMention[],
): ArticleParagraphSegment[] {
  if (!paragraph) {
    return [{text: '', href: null, kind: null}];
  }

  if (mentions.length === 0) {
    return [{text: paragraph, href: null, kind: null}];
  }

  const matches: Array<{
    start: number;
    end: number;
    text: string;
    mention: ArticleMention;
  }> = [];

  for (const mention of mentions) {
    const regex = new RegExp(escapeRegExp(mention.text), 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(paragraph)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const before = paragraph[start - 1];
      const after = paragraph[end];

      if (isWordCharacter(before) || isWordCharacter(after)) {
        continue;
      }

      matches.push({
        start,
        end,
        text: paragraph.slice(start, end),
        mention,
      });
    }
  }

  if (matches.length === 0) {
    return [{text: paragraph, href: null, kind: null}];
  }

  matches.sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }

    const leftLength = left.end - left.start;
    const rightLength = right.end - right.start;
    if (rightLength !== leftLength) {
      return rightLength - leftLength;
    }

    return left.mention.priority - right.mention.priority;
  });

  const accepted: typeof matches = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start < cursor) {
      continue;
    }

    accepted.push(match);
    cursor = match.end;
  }

  const segments: ArticleParagraphSegment[] = [];
  let currentIndex = 0;

  for (const match of accepted) {
    if (match.start > currentIndex) {
      segments.push({
        text: paragraph.slice(currentIndex, match.start),
        href: null,
        kind: null,
      });
    }

    segments.push({
      text: match.text,
      href: match.mention.href,
      kind: match.mention.kind,
    });

    currentIndex = match.end;
  }

  if (currentIndex < paragraph.length) {
    segments.push({
      text: paragraph.slice(currentIndex),
      href: null,
      kind: null,
    });
  }

  return segments;
}
