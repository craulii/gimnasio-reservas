import { NextResponse } from 'next/server';

const USERS = [
  { username: 'alumno1', password: '1234', role: 'alumno' },
  { username: 'admin1', password: 'adminpass', role: 'admin' }
];

export function middleware(request) {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Basic ')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const base64 = auth.split(' ')[1];
  const [username, password] = atob(base64).split(':');

  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  request.headers.set('x-user', JSON.stringify(user));
  return NextResponse.next({
    request: { headers: request.headers }
  });
}

export const config = {
  matcher: ['/api/reservas/:path*', '/api/cupos/:path*', '/api/asistencia/:path*']
};
