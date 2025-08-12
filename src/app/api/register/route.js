import pool from "../../lib/db";
import bcrypt from "bcryptjs";

const USM_EMAIL_REGEX = /^[a-z0-9._%+-]+@usm\.cl$/i;

function isUsmEmail(email) {
  return USM_EMAIL_REGEX.test(String(email).trim().toLowerCase());
}

export async function POST(request) {
  try {
    const { name, email, password, confirmPassword } = await request.json();
    if (!name || !email || !password || !confirmPassword) {
      return new Response(JSON.stringify({ error: "Todos los campos son obligatorios" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!isUsmEmail(normalizedEmail)) {
      return new Response(JSON.stringify({ error: "Solo se permiten correos @usm.cl" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (password !== confirmPassword) {
      return new Response(JSON.stringify({ error: "Las contraseñas no coinciden" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Política de contraseñas: 8–72 (72 es el máximo efectivo de bcrypt por si acaso)
    if (password.length < 8 || password.length > 72) {
      return new Response(
        JSON.stringify({ error: "La contraseña debe tener entre 8 y 72 caracteres" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Chequeo de existencia
    const [existingUser] = await pool.query("SELECT email FROM users WHERE email = ?", [
      normalizedEmail,
    ]);

    if (existingUser.length > 0) { //Evitamos filtrar más detalles.
      return new Response(JSON.stringify({ error: "Este email ya está registrado" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Hash pass
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      "INSERT INTO users (rol, name, email, password, is_admin) VALUES (?, ?, ?, ?, ?)",
      ["alumno", normalizedName, normalizedEmail, passwordHash, 0]
    );

    console.log(`[REGISTER] Usuario creado: ${normalizedName} (${normalizedEmail})`);

    return new Response(
      JSON.stringify({
        message: "Usuario creado exitosamente",
        user: {
          name: normalizedName,
          email: normalizedEmail,
          rol: "alumno",
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[REGISTER] Error:", error);

    // Manejo de clave duplicada por si el índice único dispara primero
    if (error.code === "ER_DUP_ENTRY") {
      return new Response(JSON.stringify({ error: "Este email ya está registrado" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}