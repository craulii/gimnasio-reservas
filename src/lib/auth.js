// src/lib/auth.js
// Helper centralizado para obtener usuario desde request.
// Lee headers del middleware (x-user, x-user-type) con fallback a cookie directa.
// Necesario porque Next.js 16 en Vercel no siempre propaga headers del middleware.

const GOD_MODE_EMAILS = ['jose.vargasv@usm.cl', 'crauli1@usm.cl', 'christian.riquelmep@usm.cl'];

export function getUserFromRequest(request) {
  let email = request.headers.get('x-user');
  let userType = request.headers.get('x-user-type');

  // Fallback: leer cookie directamente si el middleware no propagó headers
  if (!email) {
    try {
      const cookie = request.cookies.get('user_session');
      if (cookie) {
        const session = JSON.parse(cookie.value);
        email = session.email || null;
        userType = session.role_type || null;
        // Replicar lógica God Mode del middleware
        if (email && GOD_MODE_EMAILS.includes(email)) {
          userType = 'admin';
        }
      }
    } catch {
      // Cookie corrupta o inválida
    }
  }

  return { email, userType };
}
