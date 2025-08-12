// app/api/login/route.js (ajusta la ruta según tu estructura)
import pool from "../../lib/db";
import bcrypt from "bcryptjs";

const USM_EMAIL_REGEX = /^[a-z0-9._%+-]+@usm\.cl$/i;

export async function POST(request) {
  try {
    const { username: rawEmail, password } = await request.json();

    if (!rawEmail || !password) {
      return new Response(JSON.stringify({ error: "Faltan credenciales" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const email = String(rawEmail).trim().toLowerCase();

    // Restringe el login a correos @usm.cl
    if (!USM_EMAIL_REGEX.test(email)) {
      // No data leak
      return new Response(JSON.stringify({ error: "Credenciales inválidas" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [rows] = await pool.query(
      "SELECT email, rol, password, is_admin, name FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    // Si no existe, responde genérico y simula el coste del hash para mitigar timing attacks
    if (!rows || rows.length === 0) {
      await bcrypt.compare(password, "$2a$12$invalidinvalidinvalidinvalidinval");
      return new Response(JSON.stringify({ error: "Credenciales inválidas" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = rows[0];

    // Compara hash y contraseña
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Credenciales inválidas" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        rol: user.rol,
        is_admin: !!user.is_admin,
        name: user.name,
        email: user.email,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[LOGIN] Error:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}