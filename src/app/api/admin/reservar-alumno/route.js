import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getFechaChile } from "@/app/utils/constants";
import { getBloquesActivosAsync } from "@/lib/config-bloques";

const CUPOS_POR_SEDE = {
  'Vitacura': 13,
  'San Joaquín': 17,
};
const SEDES = ['Vitacura', 'San Joaquín'];

// Auto-genera cupos de un día si no existen
async function autoGenerarCuposDia(connection, fechaStr) {
  const [existentes] = await connection.execute(
    "SELECT COUNT(*) as count FROM cupos WHERE fecha = ?",
    [fechaStr]
  );
  if (existentes[0].count > 0) return;

  for (const sede of SEDES) {
    const cuposSede = CUPOS_POR_SEDE[sede];
    const bloquesSede = await getBloquesActivosAsync(sede, fechaStr);
    for (const bloque of bloquesSede) {
      await connection.execute(
        "INSERT INTO cupos (bloque, sede, total, reservados, fecha) VALUES (?, ?, ?, 0, ?) ON CONFLICT (bloque, sede, fecha) DO NOTHING",
        [bloque, sede, cuposSede, fechaStr]
      );
    }
  }
  console.log(`[RESERVAR-ALUMNO] Auto-generados cupos para ${fechaStr}`);
}

export async function POST(request) {
  let connection;
  try {
    // Auth
    const userType = request.headers.get("x-user-type");
    if (userType !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { email, fecha, bloque_horario, sede } = await request.json();
    if (!email || !fecha || !bloque_horario || !sede) {
      return NextResponse.json({ error: "Faltan datos (email, fecha, bloque_horario, sede)" }, { status: 400 });
    }

    // Validar fecha
    const fechaDate = new Date(fecha + 'T12:00:00');
    if (isNaN(fechaDate.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }

    // Validar día hábil
    const dia = fechaDate.getDay();
    if (dia === 0 || dia === 6) {
      return NextResponse.json({ error: "No se puede reservar en fin de semana" }, { status: 400 });
    }

    // Validar fecha no pasada
    const hoy = getFechaChile();
    if (fecha < hoy) {
      return NextResponse.json({ error: "No se puede reservar en fecha pasada" }, { status: 400 });
    }

    // Validar bloque para sede/fecha
    const bloquesPermitidos = await getBloquesActivosAsync(sede, fecha);
    if (!bloquesPermitidos.includes(bloque_horario)) {
      return NextResponse.json({ error: "Bloque no disponible para esta sede en esa fecha" }, { status: 400 });
    }

    connection = await pool.getConnection();

    // Verificar que el usuario existe
    const [userRows] = await connection.execute(
      "SELECT email, name, is_admin FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (userRows.length === 0) {
      connection.release();
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Auto-generar cupos si no existen
    await autoGenerarCuposDia(connection, fecha);

    // Transacción con lock pesimista
    await connection.beginTransaction();

    try {
      // Lock cupo
      const [cuposResult] = await connection.execute(
        "SELECT total, reservados FROM cupos WHERE bloque = ? AND sede = ? AND fecha = ? LIMIT 1 FOR UPDATE",
        [bloque_horario, sede, fecha]
      );

      if (cuposResult.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: "Cupo no encontrado para ese bloque/sede/fecha" }, { status: 404 });
      }

      const { total, reservados } = cuposResult[0];
      if (reservados >= total) {
        await connection.rollback();
        return NextResponse.json({ error: "No quedan cupos disponibles" }, { status: 400 });
      }

      // Verificar que el alumno no tenga reserva ese día
      const [reservasExistentes] = await connection.execute(
        "SELECT id FROM reservas WHERE email = ? AND fecha = ?",
        [email, fecha]
      );

      if (reservasExistentes.length > 0) {
        await connection.rollback();
        return NextResponse.json({ error: "El alumno ya tiene una reserva para ese día" }, { status: 400 });
      }

      // INSERT reserva + UPDATE cupos
      await connection.execute(
        "INSERT INTO reservas (email, fecha, bloque_horario, sede, asistio) VALUES (?, ?, ?, ?, NULL)",
        [email, fecha, bloque_horario, sede]
      );

      await connection.execute(
        "UPDATE cupos SET reservados = reservados + 1 WHERE bloque = ? AND sede = ? AND fecha = ?",
        [bloque_horario, sede, fecha]
      );

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    }

    const alumnoName = userRows[0].name;
    console.log(`[RESERVAR-ALUMNO] Reserva creada: ${email} -> ${bloque_horario} ${sede} ${fecha}`);

    return NextResponse.json({
      message: `Reserva creada para ${alumnoName} (${email}) - ${bloque_horario} en ${sede} el ${fecha}`,
    }, { status: 201 });

  } catch (error) {
    console.error("Error reservar-alumno:", error);
    return NextResponse.json({ error: "Error interno: " + error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
