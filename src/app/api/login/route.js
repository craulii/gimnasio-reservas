export async function POST(request) {
  const { username, password } = await request.json();

  const USERS = [
    { username: 'alumno1', password: '1234', role: 'alumno' },
    { username: 'admin1', password: 'adminpass', role: 'admin' }
  ];

  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) {
    return new Response(JSON.stringify({ message: 'Credenciales inválidas' }), {
      status: 401
    });
  }

  return new Response(JSON.stringify({ message: 'Login exitoso', role: user.role }), {
    status: 200
  });
}
