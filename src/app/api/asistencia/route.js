import pool from '../../lib/db';

export async function POST(request) {
  const userHeader = request.headers.get("x-user");
  if (!userHeader) return new Response("No autorizado", { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== "admin") return new Response("Solo admin puede marcar asistencia", { status: 403 });

  const { username, bloque, presente } = await request.json();

  try {
    const [users] = await pool.query("SELECT id FROM users WHERE email = ?", [username]);
    if (users.length === 0) return new Response("Usuario no encontrado", { status: 404 });

    const userId = users[0].id;
    await pool.query(
      "UPDATE reservas SET asistio = ? WHERE user_id = ? AND bloque_horario = ? AND fecha = CURDATE()",
      [presente ? 1 : 0, userId, bloque]
    );

    return new Response(JSON.stringify({ message: "Asistencia registrada" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response("Error interno", { status: 500 });
  }
}
