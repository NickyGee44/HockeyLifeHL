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

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${preview.branding.secondaryColor} 0%, ${preview.branding.primaryColor} 52%, #050b16 100%)`,
          color: 'white',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 34%), radial-gradient(circle at bottom left, rgba(212,175,102,0.20), transparent 28%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: -140,
            top: -120,
            width: 520,
            height: 520,
            borderRadius: '999px',
            border: '2px solid rgba(255,255,255,0.08)',
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 110,
            bottom: -110,
            width: 340,
            height: 340,
            borderRadius: '999px',
            border: `2px solid ${preview.branding.accentColor}55`,
            opacity: 0.55,
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            padding: '56px 60px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: preview.branding.accentColor,
                }}
              >
                <span>Player Invite</span>
                <span style={{ width: 64, height: 2, background: `${preview.branding.accentColor}` }} />
                <span style={{ color: 'rgba(255,255,255,0.82)', letterSpacing: '0.08em' }}>{preview.leagueName}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.02 }}>{preview.branding.name}</div>
                <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.84)', lineHeight: 1.2 }}>{preview.branding.subtitle}</div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                width: 220,
                height: 220,
                borderRadius: 36,
                background: isLeagueBranding ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.14)',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 24px 80px rgba(0,0,0,0.28)',
                overflow: 'hidden',
              }}
            >
              {logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoDataUrl} alt={preview.branding.name} style={{ width: '78%', height: '78%', objectFit: 'contain' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '0.08em', color: preview.branding.accentColor }}>HL</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Beer League Hockey</div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              padding: '28px 34px',
              borderRadius: 30,
              background: 'rgba(7, 15, 28, 0.68)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.26)',
              maxWidth: 900,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: preview.branding.accentColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Registration Link Ready
              </div>
              <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.08 }}>
                {preview.inviteeName === 'there' ? 'Complete your signup on Hockey Life' : `${preview.inviteeName}, complete your signup on Hockey Life`}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 14, height: 14, borderRadius: 999, background: preview.branding.accentColor }} />
              <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.82)' }}>
                Tap the shared link to join {isLeagueBranding ? `${preview.leagueName}'s spare list` : preview.teamName}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
