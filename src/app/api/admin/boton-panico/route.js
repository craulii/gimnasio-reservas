import pool from "../../../lib/db";

export async function POST(request) {
  try {
    const { bloques, fecha } = await request.json();
    
    if (!bloques || bloques.length === 0) {
      return Response.json(
        { message: "Debes seleccionar al menos un bloque" },
        { status: 400 }
      );
    }

    const fechaTarget = fecha || new Date().toISOString().split('T')[0];
    
    let reservasCanceladas = 0;
    let cuposDesactivados = 0;

    await pool.query("BEGIN");

    for (const item of bloques) {
      const { bloque, sede } = item;

      try {
        // 1. Eliminar todas las reservas existentes del bloque
        const [deleteResult] = await pool.query(
          `DELETE FROM reservas 
           WHERE bloque_horario = ? 
           AND sede = ? 
           AND fecha = ?`,
          [bloque, sede, fechaTarget]
        );

        reservasCanceladas += deleteResult.affectedRows;

        // 2. Desactivar el bloque poniendo total = 0 y reservados = 0
        const [updateResult] = await pool.query(
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
          await pool.query(
            `INSERT INTO cupos (bloque, sede, fecha, total, reservados) 
             VALUES (?, ?, ?, 0, 0)`,
            [bloque, sede, fechaTarget]
          );
          cuposDesactivados++;
        }

        console.log(`[BOTÓN PÁNICO] 🚨 Desactivado: ${bloque} en ${sede} (${fechaTarget})`);
      } catch (error) {
        console.error(`[BOTÓN PÁNICO] Error en ${bloque} - ${sede}:`, error);
        throw error;
      }
    }

    await pool.query("COMMIT");

    return Response.json({
      message: `Botón de pánico activado exitosamente`,
      reservasCanceladas,
      cuposDesactivados,
      bloques: bloques.length,
      fecha: fechaTarget
    });

  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("[BOTÓN PÁNICO] Error:", error);
    return Response.json(
      { message: "Error al activar el botón de pánico" },
      { status: 500 }
    );
  }
}

// GET: Obtener estado de bloques
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get("fecha") || new Date().toISOString().split('T')[0];

    const [rows] = await pool.query(
      `SELECT bloque, sede, total, reservados, fecha
       FROM cupos
       WHERE fecha = ?
       ORDER BY bloque, sede`,
      [fecha]
    );

    return Response.json({
      fecha,
      cupos: rows
    });

  } catch (error) {
    console.error("[BOTÓN PÁNICO GET] Error:", error);
    return Response.json(
      { message: "Error al obtener estado de bloques" },
      { status: 500 }
    );
  }
}
