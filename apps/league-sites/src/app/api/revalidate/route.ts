import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * API route for on-demand revalidation of league pages
 * Called from league-builder when branding/settings are updated
 *
 * Usage:
 * POST /api/revalidate
 * Body: { slug: "metro-beer-league", secret: "your-revalidation-secret" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, secret, type = 'branding' } = body;

    // Verify the revalidation secret (fail closed — require secret to be configured)
    const revalidationSecret = process.env.REVALIDATION_SECRET;
    if (!revalidationSecret) {
      console.error('[Revalidation] REVALIDATION_SECRET is not configured');
      return NextResponse.json(
        { error: 'Revalidation not configured' },
        { status: 500 }
      );
    }
    if (secret !== revalidationSecret) {
      return NextResponse.json(
        { error: 'Invalid revalidation secret' },
        { status: 401 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { error: 'League slug is required' },
        { status: 400 }
      );
    }

    // Revalidate the league's pages based on type
    const paths = [
      `/${slug}`, // Home page
      `/${slug}/schedule`,
      `/${slug}/standings`,
      `/${slug}/teams`,
      `/${slug}/stats`,
      `/${slug}/about`,
      `/${slug}/contact`,
    ];

    // Revalidate all league pages
    for (const path of paths) {
      revalidatePath(path);
    }

    // Also revalidate the layout (affects all child pages)
    revalidatePath(`/${slug}`, 'layout');

    console.log(`[Revalidation] Triggered for league: ${slug}, type: ${type}`);

    return NextResponse.json({
      success: true,
      revalidated: paths,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Revalidation] Error:', error);
    return NextResponse.json(
      { error: 'Failed to revalidate' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for testing/health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Revalidation endpoint ready',
  });
}
