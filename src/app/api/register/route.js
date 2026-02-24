import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { normalizarRut, validarRut } from "@/lib/rut";
import pool from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const USM_EMAIL_REGEX = /^[a-z0-9._%+-]+@usm\.cl$/i;
const ROL_REGEX = /^\d{9}-\d{1}$/;

function isUsmEmail(email) {
  return USM_EMAIL_REGEX.test(String(email).trim().toLowerCase());
}

export async function POST(request) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { allowed } = checkRateLimit(`register:${ip}`);
    if (!allowed) {
      return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo en 15 minutos." }, { status: 429 });
    }

    const { rol, rut, name, email, password, confirmPassword } = await request.json();

    // --- 1. VALIDACIONES DE ENTRADA (Sin BDD) ---

    if (!rol || !rut || !name || !email || !password || !confirmPassword) {
      return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 });
    }

    if (!ROL_REGEX.test(rol)) {
      return NextResponse.json({ error: "Formato de rol inválido (debe ser: 202104687-9)" }, { status: 400 });
    }

    const rutNorm = normalizarRut(rut);
    if (!validarRut(rutNorm)) {
      return NextResponse.json({ error: "RUT inválido (ej: 12.345.678-9)" }, { status: 400 });
    }

    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!isUsmEmail(normalizedEmail)) {
      return NextResponse.json({ error: "Solo se permiten correos @usm.cl" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Las contraseñas no coinciden" }, { status: 400 });
    }

    if (password.length < 8 || password.length > 72) {
      return NextResponse.json({ error: "La contraseña debe tener entre 8 y 72 caracteres" }, { status: 400 });
    }

    // --- 2. OPERACIONES DE BASE DE DATOS ---

    const [existingUser] = await pool.execute(
      "SELECT email, rut FROM users WHERE email = ? OR rut = ? LIMIT 1",
      [normalizedEmail, rutNorm]
    );

    if (existingUser.length > 0) {
      const conflict = existingUser[0].email === normalizedEmail ? "email" : "RUT";
      return NextResponse.json({ error: `Este ${conflict} ya está registrado` }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.execute(
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

    if (error?.code === "23505") {
      return NextResponse.json({ error: "Este email o RUT ya está registrado" }, { status: 409 });
    }

    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
