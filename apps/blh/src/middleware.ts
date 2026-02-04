import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// BLH app middleware - no special routing needed
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

// Only match non-static routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
