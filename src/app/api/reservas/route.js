export async function POST(request) {
  const auth = request.headers.get("authorization");
  const creds = parseAuth(auth);
  if (!creds) return new Response("Acceso no autorizado. Por favor, inicia sesión.", { status: 401 });

  const user = await authenticate(creds.username, creds.password);
  if (!user) return new Response("Acceso no autorizado. Usuario o contraseña incorrectos.", { status: 401 });

  if (user.is_admin !== 0) return new Response("Solo los alumnos pueden realizar reservas.", { status: 403 });

  const { bloque_horario } = await request.json();
  if (!bloque_horario) return new Response("Debe seleccionar un bloque horario para reservar.", { status: 400 });

  try {
    console.log(`[${new Date().toISOString()}] ${user.email} intenta reservar ${bloque_horario}`);
    
    const [cuposResult] = await pool.query(
      'SELECT total, reservados FROM cupos WHERE bloque = ? AND fecha = CURDATE()', 
      [bloque_horario]
    );
    
    if (cuposResult.length === 0) {
      return new Response("Bloque horario no disponible para hoy", { status: 404 });
    }
    
    const { total, reservados } = cuposResult[0];
    if (reservados >= total) {
      return new Response("No hay cupos disponibles para este bloque hoy", { status: 400 });
    }

    const [reservasHoy] = await pool.query(
      `SELECT * FROM reservas WHERE email = ? AND fecha = CURDATE()`,
      [user.email]
    );
    
    if (reservasHoy.length > 0) {
      const tieneEnBloque = reservasHoy.some(r => r.bloque_horario === bloque_horario);
      if (tieneEnBloque) {
        return new Response(
          `Ya tienes una reserva para el bloque ${bloque_horario} hoy. No puedes reservar más de una vez en el mismo bloque.`,
          { status: 400 }
        );
      } else {
        return new Response(
          `Ya tienes una reserva para hoy en otro bloque. Solo puedes reservar una vez al día.`,
          { status: 400 }
        );
      }
    }

    await pool.query("BEGIN");
    
    await pool.query(
      "INSERT INTO reservas (email, fecha, bloque_horario, asistio) VALUES (?, CURDATE(), ?, 0)",
      [user.email, bloque_horario]
    );

    await pool.query(
      "UPDATE cupos SET reservados = reservados + 1 WHERE bloque = ? AND fecha = CURDATE()",
      [bloque_horario]
    );

    await pool.query("COMMIT");

    console.log(`Reserva confirmada: ${user.email} -> ${bloque_horario} (${new Date().toISOString().split('T')[0]})`);

    return new Response(
      JSON.stringify({ 
        message: `Reserva realizada exitosamente para el bloque ${bloque_horario} de hoy. ¡Gracias!`,
        fecha: new Date().toISOString().split('T')[0],
        bloque: bloque_horario
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