import { NextResponse } from "next/server";
import pool from "@/lib/db";

// --- MÉTODO POST: ACTIVAR PÁNICO (Bloquear horarios) ---
export async function POST(request) {
  let connection;
  try {
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

    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const item of bloques) {
      const { bloque, sede } = item;

      try {
        const [deleteResult] = await connection.execute(
          `DELETE FROM reservas
           WHERE bloque_horario = ?
           AND sede = ?
           AND fecha = ?`,
          [bloque, sede, fechaTarget]
        );

        reservasCanceladas += deleteResult.affectedRows;

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
          await connection.execute(
            `INSERT INTO cupos (bloque, sede, fecha, total, reservados)
             VALUES (?, ?, ?, 0, 0)`,
            [bloque, sede, fechaTarget]
          );
          cuposDesactivados++;
        }

        console.log(`[BOTÓN PÁNICO] Desactivado: ${bloque} en ${sede} (${fechaTarget})`);
      } catch (error) {
        console.error(`[BOTÓN PÁNICO] Error en ${bloque} - ${sede}:`, error);
        throw error;
      }
    }

    await connection.commit();

    return NextResponse.json({
      message: `Botón de pánico activado exitosamente`,
      reservasCanceladas,
      cuposDesactivados,
      bloques: bloques.length,
      fecha: fechaTarget
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("[BOTÓN PÁNICO] Error Fatal:", error);
    return NextResponse.json(
      { message: "Error al activar el botón de pánico: " + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// --- MÉTODO GET: OBTENER ESTADO ---
export async function GET(request) {
  try {
    const userRole = request.headers.get('x-user-type');
    if (userRole !== 'admin') {
       return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get("fecha") || new Date().toISOString().split('T')[0];

    const [rows] = await pool.execute(
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
  }
}
