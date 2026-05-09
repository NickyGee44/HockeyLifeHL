export type ReminderCheckinStatus = 'confirmed' | 'tentative' | 'out' | 'no_response';

export interface ReminderRosterPlayer {
  fullName: string;
  position: string | null;
  status: ReminderCheckinStatus;
}

interface ReminderTeamIdentity {
  name: string;
  logoDataUrl: string | null;
  primaryColor: string;
}

const CHECKIN_CARD_BACKGROUND_URL = '/checkin-card-backgrounds/arena-light-streaks.png';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function statusColor(status: ReminderCheckinStatus) {
  if (status === 'confirmed') return '#34d399';
  if (status === 'out') return '#f87171';
  if (status === 'tentative') return '#fbbf24';
  return '#94a3b8';
}

function statusLabel(status: ReminderCheckinStatus) {
  if (status === 'confirmed') return 'IN';
  if (status === 'out') return 'OUT';
  if (status === 'tentative') return 'UNSURE';
  return 'WAITING';
}

function buildGroups(players: ReminderRosterPlayer[]) {
  const groups = new Map<string, ReminderRosterPlayer[]>();

  const getGroup = (position: string | null) => {
    const normalized = (position || '').toLowerCase();
    if (normalized.startsWith('g')) return 'GOALIES';
    if (normalized.startsWith('d')) return 'DEFENCE';
    return 'FORWARDS';
  };

  for (const player of players) {
    const group = getGroup(player.position);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)?.push(player);
  }

  return ['FORWARDS', 'DEFENCE', 'GOALIES']
    .map((label) => ({
      label,
      players: groups.get(label) ?? [],
    }))
    .filter((group) => group.players.length > 0);
}

function normalizeHexColor(value: string | null | undefined, fallback: string) {
  const color = (value || '').trim();
  if (/^#[0-9a-f]{3}$/i.test(color) || /^#[0-9a-f]{6}$/i.test(color) || /^#[0-9a-f]{8}$/i.test(color)) {
    return color;
  }
  return fallback;
}

async function imageUrlToDataUrl(url: string | null | undefined) {
  if (!url) return null;

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;

    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to load team logo.'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function buildTeamLogoMarkup(team: ReminderTeamIdentity, x: number, y: number) {
  const logoSize = 276;
  const centerX = x + logoSize / 2;
  const centerY = y + logoSize / 2;

  if (team.logoDataUrl) {
    return `
      <circle cx="${centerX}" cy="${centerY}" r="116" fill="#050816" fill-opacity="0.6" stroke="rgba(255,255,255,0.7)" stroke-width="4" />
      <image href="${escapeXml(team.logoDataUrl)}" x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet" />
    `;
  }

  const initial = escapeXml(team.name.trim().charAt(0).toUpperCase() || 'T');
  return `
    <circle cx="${centerX}" cy="${centerY}" r="116" fill="#050816" fill-opacity="0.7" stroke="rgba(255,255,255,0.7)" stroke-width="4" />
    <text x="${centerX}" y="${centerY + 32}" text-anchor="middle" font-family="Arial, sans-serif" font-size="108" font-weight="900" fill="#f8fafc">${initial}</text>
  `;
}

