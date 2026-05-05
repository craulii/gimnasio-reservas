import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getFechaChile } from "@/app/utils/constants";
import { procesarAusenciasDirecto } from "@/lib/procesar-ausencias";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request) {
  const { email: userEmail, userType: userRole } = await getUserFromRequest(request);

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
          "UPDATE users SET faltas = LEAST(faltas + 1, 3) WHERE email = ?",
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

      // Caso 2: Era 0 o 2 (ausente manual o auto-procesada) y ahora es 1 (presente) -> RESTAR FALTA
      else if ((asistioAnterior === 0 || asistioAnterior === 2) && asistio) {
        await connection.query(
          "UPDATE users SET faltas = GREATEST(faltas - 1, 0) WHERE email = ?",
          [email]
        );
        console.log(`[FALTA CORREGIDA] ${email} (era asistio=${asistioAnterior})`);

        // Si fue auto-procesada, el cupo fue liberado -> re-incrementar reservados
        if (asistioAnterior === 2) {
          await connection.query(
            "UPDATE cupos SET reservados = LEAST(reservados + 1, total) WHERE bloque = ? AND sede = ? AND fecha = ?",
            [bloque_horario, sede, fecha]
          );
          console.log(`[CUPO RESTAURADO] ${bloque_horario} ${sede} ${fecha}`);
        }

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
  const { email: userEmail, userType: userRole } = await getUserFromRequest(request);

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
      `SELECT r.email, u.name, u.rut, u.rol, r.asistio, u.faltas, u.baneado
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
