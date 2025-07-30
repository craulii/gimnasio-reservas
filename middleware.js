import { NextResponse } from 'next/server';

const USERS = [
  { username: 'alumno1', password: '1234', role: 'alumno' },
  { username: 'admin1', password: 'adminpass', role: 'admin' }
];

export function middleware(request) {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Basic ')) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const base64 = auth.split(' ')[1];
  let decoded;
  try {
    decoded = Buffer.from(base64, 'base64').toString('utf-8');
  } catch {
    return new NextResponse(JSON.stringify({ error: 'Invalid authorization header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const [username, password] = decoded.split(':');
  const user = USERS.find(u => u.username === username && u.password === password);

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const response = NextResponse.next();
  response.headers.set('x-user-role', user.role);
  response.headers.set('x-user', user.username);
  return response;
}

export const config = {
  matcher: ['/api/reservas/:path*', '/api/cupos/:path*', '/api/asistencia/:path*']
};