import pool from "../../lib/db";
import bcrypt from "bcrypt"; // o bcryptjs si usas ese

function parseAuth(authHeader) {
  console.log("[parseAuth] Header recibido:", authHeader);
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    console.log("[parseAuth] Header inválido o no es Basic");
    return null;
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    console.log("[parseAuth] Usuario extraído:", username);
    return { username, password };
  } catch (error) {
    console.error("[parseAuth] Error parseando:", error);
    return null;
  }
}

async function authenticate(email, password) {
  try {
    console.log("[authenticate] Autenticando:", email);
    
    // *** MODIFICADO: Agregados campos faltas y baneado ***
    const [rows] = await pool.query(
      "SELECT email, password, name, rol, is_admin, faltas, baneado FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      console.log("[authenticate] Usuario no encontrado");
      return null;
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    
    console.log("[authenticate] Contraseña válida:", isValid);
    
    if (!isValid) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("[authenticate] Error:", error);
    return null;
  }
}

export async function POST(request) {
  const auth = request.headers.get("authorization");
  const creds = parseAuth(auth);
  if (!creds) return new Response("Acceso no autorizado. Por favor, inicia sesión.", { status: 401 });

  const user = await authenticate(creds.username, creds.password);
  if (!user) return new Response("Acceso no autorizado. Usuario o contraseña incorrectos.", { status: 401 });

  if (user.is_admin !== 0) return new Response("Solo los alumnos pueden realizar reservas.", { status: 403 });

  // *** NUEVA VALIDACIÓN: Verificar si el usuario está baneado ***
  if (user.baneado === 1) {
    return new Response(
      JSON.stringify({
        message: `Tu cuenta está suspendida por acumular ${user.faltas} faltas (no asistencias). Contacta al administrador del gimnasio para más información.`,
        baneado: true,
        faltas: user.faltas
      }),
      { 
        status: 403,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  // *** OPCIONAL: Advertencia si tiene 2 faltas ***
  if (user.faltas >= 2 && user.faltas < 3) {
    console.warn(`[ADVERTENCIA] ${user.email} tiene ${user.faltas} faltas. Una más y será baneado.`);
  }

  const { bloque_horario, sede } = await request.json();
  
  if (!bloque_horario) return new Response("Debe seleccionar un bloque horario para reservar.", { status: 400 });
  if (!sede) return new Response("Debe seleccionar una sede para reservar.", { status: 400 });

  try {
    console.log(`[${new Date().toISOString()}] ${user.email} intenta reservar ${bloque_horario} en ${sede}`);
    
    const [cuposResult] = await pool.query(
      'SELECT total, reservados FROM cupos WHERE bloque = ? AND sede = ? AND fecha = CURDATE()', 
      [bloque_horario, sede]
    );
    
    if (cuposResult.length === 0) {
      return new Response(`Bloque horario no disponible para hoy en ${sede}`, { status: 404 });
    }
    
    const { total, reservados } = cuposResult[0];
    if (reservados >= total) {
      return new Response(`No hay cupos disponibles para este bloque en ${sede} hoy`, { status: 400 });
    }

    const [reservasHoy] = await pool.query(
      `SELECT * FROM reservas WHERE email = ? AND fecha = CURDATE()`,
      [user.email]
    );
    
    if (reservasHoy.length > 0) {
      const tieneEnBloque = reservasHoy.some(r => r.bloque_horario === bloque_horario && r.sede === sede);
      if (tieneEnBloque) {
        return new Response(
          `Ya tienes una reserva para el bloque ${bloque_horario} en ${sede} hoy. No puedes reservar más de una vez en el mismo bloque y sede.`,
          { status: 400 }
        );
      } else {
        return new Response(
          `Ya tienes una reserva para hoy en ${reservasHoy[0].sede}. Solo puedes reservar una vez al día.`,
          { status: 400 }
        );
      }
    }

    await pool.query("BEGIN");
    
    await pool.query(
      "INSERT INTO reservas (email, fecha, bloque_horario, sede, asistio) VALUES (?, CURDATE(), ?, ?, 0)",
      [user.email, bloque_horario, sede]
    );

    await pool.query(
      "UPDATE cupos SET reservados = reservados + 1 WHERE bloque = ? AND sede = ? AND fecha = CURDATE()",
      [bloque_horario, sede]
    );

    await pool.query("COMMIT");

    console.log(`Reserva confirmada: ${user.email} -> ${bloque_horario} en ${sede} (${new Date().toISOString().split('T')[0]})`);

    // *** OPCIONAL: Devolver información de faltas en la respuesta ***
    const responseMessage = user.faltas >= 2 
      ? `Reserva realizada exitosamente para el bloque ${bloque_horario} en ${sede} de hoy. ⚠️ ADVERTENCIA: Tienes ${user.faltas} faltas. Una más y tu cuenta será suspendida.`
      : `Reserva realizada exitosamente para el bloque ${bloque_horario} en ${sede} de hoy. ¡Gracias!`;

    return new Response(
      JSON.stringify({
        message: responseMessage,
        faltas: user.faltas,
        bloque: bloque_horario,
        sede: sede
      }),
      { 
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error al realizar reserva:", error);
    return new Response("Error interno del servidor. Por favor, intenta más tarde.", { status: 500 });
  }
}

export async function GET(request) {
  const auth = request.headers.get("authorization");
  const creds = parseAuth(auth);
  if (!creds) return new Response("Acceso no autorizado", { status: 401 });

  const user = await authenticate(creds.username, creds.password);
  if (!user) return new Response("Credenciales inválidas", { status: 401 });

  try {
    const [reservas] = await pool.query(
      "SELECT * FROM reservas WHERE email = ? AND fecha = CURDATE()",
      [user.email]
    );

    // *** MODIFICADO: Incluir información de faltas del usuario ***
    return new Response(JSON.stringify({
      reservas: reservas,
      usuario: {
        email: user.email,
        name: user.name,
        faltas: user.faltas,
        baneado: user.baneado
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[GET RESERVAS] Error:", error);
    return new Response("Error al obtener reservas", { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = request.headers.get("authorization");
  const creds = parseAuth(auth);
  if (!creds) return new Response("Acceso no autorizado", { status: 401 });

  const user = await authenticate(creds.username, creds.password);
  if (!user) return new Response("Credenciales inválidas", { status: 401 });

  try {
    const { bloque_horario, sede } = await request.json();
    
    const [result] = await pool.query(
      "DELETE FROM reservas WHERE email = ? AND bloque_horario = ? AND sede = ? AND fecha = CURDATE()",
      [user.email, bloque_horario, sede]
    );

    if (result.affectedRows === 0) {
      return new Response("No se encontró la reserva", { status: 404 });
    }

    await pool.query(
      "UPDATE cupos SET reservados = reservados - 1 WHERE bloque = ? AND sede = ? AND fecha = CURDATE()",
      [bloque_horario, sede]
    );

    console.log(`[CANCELAR RESERVA] ${user.email} canceló el bloque ${bloque_horario} en ${sede}`);
    
    return new Response("Reserva cancelada exitosamente", { status: 200 });
  } catch (error) {
    console.error("[CANCELAR RESERVA] Error:", error);
    return new Response("Error al cancelar la reserva", { status: 500 });
  }
}
