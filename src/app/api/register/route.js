import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
// Asegúrate de que la ruta a tu archivo rut sea la correcta. 
// Normalmente es "../../../lib/rut" si estás en api/auth/register
import { normalizarRut, validarRut } from "@/lib/rut";
const dbConfig = {
  host: '127.0.0.1',
  user: 'reservas_crauli',
  password: 'CrauliChris69!',
  database: 'reservas_gymusm',
  port: 3306
};

const USM_EMAIL_REGEX = /^[a-z0-9._%+-]+@usm\.cl$/i;
const ROL_REGEX = /^\d{9}-\d{1}$/;

function isUsmEmail(email) {
  return USM_EMAIL_REGEX.test(String(email).trim().toLowerCase());
}

export async function POST(request) {
  let connection;
  try {
    const { rol, rut, name, email, password, confirmPassword } = await request.json();

    // --- 1. VALIDACIONES DE ENTRADA (Sin BDD) ---

    // Validar campos obligatorios
    if (!rol || !rut || !name || !email || !password || !confirmPassword) {
      return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 });
    }

    // Validar formato de rol institucional
    if (!ROL_REGEX.test(rol)) {
      return NextResponse.json({ error: "Formato de rol inválido (debe ser: 202104687-9)" }, { status: 400 });
    }

    // Validar RUT
    const rutNorm = normalizarRut(rut);
    if (!validarRut(rutNorm)) {
      return NextResponse.json({ error: "RUT inválido (ej: 12.345.678-9)" }, { status: 400 });
    }

    // Normalizar datos
    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    // Validar correo institucional
    if (!isUsmEmail(normalizedEmail)) {
      return NextResponse.json({ error: "Solo se permiten correos @usm.cl" }, { status: 400 });
    }

    // Validar coincidencia de contraseñas
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Las contraseñas no coinciden" }, { status: 400 });
    }

    // Validar longitud de contraseña
    if (password.length < 8 || password.length > 72) {
      return NextResponse.json({ error: "La contraseña debe tener entre 8 y 72 caracteres" }, { status: 400 });
    }

    // --- 2. OPERACIONES DE BASE DE DATOS ---
    
    connection = await mysql.createConnection(dbConfig);

    // Verificar duplicados (email o RUT)
    const [existingUser] = await connection.execute(
      "SELECT email, rut FROM users WHERE email = ? OR rut = ? LIMIT 1",
      [normalizedEmail, rutNorm]
    );

    if (existingUser.length > 0) {
      // Determinamos qué fue lo que chocó para dar un error útil
      const conflict = existingUser[0].email === normalizedEmail ? "email" : "RUT";
      return NextResponse.json({ error: `Este ${conflict} ya está registrado` }, { status: 409 });
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 12);

    // Insertar usuario
    await connection.execute(
      "INSERT INTO users (rol, rut, name, email, password, is_admin, faltas, baneado) VALUES (?, ?, ?, ?, ?, 0, 0, 0)",
      [rol, rutNorm, normalizedName, normalizedEmail, passwordHash]
    );

    console.log(`[REGISTER] Usuario creado: ${normalizedName} (${normalizedEmail})`);

    return NextResponse.json({
      message: "Usuario creado exitosamente",
      user: { name: normalizedName, email: normalizedEmail, rol, rut: rutNorm },
    }, { status: 201 });

  } catch (error) {
    console.error("[REGISTER] Error:", error);

    // Captura de error nativo de MySQL por si acaso (race condition)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Este email o RUT ya está registrado" }, { status: 409 });
    }

    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}