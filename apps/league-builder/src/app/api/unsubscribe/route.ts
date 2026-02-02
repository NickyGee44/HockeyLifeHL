/**
 * Unsubscribe API Route
 *
 * Handles one-click unsubscribe from email notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeWithToken } from '@/lib/notifications/actions';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  if (!token) {
    return NextResponse.redirect(
      new URL('/unsubscribe?error=missing_token', request.url)
    );
  }

  const result = await unsubscribeWithToken(token, type || undefined);

  if (result.success) {
    return NextResponse.redirect(
      new URL(`/unsubscribe?success=true&type=${type || 'all'}`, request.url)
    );
  }

  return NextResponse.redirect(
    new URL('/unsubscribe?error=invalid_token', request.url)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, type } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing token' },
        { status: 400 }
      );
    }

    const result = await unsubscribeWithToken(token, type);

    if (result.success) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
