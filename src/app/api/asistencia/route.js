import pool from '../../lib/db';

export async function POST(request) {
  const userHeader = request.headers.get("x-user");
  if (!userHeader) return new Response("No autorizado", { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== "admin") return new Response("Solo admin puede marcar asistencia", { status: 403 });

  const { username, bloque, presente } = await request.json();

  try {
    const [result] = await pool.query(
      "UPDATE reservas SET asistio = ? WHERE email = ? AND bloque_horario = ? AND fecha = CURDATE()",
      [presente ? 1 : 0, username, bloque]
    );

    if (result.affectedRows === 0) {
      return new Response("No se encontró la reserva", { status: 404 });
    }

    return new Response(JSON.stringify({ message: "Asistencia registrada" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response("Error interno", { status: 500 });
  }
}
