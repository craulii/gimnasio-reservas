import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

const dbConfig = {
  host: '127.0.0.1',
  user: 'reservas_crauli',
  password: 'CrauliChris69!',
  database: 'reservas_gymusm',
  port: 3306
};

export async function DELETE(request) {
  let connection;
  try {
    // 1. SEGURIDAD: Verificar headers del Middleware
    // El middleware ya valida la sesión, aquí verificamos el ROL.
    const userRole = request.headers.get("x-user-type"); // Viene como string 'admin' o 'alumno'
    const userEmail = request.headers.get("x-user");

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "Acceso denegado. Solo administradores." }, { status: 403 });
    }

    const { email, bloque_horario, sede, fecha } = await request.json();

    if (!email || !bloque_horario || !sede || !fecha) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    console.log(`[ADMIN DELETE] Eliminando: ${email} - ${bloque_horario} - ${sede} - ${fecha}`);

    // Formatear fecha (YYYY-MM-DD)
    let fechaFormateada = fecha;
    if (fecha.includes("T")) {
      fechaFormateada = fecha.split("T")[0];
    }

    // 2. CONEXIÓN Y TRANSACCIÓN
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    // A. Eliminar la reserva
    // Usamos DATE() para ignorar horas si las hubiera
    const [result] = await connection.execute(
      "DELETE FROM reservas WHERE email = ? AND bloque_horario = ? AND sede = ? AND DATE(fecha) = DATE(?)",
      [email, bloque_horario, sede, fechaFormateada]
    );

    console.log("Reservas eliminadas:", result.affectedRows);

    // B. Si se borró algo, liberar el cupo
    if (result.affectedRows > 0) {
      // Actualizamos la tabla de cupos para esa fecha específica
      await connection.execute(
        "UPDATE cupos SET reservados = GREATEST(0, reservados - 1) WHERE bloque = ? AND sede = ? AND fecha = ?",
        [bloque_horario, sede, fechaFormateada]
      );
      console.log("Cupo liberado correctamente.");
    }

    // C. Confirmar cambios
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
    if (connection) await connection.end();
  }
}