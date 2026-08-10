import pool from "@/lib/db";
import { getHorariosLimiteAsync } from "@/lib/config-bloques";

// Comparación de hora robusta
export function horaAMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

// Procesar ausencias automáticas directamente en BD (sin HTTP fetch)
// Marca como ausente (asistio=2) las reservas pendientes (asistio=NULL)
// cuando ya pasó el horario límite (15 min después de inicio del bloque)
export async function procesarAusenciasDirecto(bloque, sede, fecha) {
  try {
    const horariosLimite = await getHorariosLimiteAsync();
    const horaLimite = horariosLimite[bloque];
    if (!horaLimite) return;

    const horaActual = new Date().toLocaleTimeString('es-CL', {
      timeZone: 'America/Santiago',
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    if (horaAMinutos(horaActual) < horaAMinutos(horaLimite)) return;

    const connection = await pool.getConnection();
    try {
      const [pendientes] = await connection.execute(
        `SELECT r.id, r.email FROM reservas r
         WHERE r.fecha = ? AND r.bloque_horario = ? AND r.sede = ? AND r.asistio IS NULL`,
        [fecha, bloque, sede]
      );

      for (const reserva of pendientes) {
        await connection.beginTransaction();
        try {
          // UPDATE condicional: AND asistio IS NULL garantiza que solo el primer
          // request concurrente procese esta reserva (evita faltas infladas)
          const [updateResult] = await connection.execute(
            "UPDATE reservas SET asistio = 2 WHERE id = ? AND asistio IS NULL",
            [reserva.id]
          );

          // Si affectedRows === 0, otro request ya procesó esta reserva → saltar
          if (updateResult.affectedRows === 0) {
            await connection.rollback();
            continue;
          }

          // Combo: incrementar faltas y auto-banear si llega a 3 en una sola query
          await connection.execute(
            "UPDATE users SET faltas = LEAST(faltas + 1, 3), baneado = CASE WHEN LEAST(faltas + 1, 3) >= 3 THEN 1 ELSE baneado END WHERE email = ?",
            [reserva.email]
          );

          await connection.execute(
            "UPDATE cupos SET reservados = GREATEST(0, reservados - 1) WHERE bloque = ? AND sede = ? AND fecha = ?",
            [bloque, sede, fecha]
          );

          await connection.commit();
          console.log(`[AUTO-AUSENCIA] Falta registrada: ${reserva.email}`);
        } catch (err) {
          await connection.rollback();
          console.error(`[AUTO-AUSENCIA] Error en reserva ${reserva.id}:`, err.message);
        }
      }

      if (pendientes.length > 0) {
        console.log(`[AUTO-AUSENCIA] Procesadas ${pendientes.length} ausencias para bloque ${bloque}`);
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.warn('[AUTO-AUSENCIA] Error:', error.message);
  }
}
