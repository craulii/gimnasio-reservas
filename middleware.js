import { NextResponse } from 'next/server';
import { jwtVerify } from "jose";

const GOD_MODE_EMAILS = ['jose.vargasv@usm.cl', 'crauli1@usm.cl', 'christian.riquelmep@usm.cl'];

const PUBLIC_PATHS = [
  '/api/login',
  '/api/auth/register',
  '/api/register',
  '/api/auth/check', // Crucial para que el frontend verifique sesión sin error rojo
  '/_next',
  '/static'
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. DETERMINAR SI ES RUTA PÚBLICA O ARCHIVO ESTÁTICO
  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));
  const isPublicGetCupos = pathname.startsWith('/api/cupos') && request.method === 'GET';
  const isCronMantenimiento = pathname === '/api/admin/mantenimiento' && request.method === 'GET';
  const isStaticFile = pathname.includes('.');

  // Si es pública, dejamos pasar sin revisar cookies
  if (isPublicPath || isPublicGetCupos || isCronMantenimiento || isStaticFile) {
    return NextResponse.next();
  }

  // 2. VERIFICAR SESIÓN (PARA RUTAS PROTEGIDAS)
  const sessionCookie = request.cookies.get('user_session');
  
  if (!sessionCookie) {
    // Si la petición es a la API, respondemos con JSON para que el fetch no explote
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión.' }, 
        { status: 401 }
      );
    }
    // Si es una página (/admin o /estudiante), redirigimos al login (Home)
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 3. VALIDAR Y PASAR DATOS DE SESIÓN A LAS RUTAS
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload: sessionData } = await jwtVerify(sessionCookie.value, secret);

    // Verificación de integridad de la cookie
    if (!sessionData.email || !sessionData.role_type) {
      throw new Error('Sesión incompleta');
    }

    const requestHeaders = new Headers(request.headers);
    // Inyectamos los datos para que los archivos route.js los lean con request.headers.get()
    requestHeaders.set('x-user', sessionData.email);
    const isGodMode = GOD_MODE_EMAILS.includes(sessionData.email);
    requestHeaders.set('x-user-type', isGodMode ? 'admin' : sessionData.role_type);

    // Importante: También protegemos el acceso cruzado de roles aquí mismo
    // God Mode users pueden acceder a rutas /admin aunque su role_type sea 'alumno'
    if (pathname.startsWith('/admin') && sessionData.role_type !== 'admin' && !isGodMode) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next({
      request: { headers: requestHeaders }
    });

  } catch (error) {
    console.error('Error en middleware:', error.message);
    // Si la cookie es inválida o está corrupta, la limpiamos y redirigimos
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('user_session');
    return response;
  }
}

// 4. CONFIGURACIÓN DEL MATCHER
export const config = {
  matcher: [
    // Protege todas las APIs (excepto las públicas arriba)
    '/api/:path*',
    // Protege las rutas de navegación de alumnos y admin
    '/estudiante/:path*',
    '/admin/:path*'
  ]
};