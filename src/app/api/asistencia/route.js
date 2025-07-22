let ASISTENCIA = [];

export async function POST(request) {
  const userHeader = request.headers.get('x-user');
  if (!userHeader) return new Response('No autorizado', { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.role !== 'admin') return new Response('Solo el admin puede marcar asistencia', { status: 403 });

  const { username, bloque, presente } = await request.json();

  ASISTENCIA.push({ username, bloque, presente, fecha: new Date().toISOString() });

  return new Response(JSON.stringify({ message: 'Asistencia registrada' }), { status: 200 });
}
