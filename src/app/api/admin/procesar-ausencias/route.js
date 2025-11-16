import pool from "../../../lib/db";

// Mapeo de bloques a hora límite (15 min después de inicio)
const HORARIOS_LIMITE = {
  "1-2": "00:01:00",    // Bloque 8:15-9:40 → 8:30
  "3-4": "09:55:00",    // Bloque 9:40-11:05 → 9:55
  "5-6": "11:20:00",    // Bloque 11:05-12:30 → 11:20
  "7-8": "12:45:00",    // Bloque 12:30-13:55 → 12:45
  "9-10": "14:55:00",   // Bloque 14:40-16:05 → 14:55
  "11-12": "16:20:00",  // Bloque 16:05-17:30 → 16:20
  "13-14": "17:45:00",  // Bloque 17:30-18:55 → 17:45
};

export async function POST(request) {
  try {
    const { bloque, sede, fecha } = await request.json();
    
    // Obtener la hora actual en Chile (UTC-3)
    const now = new Date();
    const horaActual = now.toLocaleTimeString('es-CL', { 
      hour12: false, 
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const horaLimite = HORARIOS_LIMITE[bloque];
    
    if (!horaLimite) {
      return Response.json({ message: "Bloque no válido" }, { status: 400 });
    }

    // Solo procesar si ya pasó la hora límite
    if (horaActual < horaLimite) {
      return Response.json({ 
        message: "Aún no es hora de marcar ausencias automáticas",
        horaActual,
        horaLimite,
        procesado: false
      });
    }

    // Buscar reservas del día que no tienen asistencia marcada
    const [reservasSinMarcar] = await pool.query(
      `SELECT r.id, r.email, r.bloque_horario, r.sede 
       FROM reservas r
       WHERE r.fecha = ? 
       AND r.bloque_horario = ?
       AND r.sede = ?
       AND r.asistio = 0`,
      [fecha, bloque, sede]
    );

    if (reservasSinMarcar.length === 0) {
      return Response.json({ 
        message: "No hay reservas pendientes para este bloque",
        procesado: false 
      });
    }

    let faltasRegistradas = 0;

    // Marcar cada reserva como ausente y sumar falta
    for (const reserva of reservasSinMarcar) {
      await pool.query("BEGIN");

      try {
        // 1. Marcar ausencia en reserva (asistio = 0 ya está, pero por claridad)
        await pool.query(
          "UPDATE reservas SET asistio = 0 WHERE id = ?",
          [reserva.id]
        );

        // 2. Incrementar faltas del usuario
        await pool.query(
          "UPDATE users SET faltas = faltas + 1 WHERE email = ?",
          [reserva.email]
        );

        // 3. Verificar si llegó a 3 faltas y banear
        const [user] = await pool.query(
          "SELECT faltas FROM users WHERE email = ?",
          [reserva.email]
        );

        if (user[0]?.faltas >= 3) {
          await pool.query(
            "UPDATE users SET baneado = 1 WHERE email = ?",
            [reserva.email]
          );
          console.log(`[AUTO-AUSENCIA] 🚫 Usuario ${reserva.email} baneado por 3 faltas`);
        }

        // 4. Liberar el cupo
        await pool.query(
          `UPDATE cupos 
           SET reservados = GREATEST(0, reservados - 1)
           WHERE bloque = ? AND sede = ? AND fecha = ?`,
          [bloque, sede, fecha]
        );

        await pool.query("COMMIT");
        faltasRegistradas++;

        console.log(`[AUTO-AUSENCIA] ⚠️ Falta registrada: ${reserva.email} - ${bloque} en ${sede}`);
      } catch (error) {
        await pool.query("ROLLBACK");
        console.error(`[AUTO-AUSENCIA] Error procesando ${reserva.email}:`, error);
      }
    }

    return Response.json({
      message: `Procesadas ${faltasRegistradas} ausencias automáticas`,
      bloque,
      sede,
      fecha,
      horaLimite,
      horaActual,
      faltasRegistradas,
      procesado: true
    });

  } catch (error) {
    console.error("[PROCESAR-AUSENCIAS] Error:", error);
    return Response.json(
      { message: "Error al procesar ausencias" },
      { status: 500 }
    );
  }
}
