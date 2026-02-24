import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const USM_EMAIL_REGEX = /^[a-z0-9._%+-]+@usm\.cl$/i;

export async function POST(request) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { allowed } = checkRateLimit(`login:${ip}`);
    if (!allowed) {
      return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo en 15 minutos." }, { status: 429 });
    }

    const body = await request.json();
    const { username: rawEmail, password } = body;

    if (!rawEmail || !password) {
      return NextResponse.json({ error: "Faltan credenciales" }, { status: 400 });
    }

    const email = String(rawEmail).trim().toLowerCase();

    if (!USM_EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Email no válido (debe ser @usm.cl)" }, { status: 401 });
    }

    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const user = rows[0];

    if (user.baneado === 1) {
       return NextResponse.json({ error: "Usuario bloqueado/baneado del sistema." }, { status: 403 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const isAdmin = Number(user.is_admin) === 1;
    const roleType = isAdmin ? 'admin' : 'alumno';

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      rol_usm: user.rol,
      role_type: roleType
    };

    const response = NextResponse.json({
      message: "Login exitoso",
      user: userData
    });

    response.cookies.set("user_session", JSON.stringify(userData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24
    });

    return response;

  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
