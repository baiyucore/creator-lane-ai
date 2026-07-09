import { type NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME =
  process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME ||
  process.env.SESSION_COOKIE_NAME ||
  'creator_lane_session';

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/work/:path*'],
};
