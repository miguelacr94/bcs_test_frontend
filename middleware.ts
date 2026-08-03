import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas a las que un ADMIN NO puede acceder (rutas de cliente/públicas)
const ADMIN_RESTRICTED_PATHS = ['/', '/apply', '/status', '/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get('app_role')?.value;

  // --- Guardia 1: Proteger rutas /admin ---
  // Si un usuario sin rol ADMIN intenta entrar a /admin, redirigir al login
  if (pathname.startsWith('/admin')) {
    if (role !== 'ADMIN') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', '/admin/applications');
      return NextResponse.redirect(loginUrl);
    }
  }

  // --- Guardia 2: Restringir al ADMIN fuera de /admin ---
  // Si el usuario es ADMIN y está intentando acceder a rutas NO adminstrativas,
  // redirigirlo siempre a /admin/applications
  if (role === 'ADMIN') {
    const isAdminPath = pathname.startsWith('/admin');
    const isRestrictedForAdmin =
      ADMIN_RESTRICTED_PATHS.some((p) => pathname === p) ||
      pathname.startsWith('/status') ||
      pathname.startsWith('/apply');

    if (!isAdminPath && isRestrictedForAdmin) {
      return NextResponse.redirect(new URL('/admin/applications', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Aplica el middleware a todas las rutas excepto archivos estáticos y assets de Next.js
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
