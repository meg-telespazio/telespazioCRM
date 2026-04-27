import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/register', '/cotizacion', '/unauthorized'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Permitir rutas públicas
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Verificar cookie de sesión de Firebase
  const session = request.cookies.get('__session');
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  // Excluimos explícitamente archivos de sistema, imágenes y los scripts del PWA (sw.js, workbox)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|img|manifest.json|sw.js|workbox-).*)'],
};
