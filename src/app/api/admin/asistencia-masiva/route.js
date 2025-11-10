import pool from "../../../lib/db";

export async function POST(request) {
  const userHeader = request.headers.get("x-user");
  if (!userHeader) return new Response("No autorizado", { status: 401 });
  
  const user = JSON.parse(userHeader);
  if (user.rol !== "admin") 
    return new Response("Solo admin puede tomar asistencia", { status: 403 });

  const { asistencias, bloque_horario, sede, fecha } = await request.json();
  
  if (!asistencias || !Array.isArray(asistencias)) {
    return new Response("Datos inválidos", { status: 400 });
  }

  try {
    await pool.query("BEGIN");

    for (const asistencia of asistencias) {
      const { email, asistio } = asistencia;
      
      // *** NUEVO: Obtener el estado ANTERIOR de la asistencia ***
      const [reservaAnterior] = await pool.query(
        "SELECT asistio FROM reservas WHERE email = ? AND bloque_horario = ? AND sede = ? AND fecha = ?",
        [email, bloque_horario, sede, fecha]
      );

      if (reservaAnterior.length === 0) {
        console.warn(`[ADVERTENCIA] No se encontró reserva para ${email}`);
        continue;
      }

      const asistioAnterior = reservaAnterior[0].asistio;
      
      // Actualizar asistencia en reserva
      await pool.query(
        "UPDATE reservas SET asistio = ? WHERE email = ? AND bloque_horario = ? AND sede = ? AND fecha = ?",
        [asistio ? 1 : 0, email, bloque_horario, sede, fecha]
      );

      // *** LÓGICA MEJORADA: Solo modificar faltas si hay un CAMBIO REAL ***
      
      // Caso 1: Era NULL o 1 (pendiente/presente) y ahora es 0 (ausente) -> INCREMENTAR falta
      if ((asistioAnterior === null || asistioAnterior === 1) && !asistio) {
        await pool.query(
          "UPDATE users SET faltas = faltas + 1 WHERE email = ?",
          [email]
        );
        console.log(`[FALTA AGREGADA] ${email} - Nueva ausencia registrada`);
        
        // Verificar si llegó a 3 faltas y banear
        const [userRow] = await pool.query(
          "SELECT faltas FROM users WHERE email = ?",
          [email]
        );

        if (userRow.length > 0 && userRow[0].faltas >= 3) {
          await pool.query(
            "UPDATE users SET baneado = 1 WHERE email = ?",
            [email]
          );
          console.log(`[BANEADO] ${email} - Alcanzó ${userRow[0].faltas} faltas`);
        }
      }
      
      // Caso 2: Era 0 (ausente) y ahora es 1 (presente) -> RESTAR falta (corrección)
      else if (asistioAnterior === 0 && asistio) {
        await pool.query(
          "UPDATE users SET faltas = GREATEST(faltas - 1, 0) WHERE email = ?",
          [email]
        );
        console.log(`[FALTA CORREGIDA] ${email} - Ausencia revertida`);
        
        // Si tenía 3+ faltas y ahora tiene menos de 3, desbanear
        const [userRow] = await pool.query(
          "SELECT faltas FROM users WHERE email = ?",
          [email]
        );

        if (userRow.length > 0 && userRow[0].faltas < 3) {
          await pool.query(
            "UPDATE users SET baneado = 0 WHERE email = ?",
            [email]
          );
          console.log(`[DESBANEADO] ${email} - Ahora tiene ${userRow[0].faltas} faltas`);
        }
      }
      
      // Caso 3: No hay cambio (0->0 o 1->1) -> NO hacer nada con faltas
      else {
        console.log(`[SIN CAMBIO] ${email} - Mantiene estado ${asistio ? 'presente' : 'ausente'}`);
      }
    }

    await pool.query("COMMIT");

    return new Response(
      JSON.stringify({ 
        message: "Asistencia registrada exitosamente",
        procesados: asistencias.length 
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error al registrar asistencia masiva:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}

// GET para obtener lista de usuarios de un bloque específico
export async function GET(request) {
  const userHeader = request.headers.get("x-user");
  if (!userHeader) return new Response("No autorizado", { status: 401 });
  
  const user = JSON.parse(userHeader);
  if (user.rol !== "admin") return new Response("Solo admin", { status: 403 });

  const { searchParams } = new URL(request.url);
  const bloque = searchParams.get("bloque");
  const sede = searchParams.get("sede");
  const fecha = searchParams.get("fecha") || new Date().toISOString().split('T')[0];

  if (!bloque || !sede) {
    return new Response("Faltan parámetros", { status: 400 });
  }

  try {
    const [rows] = await pool.query(
      `SELECT r.email, u.name, u.rol, r.asistio, u.faltas, u.baneado
       FROM reservas r
       LEFT JOIN users u ON r.email = u.email
       WHERE r.bloque_horario = ? AND r.sede = ? AND r.fecha = ?
       ORDER BY u.name`,
      [bloque, sede, fecha]
    );

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error al obtener usuarios del bloque:", error);
    return new Response("Error interno", { status: 500 });
  }
}
