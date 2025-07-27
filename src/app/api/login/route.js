import pool from '../../lib/db';

export async function POST(request) {
  const { username: email, password } = await request.json();

  if (!email || !password) {
    return new Response("Faltan credenciales", { status: 400 });
  }

  try {
    const [rows] = await pool.query(
      "SELECT rol, password, is_admin, name FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0)
      return new Response("Credenciales inválidas", { status: 401 });

    const user = rows[0];

    if (user.password !== password) {
      return new Response("Credenciales inválidas", { status: 401 });
    }

    return new Response(
      JSON.stringify({
        rol: user.rol,
        is_admin: user.is_admin,
        name: user.name,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error en login:", error);
    return new Response("Error interno", { status: 500 });
  }
}
