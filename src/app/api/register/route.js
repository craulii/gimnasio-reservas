import pool from "../../lib/db";
import bcrypt from "bcryptjs";
import { normalizarRut, validarRut } from "../../lib/rut";

const USM_EMAIL_REGEX = /^[a-z0-9._%+-]+@usm\.cl$/i;
const ROL_REGEX = /^\d{9}-\d{1}$/;

function isUsmEmail(email) {
  return USM_EMAIL_REGEX.test(String(email).trim().toLowerCase());
}

export async function POST(request) {
  try {
    const { rol, rut, name, email, password, confirmPassword } = await request.json();

    // Validar campos obligatorios
    if (!rol || !rut || !name || !email || !password || !confirmPassword) {
      return new Response(
        JSON.stringify({ error: "Todos los campos son obligatorios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validar formato de rol institucional
    if (!ROL_REGEX.test(rol)) {
      return new Response(
        JSON.stringify({ error: "Formato de rol inválido (debe ser: 202104687-9)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validar RUT
    const rutNorm = normalizarRut(rut);
    if (!validarRut(rutNorm)) {
      return new Response(
        JSON.stringify({ error: "RUT inválido (ej: 12.345.678-9)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Normalizar datos
    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    // Validar correo institucional
    if (!isUsmEmail(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: "Solo se permiten correos @usm.cl" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validar coincidencia de contraseñas
    if (password !== confirmPassword) {
      return new Response(
        JSON.stringify({ error: "Las contraseñas no coinciden" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validar longitud de contraseña
    if (password.length < 8 || password.length > 72) {
      return new Response(
        JSON.stringify({ error: "La contraseña debe tener entre 8 y 72 caracteres" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verificar duplicados (email o RUT)
    const [existingUser] = await pool.query(
      "SELECT email, rut FROM users WHERE email = ? OR rut = ?",
      [normalizedEmail, rutNorm]
    );

    if (existingUser.length > 0) {
      const conflict = existingUser[0].email === normalizedEmail ? "email" : "RUT";
      return new Response(
        JSON.stringify({ error: `Este ${conflict} ya está registrado` }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 12);

    // Insertar usuario
    await pool.query(
      "INSERT INTO users (rol, rut, name, email, password, is_admin, faltas, baneado) VALUES (?, ?, ?, ?, ?, 0, 0, 0)",
      [rol, rutNorm, normalizedName, normalizedEmail, passwordHash]
    );

    console.log(`[REGISTER] Usuario creado: ${normalizedName} (${normalizedEmail})`);

    return new Response(
      JSON.stringify({
        message: "Usuario creado exitosamente",
        user: { name: normalizedName, email: normalizedEmail, rol, rut: rutNorm },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[REGISTER] Error:", error);

    if (error?.code === "ER_DUP_ENTRY") {
      return new Response(
        JSON.stringify({ error: "Este email o RUT ya está registrado" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
