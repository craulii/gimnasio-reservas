import pool from "../../lib/db";
import bcrypt from "bcryptjs";

const USM_EMAIL_REGEX = /^[a-z0-9._%+-]+@usm\.cl$/i;
const ROL_REGEX = /^\d{9}-\d{1}$/;

function isUsmEmail(email) {
  return USM_EMAIL_REGEX.test(String(email).trim().toLowerCase());
}

export async function POST(request) {
  try {
    const { rol, name, email, password, confirmPassword } = await request.json();

    if (!rol || !name || !email || !password || !confirmPassword) {
      return new Response(
        JSON.stringify({ error: "Todos los campos son obligatorios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!ROL_REGEX.test(rol)) {
      return new Response(
        JSON.stringify({ error: "Formato de rol inválido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!isUsmEmail(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: "Solo se permiten correos @usm.cl" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (password !== confirmPassword) {
      return new Response(
        JSON.stringify({ error: "Las contraseñas no coinciden" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (password.length < 8 || password.length > 72) {
      return new Response(
        JSON.stringify({ error: "La contraseña debe tener entre 8 y 72 caracteres" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verificar si email ya existe
    const [existingUser] = await pool.query("SELECT email FROM users WHERE email = ?", [
      normalizedEmail,
    ]);

    if (existingUser.length > 0) {
      return new Response(
        JSON.stringify({ error: "Este email ya está registrado" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Hashear la contraseña
    const passwordHash = await bcrypt.hash(password, 12);

    // Insertar nuevo usuario
    await pool.query(
      "INSERT INTO users (rol, name, email, password, is_admin) VALUES (?, ?, ?, ?, ?)",
      [rol, normalizedName, normalizedEmail, passwordHash, 0]
    );

    console.log(`[REGISTER] Usuario creado: ${normalizedName} (${normalizedEmail})`);

    return new Response(
      JSON.stringify({
        message: "Usuario creado exitosamente",
        user: { name: normalizedName, email: normalizedEmail, rol },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[REGISTER] Error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return new Response(
        JSON.stringify({ error: "Este email ya está registrado" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
