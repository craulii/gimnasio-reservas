import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

const dbConfig = {
  host: '127.0.0.1',
  user: 'reservas_crauli',
  password: 'CrauliChris69!',
  database: 'reservas_gymusm',
  port: 3306
};

export async function GET(request) {
  let connection;
  try {
    // 1. SEGURIDAD: Verificar headers del Middleware
    const userRole = request.headers.get("x-user-type");
    const userEmail = request.headers.get("x-user");

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    console.log("=== CARGANDO RESERVAS DE HOY (ADMIN) ===");

    connection = await mysql.createConnection(dbConfig);

    // 2. QUERY: Traer reservas de hoy con datos del usuario
    const query = `
      SELECT 
        r.bloque_horario, 
        r.sede, 
        r.fecha, 
        u.name, 
        u.rol, 
        r.email, 
        r.asistio
      FROM reservas r
      LEFT JOIN users u ON r.email = u.email
      WHERE r.fecha = CURDATE()
      ORDER BY r.sede, r.bloque_horario, u.name
    `;

    const [rows] = await connection.execute(query);
    
    console.log(`Reservas encontradas: ${rows.length}`);

    // 3. RETORNO DIRECTO (ARRAY)
    // Devolvemos el array 'rows' directamente para que el .map() del frontend funcione.
    // Si devolvemos un objeto {}, el frontend fallará con "map is not a function".
    return NextResponse.json(rows);

  } catch (error) {
    console.error("Error en reservas-por-bloque:", error);
    return NextResponse.json({ 
        error: "Error interno", 
        message: error.message 
    }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}