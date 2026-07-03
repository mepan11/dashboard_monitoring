import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/session';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session cookie
  const sessionCookie = request.cookies.get('session')?.value;
  const session = sessionCookie ? await verifyToken(sessionCookie) : null;

  // Public paths
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isLandingPage = pathname === '/';

  // If user is not authenticated and trying to access dashboard, redirect to login
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based path access control
    const role = session.role;
    if (pathname.startsWith('/dashboard/admin') && role !== 'super_admin') {
      return NextResponse.redirect(new URL(`/dashboard/${getDashboardSlug(role)}`, request.url));
    }
    if (pathname.startsWith('/dashboard/principal') && role !== 'principal') {
      return NextResponse.redirect(new URL(`/dashboard/${getDashboardSlug(role)}`, request.url));
    }
    if (pathname.startsWith('/dashboard/teacher') && role !== 'teacher') {
      return NextResponse.redirect(new URL(`/dashboard/${getDashboardSlug(role)}`, request.url));
    }
    if (pathname.startsWith('/dashboard/parent') && role !== 'parent') {
      return NextResponse.redirect(new URL(`/dashboard/${getDashboardSlug(role)}`, request.url));
    }
    if (pathname.startsWith('/dashboard/coach') && role !== 'coach') {
      return NextResponse.redirect(new URL(`/dashboard/${getDashboardSlug(role)}`, request.url));
    }
  }

  // If user is authenticated and goes to login/register/landing, redirect to their dashboard
  if (session && (isAuthPage || isLandingPage)) {
    const dashboardUrl = new URL(`/dashboard/${getDashboardSlug(session.role)}`, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

function getDashboardSlug(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'admin';
    case 'principal':
      return 'principal';
    case 'teacher':
      return 'teacher';
    case 'parent':
      return 'parent';
    case 'coach':
      return 'coach';
    default:
      return 'login';
  }
}

export const config = {
  matcher: ['/', '/login', '/register', '/dashboard/:path*'],
};
