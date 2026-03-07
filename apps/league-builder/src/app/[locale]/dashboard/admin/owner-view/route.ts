import { NextRequest, NextResponse } from 'next/server';
import { activatePlatformOwnerView } from '@/lib/actions/platform-owner-view';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;

  try {
    const redirectTo = await activatePlatformOwnerView({
      leagueId: request.nextUrl.searchParams.get('leagueId') ?? '',
      locale,
      redirectTo: request.nextUrl.searchParams.get('redirectTo'),
    });

    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch {
    return NextResponse.redirect(new URL(`/${locale}/dashboard/admin`, request.url));
  }
}
