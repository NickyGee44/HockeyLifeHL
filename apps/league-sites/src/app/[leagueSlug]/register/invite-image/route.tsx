import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { getPublicCaptainInvitePreview } from '@/lib/captain/invite-preview';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const size = {
  width: 1200,
  height: 630,
};

async function toDataUrl(src: string | null | undefined) {
  if (!src) return null;

  try {
    const response = await fetch(src, { cache: 'no-store' });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueSlug: string }> },
) {
  const url = new URL(request.url);
  const captainInvite = url.searchParams.get('captainInvite');
  const { leagueSlug } = await params;

  if (!captainInvite) {
    return new Response('Missing captainInvite', { status: 400 });
  }

  const preview = await getPublicCaptainInvitePreview(captainInvite);
  if (!preview || (preview.leagueSlug && preview.leagueSlug !== leagueSlug)) {
    return new Response('Invite not found', { status: 404 });
  }

  const isLeagueBranding = preview.branding.kind === 'league';
  const platformLogoUrl = `${url.origin}/logo.png`;
  const logoDataUrl = await toDataUrl(
    isLeagueBranding ? platformLogoUrl : (preview.branding.logoUrl || platformLogoUrl),
  );
  const inviteHeading = preview.inviteeName === 'there'
    ? 'Complete your signup on Beer League Hockey'
    : `${preview.inviteeName}, complete your signup on Beer League Hockey`;
  const inviteTarget = isLeagueBranding ? `${preview.leagueName}'s spare list` : preview.teamName;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          padding: '48px',
          background: `linear-gradient(135deg, ${preview.branding.secondaryColor} 0%, ${preview.branding.primaryColor} 52%, #050b16 100%)`,
          color: 'white',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '70%',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: preview.branding.accentColor,
                marginBottom: '22px',
              }}
            >
              Player Invite
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 64,
                fontWeight: 800,
                lineHeight: '1.0',
                marginBottom: '16px',
              }}
            >
              {preview.branding.name}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                color: 'rgba(255,255,255,0.84)',
              }}
            >
              {preview.branding.subtitle}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(7, 15, 28, 0.7)',
              borderRadius: '24px',
              padding: '28px',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 20,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: preview.branding.accentColor,
                marginBottom: '14px',
              }}
            >
              Registration Link Ready
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 38,
                fontWeight: 800,
                lineHeight: '1.1',
                marginBottom: '16px',
              }}
            >
              {inviteHeading}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 24,
                color: 'rgba(255,255,255,0.82)',
              }}
            >
              {`Tap the shared link to join ${inviteTarget}`}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            width: 240,
            marginLeft: '32px',
            borderRadius: '28px',
            background: isLeagueBranding ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.14)',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUrl} alt={preview.branding.name} style={{ width: '72%', height: '72%', objectFit: 'contain' }} />
          ) : (
            <div
              style={{
                display: 'flex',
                fontSize: 42,
                fontWeight: 800,
                color: preview.branding.accentColor,
              }}
            >
              HL
            </div>
          )}
        </div>
      </div>
    ),
    size,
  );
}
