import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isAuthenticated = !!token;
  
  // Define paths that require authentication
  const isAuthPath = request.nextUrl.pathname.startsWith('/dashboard');
  
  // Define authentication paths
  const isAuthPage = 
    request.nextUrl.pathname.startsWith('/sign-in') || 
    request.nextUrl.pathname.startsWith('/sign-up');

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users to sign-in page
  if (!isAuthenticated && isAuthPath) {
    return NextResponse.redirect(
      new URL(`/sign-in?callbackUrl=${encodeURIComponent(request.url)}`, request.url)
    );
  }

  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/sign-in',
    '/sign-up',
  ],
};
