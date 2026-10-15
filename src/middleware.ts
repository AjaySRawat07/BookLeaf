import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from './lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static and internal paths to ignore
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(request);

  // If already logged in and visiting /login or root /, redirect to appropriate dashboard
  if (pathname === '/login' || pathname === '/') {
    if (session) {
      if (session.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/author/dashboard', request.url));
    }
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Author portal protection
  if (pathname.startsWith('/author')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Allow both AUTHOR and ADMIN in author preview
    return NextResponse.next();
  }

  // Admin portal protection
  if (pathname.startsWith('/admin')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== 'ADMIN') {
      // Forbidden: redirect author to author dashboard
      return NextResponse.redirect(new URL('/author/dashboard', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
