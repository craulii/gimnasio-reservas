import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getFechaChile } from "@/app/utils/constants";

// Función de mantenimiento (Reseteo de Faltas)
async function verificarYResetearFaltas(connection, email, ultimoReset, faltasActuales) {
  try {
    if (!ultimoReset) {
      await connection.execute(
        "UPDATE users SET ultimo_reset_faltas = NOW() WHERE email = ?",
        [email]
      );
      return false;
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const lastReset = new Date(ultimoReset);

    if (lastReset < sixMonthsAgo && faltasActuales > 0) {
      await connection.execute(
        "UPDATE users SET faltas = 0, baneado = 0, ultimo_reset_faltas = NOW() WHERE email = ?",
        [email]
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error("[RESET FALTAS] Error:", error);
    return false;
  }
}

// Obtener usuario desde header
async function getUserFromHeader(request, connection) {
    const email = request.headers.get('x-user');
    if (!email) return null;

    const [rows] = await connection.execute(
        "SELECT email, name, rol, is_admin, faltas, baneado, ultimo_reset_faltas FROM users WHERE email = ? LIMIT 1",
        [email]
    );

    return rows.length > 0 ? rows[0] : null;
}

// --- MÉTODO POST: CREAR RESERVA ---
export async function POST(request) {
  let connection;
  try {
    connection = await pool.getConnection();

    // A. Identificar usuario
    const user = await getUserFromHeader(request, connection);
    if (!user) {
        return NextResponse.json({ error: "Acceso no autorizado." }, { status: 401 });
    }

    // B. Verificar rol (Solo alumnos reservan)
    if (user.is_admin === 1) {
        return NextResponse.json({ error: "Los administradores no pueden tomar cupos." }, { status: 403 });
    }

    // C. Mantenimiento de faltas (Auto-reset semestral)
    const seReseteo = await verificarYResetearFaltas(connection, user.email, user.ultimo_reset_faltas, user.faltas);
    if (seReseteo) {
      user.faltas = 0;
      user.baneado = 0;
    }

    // D. Verificar Baneo
    if (user.baneado === 1) {
      return NextResponse.json({
        message: `Tu cuenta está suspendida por acumular ${user.faltas} faltas.`,
        baneado: true,
        faltas: user.faltas
      }, { status: 403 });
    }

    // E. Leer datos
    const { bloque_horario, sede } = await request.json();
    if (!bloque_horario || !sede) {
        return NextResponse.json({ error: "Faltan datos (bloque o sede)" }, { status: 400 });
    }

    console.log(`[RESERVA] Intento: ${user.email} -> ${bloque_horario} en ${sede}`);

    // Issue #5 fix: Mover verificación DENTRO de la transacción con lock pesimista
    await connection.beginTransaction();

    try {
      // F. Verificar Cupos Disponibles (con lock FOR UPDATE)
      const hoyChile = getFechaChile();
      const [cuposResult] = await connection.execute(
        'SELECT total, reservados FROM cupos WHERE bloque = ? AND sede = ? AND fecha = ? FOR UPDATE',
        [bloque_horario, sede, hoyChile]
      );

      if (cuposResult.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: "Bloque no disponible o cerrado hoy" }, { status: 404 });
      }

      const { total, reservados } = cuposResult[0];
      if (reservados >= total) {
        await connection.rollback();
        return NextResponse.json({ error: "No quedan cupos disponibles" }, { status: 400 });
      }

      // G. Verificar si ya reservó hoy (1 reserva diaria) - dentro de la transacción
      const [reservasHoy] = await connection.execute(
        `SELECT id FROM reservas WHERE email = ? AND fecha = ?`,
        [user.email, hoyChile]
      );

      if (reservasHoy.length > 0) {
        await connection.rollback();
        return NextResponse.json({ error: "Ya tienes una reserva activa para hoy." }, { status: 400 });
      }

      // H. INSERT + UPDATE atómicos
      await connection.execute(
          "INSERT INTO reservas (email, fecha, bloque_horario, sede, asistio) VALUES (?, ?, ?, ?, 0)",
          [user.email, hoyChile, bloque_horario, sede]
      );

      await connection.execute(
          "UPDATE cupos SET reservados = reservados + 1 WHERE bloque = ? AND sede = ? AND fecha = ?",
          [bloque_horario, sede, hoyChile]
      );

      await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    }

    // I. Respuesta
    const msg = user.faltas >= 2
      ? `Reserva exitosa. OJO: Tienes ${user.faltas} faltas. Una más y serás baneado.`
      : `Reserva exitosa para ${bloque_horario} en ${sede}.`;

    return NextResponse.json({
      message: msg,
      faltas: user.faltas,
      bloque: bloque_horario,
      sede: sede
    }, { status: 201 });

  } catch (error) {
    console.error("Error POST Reserva:", error);
    return NextResponse.json({ error: "Error interno: " + error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// --- MÉTODO GET: VER MIS RESERVAS ---
export async function GET(request) {
  try {
    const email = request.headers.get('x-user');
    if (!email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const [userRows] = await pool.execute(
      "SELECT email, name, faltas, baneado FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (userRows.length === 0) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = userRows[0];

    const [reservas] = await pool.execute(
      "SELECT * FROM reservas WHERE email = ? AND fecha = ?",
      [user.email, getFechaChile()]
    );

    return NextResponse.json({
      reservas: reservas,
      usuario: {
        email: user.email,
        name: user.name,
        faltas: user.faltas,
        baneado: user.baneado
      }
    });
  } catch (error) {
    console.error("Error GET Reservas:", error);
    return NextResponse.json({ error: "Error al obtener reservas" }, { status: 500 });
  }
}

// --- MÉTODO DELETE: CANCELAR RESERVA ---
export async function DELETE(request) {
  let connection;
  try {
    connection = await pool.getConnection();

    const email = request.headers.get('x-user');
    if (!email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const [userRows] = await connection.execute(
      "SELECT email FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (userRows.length === 0) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { bloque_horario, sede } = await request.json();

    // TRANSACCIÓN
    await connection.beginTransaction();

    try {
        const [result] = await connection.execute(
          "DELETE FROM reservas WHERE email = ? AND bloque_horario = ? AND sede = ? AND fecha = ?",
          [email, bloque_horario, sede, getFechaChile()]
        );

        if (result.affectedRows === 0) {
          await connection.rollback();
          return NextResponse.json({ error: "No se encontró la reserva para cancelar" }, { status: 404 });
        }

        await connection.execute(
          "UPDATE cupos SET reservados = GREATEST(0, reservados - 1) WHERE bloque = ? AND sede = ? AND fecha = ?",
          [bloque_horario, sede, getFechaChile()]
        );

        await connection.commit();
        console.log(`Reserva cancelada: ${email}`);

        return NextResponse.json({ message: "Reserva cancelada exitosamente" });

    } catch (err) {
        await connection.rollback();
        throw err;
    }

  } catch (error) {
    console.error("Error DELETE Reserva:", error);
    return NextResponse.json({ error: "Error al cancelar" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
