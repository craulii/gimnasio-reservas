import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

const dbConfig = {
  host: '127.0.0.1',
  user: 'reservas_crauli',
  password: 'CrauliChris69!',
  database: 'reservas_gymusm',
  port: 3306
};

export async function POST(request) {
  let connection;
  try {
    // 1. SEGURIDAD
    // El middleware envía estos headers como texto plano
    const userRole = request.headers.get("x-user-type");
    const userEmail = request.headers.get("x-user");

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "Solo admin puede marcar asistencia" }, { status: 403 });
    }

    // 2. DATOS
    // username es el email del alumno al que le ponemos presente
    const { username, bloque, presente } = await request.json();

    if (!username || !bloque) {
       return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    connection = await mysql.createConnection(dbConfig);

    // 3. ACTUALIZAR
    // Asumimos que es para la fecha de HOY (CURDATE)
    const [result] = await connection.execute(
      "UPDATE reservas SET asistio = ? WHERE email = ? AND bloque_horario = ? AND fecha = CURDATE()",
      [presente ? 1 : 0, username, bloque]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "No se encontró la reserva para hoy" }, { status: 404 });
    }

    return NextResponse.json({ message: "Asistencia registrada exitosamente" });

  } catch (error) {
    console.error("Error marcando asistencia:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}