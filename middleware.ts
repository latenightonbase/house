import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  

  // Note: With Privy, authentication is handled client-side.
  // Protected routes should check authentication state in the component itself.
  // Middleware is mainly used for logging or other server-side checks.
  
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static file extensions (images, fonts, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico)(?!.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|otf)$).*)',
  ],
};
