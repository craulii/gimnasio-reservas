import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. ZONA PÚBLICA
  if (pathname.startsWith('/api/login') || 
     (pathname.startsWith('/api/cupos') && request.method === 'GET') ||
      pathname.startsWith('/_next') || 
      pathname.startsWith('/static')) {
      return NextResponse.next();
  }

  // 2. VERIFICACIÓN DE SESIÓN
  const sessionCookie = request.cookies.get('user_session');

  if (!sessionCookie) {
    if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 3. TRADUCCIÓN (Inyectar datos vitales a la API)
  try {
    const sessionData = JSON.parse(sessionCookie.value);
    
    const requestHeaders = new Headers(request.headers);
    
    // 👇 AQUI PASAMOS LOS DATOS CLAVE A LA API
    requestHeaders.set('x-user', sessionData.email);        // Identificador Email
    requestHeaders.set('x-user-rol', sessionData.rol_usm);  // Identificador ROL USM (Ej: 202104687-9)
    requestHeaders.set('x-user-type', sessionData.role_type); // Permiso (admin/alumno)
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('user_session');
    return response;
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/estudiante/:path*',
    '/admin/:path*'
  ]
};