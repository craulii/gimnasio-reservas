import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function DELETE(request) {
  let connection;
  try {
    // 1. SEGURIDAD
    const { email: userEmail, userType: userRole } = await getUserFromRequest(request);

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "Acceso denegado. Solo administradores." }, { status: 403 });
    }

    const { email, bloque_horario, sede, fecha } = await request.json();

    if (!email || !bloque_horario || !sede || !fecha) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    console.log(`[ADMIN DELETE] Eliminando: ${email} - ${bloque_horario} - ${sede} - ${fecha}`);

    let fechaFormateada = fecha;
    if (fecha.includes("T")) {
      fechaFormateada = fecha.split("T")[0];
    }

    // 2. CONEXIÓN Y TRANSACCIÓN
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.execute(
      "DELETE FROM reservas WHERE email = ? AND bloque_horario = ? AND sede = ? AND fecha::DATE = ?::DATE",
      [email, bloque_horario, sede, fechaFormateada]
    );

    console.log("Reservas eliminadas:", result.affectedRows);

    if (result.affectedRows > 0) {
      await connection.execute(
        "UPDATE cupos SET reservados = GREATEST(0, reservados - 1) WHERE bloque = ? AND sede = ? AND fecha = ?",
        [bloque_horario, sede, fechaFormateada]
      );
      console.log("Cupo liberado correctamente.");
    }

    await connection.commit();

    return NextResponse.json({
      message: result.affectedRows > 0
        ? "Reserva cancelada exitosamente"
        : "No se encontró la reserva para cancelar",
      cancelada: result.affectedRows > 0
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error cancelando reserva:", error);
    return NextResponse.json(
      { error: "Error interno al cancelar", details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
