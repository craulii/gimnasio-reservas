import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { HORARIOS_LIMITE } from "@/app/utils/constants";

// Comparación de hora robusta (Issue #13 fix)
function horaAMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export async function POST(request) {
  let connection;
  try {
    // 1. SEGURIDAD
    const userRole = request.headers.get("x-user-type");
    const userEmail = request.headers.get("x-user");

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { bloque, sede, fecha } = await request.json();

    // 2. Validar Hora Actual (Chile)
    const now = new Date();
    const horaActual = now.toLocaleTimeString('es-CL', {
      timeZone: 'America/Santiago',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const horaLimite = HORARIOS_LIMITE[bloque];

    if (!horaLimite) {
      return NextResponse.json({ message: "Bloque no válido" }, { status: 400 });
    }

    // Comparación numérica robusta en vez de string
    if (horaAMinutos(horaActual) < horaAMinutos(horaLimite)) {
      return NextResponse.json({
        message: "Aún no es hora de marcar ausencias automáticas",
        horaActual,
        horaLimite,
        procesado: false
      });
    }

    connection = await pool.getConnection();

    // 3. Buscar reservas pendientes (asistio = 0)
    const [reservasSinMarcar] = await connection.execute(
      `SELECT r.id, r.email, r.bloque_horario, r.sede
       FROM reservas r
       WHERE r.fecha = ?
       AND r.bloque_horario = ?
       AND r.sede = ?
       AND r.asistio = 0`,
      [fecha, bloque, sede]
    );

    if (reservasSinMarcar.length === 0) {
      return NextResponse.json({
        message: "No hay reservas pendientes para procesar en este bloque",
        procesado: false
      });
    }

    let faltasRegistradas = 0;

    // 4. Procesar cada ausencia
    for (const reserva of reservasSinMarcar) {
      await connection.beginTransaction();

      try {
        // A. Marcar reserva como "AUSENTE PROCESADO" (2)
        await connection.execute(
          "UPDATE reservas SET asistio = 2 WHERE id = ?",
          [reserva.id]
        );

        // B. Incrementar faltas del usuario
        await connection.execute(
          "UPDATE users SET faltas = faltas + 1 WHERE email = ?",
          [reserva.email]
        );

        // C. Verificar Ban (Si llega a 3, baneado)
        const [user] = await connection.execute(
          "SELECT faltas FROM users WHERE email = ? LIMIT 1",
          [reserva.email]
        );

        if (user[0]?.faltas >= 3) {
          await connection.execute(
            "UPDATE users SET baneado = 1 WHERE email = ?",
            [reserva.email]
          );
          console.log(`[AUTO-AUSENCIA] Usuario ${reserva.email} baneado por 3 faltas`);
        }

        // D. Liberar el cupo
        await connection.execute(
          `UPDATE cupos
           SET reservados = GREATEST(0, reservados - 1)
           WHERE bloque = ? AND sede = ? AND fecha = ?`,
          [bloque, sede, fecha]
        );

        await connection.commit();
        faltasRegistradas++;

        console.log(`[AUTO-AUSENCIA] Falta registrada: ${reserva.email}`);

      } catch (error) {
        await connection.rollback();
        console.error(`[AUTO-AUSENCIA] Error en reserva ${reserva.id}:`, error);
      }
    }

    return NextResponse.json({
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
    console.error("[PROCESAR-AUSENCIAS] Error Fatal:", error);
    return NextResponse.json(
      { message: "Error interno al procesar ausencias: " + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
