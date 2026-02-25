import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getFechaChile, HORARIOS_LIMITE } from "@/app/utils/constants";

// Comparación de hora robusta (misma lógica que procesar-ausencias)
function horaAMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

// Procesar ausencias automáticas directamente en BD (sin HTTP fetch)
async function procesarAusenciasDirecto(bloque, sede, fecha) {
  try {
    const horaLimite = HORARIOS_LIMITE[bloque];
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
          await connection.execute("UPDATE reservas SET asistio = 2 WHERE id = ?", [reserva.id]);
          await connection.execute("UPDATE users SET faltas = faltas + 1 WHERE email = ?", [reserva.email]);

          const [user] = await connection.execute("SELECT faltas FROM users WHERE email = ? LIMIT 1", [reserva.email]);
          if (user[0]?.faltas >= 3) {
            await connection.execute("UPDATE users SET baneado = 1 WHERE email = ?", [reserva.email]);
          }

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

export async function POST(request) {
  // Issue #4 fix: Usar headers correctos en vez de JSON.parse
  const userEmail = request.headers.get("x-user");
  const userRole = request.headers.get("x-user-type");

  if (!userEmail || userRole !== 'admin') {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { asistencias, bloque_horario, sede, fecha } = await request.json();

  if (!asistencias || !Array.isArray(asistencias)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const asistencia of asistencias) {
      const { email, asistio } = asistencia;

      // Obtener el estado ANTERIOR de la asistencia
      const [reservaAnterior] = await connection.query(
        "SELECT asistio FROM reservas WHERE email = ? AND bloque_horario = ? AND sede = ? AND fecha = ?",
        [email, bloque_horario, sede, fecha]
      );

      if (reservaAnterior.length === 0) {
        console.warn(`[ADVERTENCIA] No se encontró reserva para ${email}`);
        continue;
      }

      const asistioAnterior = reservaAnterior[0].asistio;

      // Actualizar asistencia en reserva
      await connection.query(
        "UPDATE reservas SET asistio = ? WHERE email = ? AND bloque_horario = ? AND sede = ? AND fecha = ?",
        [asistio ? 1 : 0, email, bloque_horario, sede, fecha]
      );

      // *** LÓGICA DE FALTAS ***

      // Caso 1: Era NULL o 1 (presente/pendiente) y ahora es 0 (ausente) -> SUMAR FALTA
      if ((asistioAnterior === null || asistioAnterior === 1) && !asistio) {
        await connection.query(
          "UPDATE users SET faltas = faltas + 1 WHERE email = ?",
          [email]
        );
        console.log(`[FALTA AGREGADA] ${email}`);

        // Verificar Baneo (3 faltas)
        const [userRow] = await connection.query("SELECT faltas FROM users WHERE email = ?", [email]);
        if (userRow.length > 0 && userRow[0].faltas >= 3) {
          await connection.query("UPDATE users SET baneado = 1 WHERE email = ?", [email]);
          console.log(`[BANEADO] ${email}`);
        }
      }

      // Caso 2: Era 0 (ausente) y ahora es 1 (presente) -> RESTAR FALTA (Corregir error)
      else if (asistioAnterior === 0 && asistio) {
        await connection.query(
          "UPDATE users SET faltas = GREATEST(faltas - 1, 0) WHERE email = ?",
          [email]
        );
        console.log(`[FALTA CORREGIDA] ${email}`);

        // Desbanear si baja de 3 faltas
        const [userRow] = await connection.query("SELECT faltas FROM users WHERE email = ?", [email]);
        if (userRow.length > 0 && userRow[0].faltas < 3) {
          await connection.query("UPDATE users SET baneado = 0 WHERE email = ?", [email]);
          console.log(`[DESBANEADO] ${email}`);
        }
      }
    }

    await connection.commit();

    return NextResponse.json({
      message: "Asistencia registrada exitosamente",
      procesados: asistencias.length
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al registrar asistencia masiva:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// GET para obtener lista de usuarios de un bloque específico
export async function GET(request) {
  // Issue #4 fix: Usar headers correctos en vez de JSON.parse
  const userEmail = request.headers.get("x-user");
  const userRole = request.headers.get("x-user-type");

  if (!userEmail || userRole !== 'admin') {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const bloque = searchParams.get("bloque");
  const sede = searchParams.get("sede");
  const fecha = searchParams.get("fecha") || getFechaChile();

  if (!bloque || !sede) {
    return NextResponse.json({ error: "Faltan parámetros bloque o sede" }, { status: 400 });
  }

  // Procesamos ausencias automáticas antes de devolver la lista
  await procesarAusenciasDirecto(bloque, sede, fecha);

  try {
    const [rows] = await pool.query(
      `SELECT r.email, u.name, u.rol, r.asistio, u.faltas, u.baneado
       FROM reservas r
       LEFT JOIN users u ON r.email = u.email
       WHERE r.bloque_horario = ? AND r.sede = ? AND r.fecha = ?
       ORDER BY u.name`,
      [bloque, sede, fecha]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al obtener usuarios del bloque:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
