import { NextRequest, NextResponse } from 'next/server';
import { getLeagueBySlug } from '@/lib/data';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueSlug: string }> }
) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  const name = league?.name || 'Beer League Hockey';
  const shortName = league?.short_name || league?.name || 'BLH';
  const themeColor = league?.primary_color || '#0a0a0a';
  const logoUrl = league?.logo_url;

  const icons = logoUrl
    ? [
        { src: logoUrl, sizes: '192x192', type: 'image/png' },
        { src: logoUrl, sizes: '512x512', type: 'image/png' },
      ]
    : [
        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ];

  const manifest = {
    name,
    short_name: shortName.slice(0, 12),
    icons,
    theme_color: themeColor,
    background_color: '#0a0a0a',
    display: 'standalone',
    start_url: `/${leagueSlug}`,
    scope: `/${leagueSlug}`,
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
