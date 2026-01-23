import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

const dbConfig = {
  host: '127.0.0.1',
  user: 'reservas_crauli',
  password: 'CrauliChris69!',
  database: 'reservas_gymusm',
  port: 3306
};

// --- MÉTODO POST: ACTIVAR PÁNICO (Bloquear horarios) ---
export async function POST(request) {
  let connection;
  try {
    // 1. SEGURIDAD: Verificar que sea Admin
    // El Middleware ya validó la sesión, aquí validamos el ROL.
    const userRole = request.headers.get('x-user-type');
    const userEmail = request.headers.get('x-user');

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json(
        { message: "Acceso denegado. Solo administradores pueden activar el pánico." },
        { status: 403 }
      );
    }

    const { bloques, fecha } = await request.json();

    if (!bloques || bloques.length === 0) {
      return NextResponse.json(
        { message: "Debes seleccionar al menos un bloque" },
        { status: 400 }
      );
    }

    const fechaTarget = fecha || new Date().toISOString().split('T')[0];
    
    let reservasCanceladas = 0;
    let cuposDesactivados = 0;

    // 2. CONEXIÓN Y TRANSACCIÓN
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    for (const item of bloques) {
      const { bloque, sede } = item;

      try {
        // A. Eliminar todas las reservas existentes del bloque
        const [deleteResult] = await connection.execute(
          `DELETE FROM reservas 
           WHERE bloque_horario = ? 
           AND sede = ? 
           AND fecha = ?`,
          [bloque, sede, fechaTarget]
        );

        reservasCanceladas += deleteResult.affectedRows;

        // B. Desactivar el bloque poniendo total = 0 y reservados = 0
        const [updateResult] = await connection.execute(
          `UPDATE cupos 
           SET total = 0, reservados = 0 
           WHERE bloque = ? 
           AND sede = ? 
           AND fecha = ?`,
          [bloque, sede, fechaTarget]
        );

        if (updateResult.affectedRows > 0) {
          cuposDesactivados++;
        } else {
          // Si no existe el cupo para hoy, crearlo desactivado
          await connection.execute(
            `INSERT INTO cupos (bloque, sede, fecha, total, reservados) 
             VALUES (?, ?, ?, 0, 0)`,
            [bloque, sede, fechaTarget]
          );
          cuposDesactivados++;
        }

        console.log(`[BOTÓN PÁNICO] 🚨 Desactivado: ${bloque} en ${sede} (${fechaTarget})`);
      } catch (error) {
        console.error(`[BOTÓN PÁNICO] Error en ${bloque} - ${sede}:`, error);
        throw error; // Lanza error para activar el Rollback
      }
    }

    // 3. CONFIRMAR CAMBIOS
    await connection.commit();

    return NextResponse.json({
      message: `Botón de pánico activado exitosamente`,
      reservasCanceladas,
      cuposDesactivados,
      bloques: bloques.length,
      fecha: fechaTarget
    });

  } catch (error) {
    if (connection) await connection.rollback(); // Revertir si algo falló
    console.error("[BOTÓN PÁNICO] Error Fatal:", error);
    return NextResponse.json(
      { message: "Error al activar el botón de pánico: " + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}

// --- MÉTODO GET: OBTENER ESTADO ---
export async function GET(request) {
  let connection;
  try {
    // Seguridad básica
    const userRole = request.headers.get('x-user-type');
    if (userRole !== 'admin') {
       return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get("fecha") || new Date().toISOString().split('T')[0];

    connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      `SELECT bloque, sede, total, reservados, fecha
       FROM cupos
       WHERE fecha = ?
       ORDER BY bloque, sede`,
      [fecha]
    );

    return NextResponse.json({
      fecha,
      cupos: rows
    });

  } catch (error) {
    console.error("[BOTÓN PÁNICO GET] Error:", error);
    return NextResponse.json(
      { message: "Error al obtener estado de bloques" },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}