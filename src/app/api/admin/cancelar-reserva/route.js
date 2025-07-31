import pool from "../../../lib/db";

export async function DELETE(request) {
  const userHeader = request.headers.get("x-user");
  if (!userHeader) return new Response("No autorizado", { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== "admin") return new Response("Solo admin", { status: 403 });

  const { email, bloque_horario, fecha } = await request.json();

  if (!email || !bloque_horario || !fecha) {
    return new Response("Faltan datos requeridos", { status: 400 });
  }

  try {
    console.log("=== CANCELANDO RESERVA ===");
    console.log("Email:", email);
    console.log("Bloque:", bloque_horario);
    console.log("Fecha recibida:", fecha);

    let fechaFormateada = fecha;
    if (fecha.includes("T")) {
      fechaFormateada = fecha.split("T")[0];
    }

    console.log("Fecha formateada para consulta:", fechaFormateada);

    await pool.query("BEGIN");

    const [result] = await pool.query(
      "DELETE FROM reservas WHERE email = ? AND bloque_horario = ? AND DATE(fecha) = DATE(?)",
      [email, bloque_horario, fechaFormateada]
    );

    console.log("Reservas eliminadas:", result.affectedRows);

    if (result.affectedRows > 0) {
      const fechaHoy = new Date().toISOString().split("T")[0];
      if (fechaFormateada === fechaHoy) {
        await pool.query(
          "UPDATE cupos SET reservados = GREATEST(0, reservados - 1) WHERE bloque = ? AND fecha = CURDATE()",
          [bloque_horario]
        );
        console.log("Contador de cupos actualizado");
      }
    }

    await pool.query("COMMIT");

    return new Response(
      JSON.stringify({
        message:
          result.affectedRows > 0
            ? "Reserva cancelada exitosamente"
            : "No se encontró la reserva para cancelar",
        cancelada: result.affectedRows > 0,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error cancelando reserva:", error);
    return new Response(
      JSON.stringify({
        error: "Error cancelando reserva",
        message: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
