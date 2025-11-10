import pool from "../../../lib/db";

export async function GET(request) {
  const userHeader = request.headers.get("x-user");
  if (!userHeader) return new Response("No autorizado", { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== "admin") return new Response("Solo admin", { status: 403 });

  try {
    console.log("=== CARGANDO RESERVAS DE HOY ===");
    console.log("Usuario que hace petición:", user);

    const query = `
      SELECT r.bloque_horario, r.sede, r.fecha, u.name, u.rol, r.email, r.asistio
      FROM reservas r
      LEFT JOIN users u ON r.email = u.email
      WHERE r.fecha = CURDATE()
      ORDER BY r.sede, r.bloque_horario, u.name
    `;

    console.log("Ejecutando query para HOY (CURDATE())");
    const [rows] = await pool.query(query);
    console.log("RESULTADOS encontrados:", rows.length);
    console.log("Datos:", rows);

    const reservasPorBloque = {};

    rows.forEach((row) => {
      if (!reservasPorBloque[row.bloque_horario]) {
        reservasPorBloque[row.bloque_horario] = [];
      }

      reservasPorBloque[row.bloque_horario].push({
        nombre: row.name,
        email: row.email,
        rol: row.rol,  // ← AGREGADO
        sede: row.sede,
        asistio: row.asistio,
        fecha: row.fecha,
      });
    });

    console.log("RESULTADO FINAL:", reservasPorBloque);
    console.log("=== FIN CARGA RESERVAS ===");

    return new Response(JSON.stringify(reservasPorBloque), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error completo en reservas-por-bloque:", error);
    return new Response(
      JSON.stringify({
        error: "Error interno",
        message: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
