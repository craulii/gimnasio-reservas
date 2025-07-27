import pool from '../../lib/db';

function parseAuth(auth) {
  if (!auth || !auth.startsWith("Basic ")) return null;
  const base64Credentials = auth.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");
  const [username, password] = credentials.split(":");
  return { username, password };
}

async function authenticate(username, password) {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [username]);
  if (rows.length === 0) return null;
  const user = rows[0];
  if (user.password !== password) return null;
  return user;
}

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

    await pool.query(
      "INSERT INTO reservas (email, fecha, bloque_horario, asistio) VALUES (?, CURDATE(), ?, 0)",
      [user.email, bloque_horario]
    );

    return new Response(
      JSON.stringify({ message: `Reserva realizada exitosamente para el bloque ${bloque_horario}. ¡Gracias!` }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error al realizar reserva:", error);
    return new Response("Error interno del servidor. Por favor, intenta más tarde.", { status: 500 });
  }
}
