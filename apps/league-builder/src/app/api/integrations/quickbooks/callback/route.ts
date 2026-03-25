import { NextRequest, NextResponse } from 'next/server';
import { handleQuickBooksCallback } from '@/lib/actions/league-finance';

export async function GET(request: NextRequest) {
  const result = await handleQuickBooksCallback(request);
  const response = NextResponse.redirect(new URL(result.redirectTo, request.url));
  if (result.clearNonceCookie) {
    response.cookies.set('hl_qbo_oauth_nonce', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  return response;
}