export function buildReminderSvg({
  teamName,
  opponentName,
  teamLogoDataUrl,
  opponentLogoDataUrl,
  backgroundImageDataUrl,
  teamPrimaryColor,
  opponentPrimaryColor,
  seasonRecord,
  opponentRecord,
  puckDropLabel,
  venue,
  roster,
}: {
  teamName: string;
  opponentName: string;
  teamLogoDataUrl: string | null;
  opponentLogoDataUrl: string | null;
  backgroundImageDataUrl: string | null;
  teamPrimaryColor: string;
  opponentPrimaryColor: string;
  seasonRecord: string;
  opponentRecord: string;
  puckDropLabel: string;
  venue: string | null;
  roster: ReminderRosterPlayer[];
}) {
  const groups = buildGroups(roster);
  let currentY = 112;

  const rosterMarkup = groups
    .map((group) => {
      const headerY = currentY;
      currentY += 26;

      const rows = group.players
        .map((player) => {
          const y = currentY;
          currentY += 28;
          return `
            <text x="40" y="${y}" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="#f8fafc">${escapeXml(player.fullName)}</text>
            <circle cx="296" cy="${y - 6}" r="6" fill="${statusColor(player.status)}" />
            <text x="314" y="${y}" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#cbd5e1" letter-spacing="1.8">${statusLabel(player.status)}</text>
          `;
        })
        .join('');

      currentY += 12;

      return `
        <text x="40" y="${headerY}" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#64748b" letter-spacing="3">${group.label}</text>
        ${rows}
      `;
    })
    .join('');

  const attendanceCount = roster.filter((player) => player.status === 'confirmed').length;
  const totalPlayers = roster.length;
  const team = {
    name: teamName,
    logoDataUrl: teamLogoDataUrl,
    primaryColor: normalizeHexColor(teamPrimaryColor, '#8b5cf6'),
  };
  const opponent = {
    name: opponentName,
    logoDataUrl: opponentLogoDataUrl,
    primaryColor: normalizeHexColor(opponentPrimaryColor, '#ef4444'),
  };

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" fill="none">
      <defs>
        <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.45" />
          <stop offset="50%" stop-color="#1e293b" stop-opacity="0.2" />
          <stop offset="100%" stop-color="#65a30d" stop-opacity="0.35" />
        </linearGradient>
        <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0b1120" />
          <stop offset="100%" stop-color="#090d18" />
        </linearGradient>
        <radialGradient id="heroGlowLeft" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(760 250) rotate(33) scale(340 240)">
          <stop stop-color="${team.primaryColor}" stop-opacity="0.95"/>
          <stop offset="1" stop-color="${team.primaryColor}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="heroGlowRight" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1240 250) rotate(145) scale(340 240)">
          <stop stop-color="${opponent.primaryColor}" stop-opacity="0.85"/>
          <stop offset="1" stop-color="${opponent.primaryColor}" stop-opacity="0"/>
        </radialGradient>
        <clipPath id="heroClip">
          <rect x="500" y="82" width="1018" height="422" rx="24" />
        </clipPath>
      </defs>

      <rect width="1600" height="900" rx="34" fill="#050816" />
      <rect x="22" y="22" width="1556" height="856" rx="30" fill="url(#frame)" opacity="0.7" />
      <rect x="36" y="36" width="1528" height="828" rx="26" fill="url(#panel)" stroke="rgba(255,255,255,0.06)" />

      <rect x="58" y="58" width="390" height="784" rx="24" fill="#080d19" stroke="rgba(255,255,255,0.08)" />
      <text x="40" y="0" />
      <text x="78" y="90" font-family="Arial, sans-serif" font-size="15" font-weight="800" fill="#e2e8f0" letter-spacing="4">ATTENDANCE</text>
      <text x="394" y="90" text-anchor="end" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#64748b" letter-spacing="2">${attendanceCount}/${totalPlayers} PLAYERS</text>
      ${rosterMarkup}

      <rect x="476" y="58" width="1066" height="470" rx="28" fill="#0a0f1d" stroke="rgba(255,255,255,0.06)" />
      <rect x="500" y="82" width="1018" height="422" rx="24" fill="#020617" />
      ${backgroundImageDataUrl ? `
        <image href="${escapeXml(backgroundImageDataUrl)}" x="500" y="82" width="1018" height="422" preserveAspectRatio="xMidYMid slice" clip-path="url(#heroClip)" opacity="0.86" />
        <rect x="500" y="82" width="1018" height="422" rx="24" fill="#020617" opacity="0.22" />
      ` : ''}
      <rect x="500" y="82" width="1018" height="422" rx="24" fill="url(#heroGlowLeft)" />
      <rect x="500" y="82" width="1018" height="422" rx="24" fill="url(#heroGlowRight)" />
      <text x="1009" y="190" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="900" fill="#fbbf24" letter-spacing="2">NEXT CHECK-IN</text>

      ${buildTeamLogoMarkup(team, 582, 148)}
      ${buildTeamLogoMarkup(opponent, 1158, 148)}

      <text x="1008" y="258" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#f8fafc">${escapeXml(teamName)}</text>
      <text x="1008" y="308" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="900" fill="#f8fafc">VS</text>
      <text x="1008" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#e2e8f0">${escapeXml(opponentName)}</text>

      <rect x="476" y="556" width="340" height="126" rx="24" fill="#080d19" stroke="rgba(255,255,255,0.06)" />
      <text x="504" y="594" font-family="Arial, sans-serif" font-size="15" font-weight="800" fill="#94a3b8" letter-spacing="3">SEASON RECORD</text>
      <text x="504" y="652" font-family="Arial, sans-serif" font-size="58" font-weight="900" fill="#fbbf24">${escapeXml(seasonRecord)}</text>

      <rect x="842" y="556" width="340" height="126" rx="24" fill="#080d19" stroke="rgba(255,255,255,0.06)" />
      <text x="870" y="594" font-family="Arial, sans-serif" font-size="15" font-weight="800" fill="#94a3b8" letter-spacing="3">VS ${escapeXml(opponentName.toUpperCase())}</text>
      <text x="870" y="652" font-family="Arial, sans-serif" font-size="58" font-weight="900" fill="#f8fafc">${escapeXml(opponentRecord)}</text>

      <rect x="1208" y="556" width="334" height="126" rx="24" fill="#080d19" stroke="rgba(255,255,255,0.06)" />
      <text x="1236" y="594" font-family="Arial, sans-serif" font-size="15" font-weight="800" fill="#94a3b8" letter-spacing="3">PUCK DROP</text>
      <text x="1375" y="652" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#f8fafc">${escapeXml(puckDropLabel)}</text>

      <rect x="476" y="710" width="1066" height="96" rx="22" fill="#080d19" stroke="rgba(255,255,255,0.06)" />
      <text x="504" y="766" font-family="Arial, sans-serif" font-size="15" font-weight="800" fill="#94a3b8" letter-spacing="3">CHECK IN NOW</text>
      <text x="820" y="766" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#f8fafc">${escapeXml(puckDropLabel)}</text>
      <text x="1498" y="766" text-anchor="end" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#94a3b8">${escapeXml(venue || 'Venue TBD')}</text>
    </svg>
  `;
}

async function svgToPngFile(svgMarkup: string, fileName: string) {
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error('Failed to load reminder image.'));
      nextImage.src = svgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 900;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas not supported');
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('Failed to create PNG.'));
      }, 'image/png');
    });

    return new File([blob], fileName, { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

async function downloadFile(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = file.name;
    anchor.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function shareCheckinReminder(options: {
  teamName: string;
  opponentName: string;
  teamLogoUrl?: string | null;
  opponentLogoUrl?: string | null;
  teamPrimaryColor?: string | null;
  opponentPrimaryColor?: string | null;
  seasonRecord: string;
  opponentRecord: string;
  puckDropLabel: string;
  venue: string | null;
  roster: ReminderRosterPlayer[];
  fileName: string;
  shareTitle: string;
  shareText: string;
  shareUrl: string;
}) {
  const [teamLogoDataUrl, opponentLogoDataUrl, backgroundImageDataUrl] = await Promise.all([
    imageUrlToDataUrl(options.teamLogoUrl),
    imageUrlToDataUrl(options.opponentLogoUrl),
    imageUrlToDataUrl(CHECKIN_CARD_BACKGROUND_URL),
  ]);

  const file = await svgToPngFile(
    buildReminderSvg({
      ...options,
      teamLogoDataUrl,
      opponentLogoDataUrl,
      backgroundImageDataUrl,
      teamPrimaryColor: normalizeHexColor(options.teamPrimaryColor, '#8b5cf6'),
      opponentPrimaryColor: normalizeHexColor(options.opponentPrimaryColor, '#ef4444'),
    }),
    options.fileName,
  );

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: options.shareTitle,
      text: options.shareText,
      url: options.shareUrl,
      files: [file],
    });
    return 'shared';
  }

  if (navigator.share) {
    await navigator.share({
      title: options.shareTitle,
      text: options.shareText,
      url: options.shareUrl,
    });
    return 'shared-text';
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(`${options.shareText}\n${options.shareUrl}`);
  }

  await downloadFile(file);
  return 'downloaded';
}
