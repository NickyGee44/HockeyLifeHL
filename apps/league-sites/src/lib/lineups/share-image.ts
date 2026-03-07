import { getBenchPlayers, type GameTeamLineupLayout } from '@/lib/lineups/types';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildLineupShareSvg({
  teamName,
  opponentName,
  scheduledLabel,
  venue,
  accentColor,
  layout,
}: {
  teamName: string;
  opponentName: string;
  scheduledLabel: string;
  venue: string | null;
  accentColor?: string | null;
  layout: GameTeamLineupLayout;
}) {
  const paintColor = accentColor || '#0ea5e9';
  const bench = getBenchPlayers(layout).slice(0, 8);
  const rosterById = new Map(layout.roster.map((player) => [player.playerId, player]));

  const placedPlayers = layout.placedPlayers
    .map((placed) => {
      const player = rosterById.get(placed.playerId);
      if (!player) return '';

      const x = (placed.x / 100) * 1000;
      const y = (placed.y / 100) * 1240;
      const jersey = escapeXml(String(player.jerseyNumber ?? '00'));
      const name = escapeXml(player.fullName || 'Player');

      return `
        <g transform="translate(${x}, ${y})">
          <circle cx="0" cy="0" r="38" fill="${paintColor}" stroke="rgba(255,255,255,0.72)" stroke-width="4" />
          <text x="0" y="8" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="800" fill="#ffffff">#${jersey}</text>
          <rect x="-98" y="52" width="196" height="34" rx="17" fill="rgba(2,6,23,0.82)" stroke="rgba(255,255,255,0.18)" />
          <text x="0" y="74" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff">${name}</text>
        </g>
      `;
    })
    .join('');

  const benchRows = bench
    .map((player, index) => {
      const top = 1448 + index * 34;
      return `
        <text x="88" y="${top}" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#e5e7eb">#${escapeXml(String(player.jerseyNumber ?? '--'))} ${escapeXml(player.fullName || 'Player')}</text>
      `;
    })
    .join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#020617" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
        <radialGradient id="ice" cx="0.5" cy="0.18" r="0.9">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="58%" stop-color="#dbeafe" />
          <stop offset="100%" stop-color="#eff6ff" />
        </radialGradient>
      </defs>
      <rect width="1200" height="1800" fill="url(#bg)" />
      <text x="88" y="116" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#7dd3fc" letter-spacing="4">GAME DAY LINEUP</text>
      <text x="88" y="188" font-family="Arial, sans-serif" font-size="60" font-weight="900" fill="#ffffff">${escapeXml(teamName)}</text>
      <text x="88" y="244" font-family="Arial, sans-serif" font-size="28" font-weight="600" fill="#cbd5e1">vs ${escapeXml(opponentName)}</text>
      <text x="88" y="292" font-family="Arial, sans-serif" font-size="22" font-weight="500" fill="#94a3b8">${escapeXml(scheduledLabel)}${venue ? ` · ${escapeXml(venue)}` : ''}</text>

      <rect x="72" y="344" width="1056" height="1180" rx="54" fill="#ffffff" fill-opacity="0.04" stroke="rgba(255,255,255,0.16)" />
      <rect x="104" y="380" width="992" height="1240" rx="66" fill="url(#ice)" stroke="rgba(255,255,255,0.22)" />
      <line x1="600" x2="600" y1="380" y2="1620" stroke="#ef4444" stroke-opacity="0.75" stroke-width="5" />
      <line x1="104" x2="1096" y1="652" y2="652" stroke="#38bdf8" stroke-opacity="0.82" stroke-width="6" />
      <line x1="104" x2="1096" y1="1348" y2="1348" stroke="#38bdf8" stroke-opacity="0.82" stroke-width="6" />
      <circle cx="600" cy="1000" r="118" stroke="#ef4444" stroke-opacity="0.6" stroke-width="5" />
      <circle cx="600" cy="1000" r="10" fill="#ef4444" fill-opacity="0.8" />
      <path d="M420 520 C420 430 780 430 780 520" stroke="#ef4444" stroke-opacity="0.45" stroke-width="5" fill="none" />
      <path d="M420 1480 C420 1570 780 1570 780 1480" stroke="#ef4444" stroke-opacity="0.45" stroke-width="5" fill="none" />
      <path d="M500 468 C500 424 700 424 700 468" stroke="#38bdf8" stroke-opacity="0.45" stroke-width="5" fill="none" />
      <path d="M500 1532 C500 1576 700 1576 700 1532" stroke="#38bdf8" stroke-opacity="0.45" stroke-width="5" fill="none" />

      ${placedPlayers}

      <text x="88" y="1716" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#94a3b8" letter-spacing="3">BENCH</text>
      ${benchRows}
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
      nextImage.onerror = () => reject(new Error('Failed to load lineup image.'));
      nextImage.src = svgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1800;
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

export async function downloadLineupImage(options: {
  teamName: string;
  opponentName: string;
  scheduledLabel: string;
  venue: string | null;
  accentColor?: string | null;
  fileName: string;
  layout: GameTeamLineupLayout;
}) {
  const file = await svgToPngFile(buildLineupShareSvg(options), options.fileName);
  const objectUrl = URL.createObjectURL(file);

  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = options.fileName;
    anchor.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function shareLineupImage(options: {
  teamName: string;
  opponentName: string;
  scheduledLabel: string;
  venue: string | null;
  accentColor?: string | null;
  fileName: string;
  layout: GameTeamLineupLayout;
  shareTitle: string;
  shareText: string;
  shareUrl: string;
}) {
  const file = await svgToPngFile(buildLineupShareSvg(options), options.fileName);

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: options.shareTitle,
      text: options.shareText,
      url: options.shareUrl,
      files: [file],
    });
    return true;
  }

  await downloadLineupImage(options);
  return false;
}
