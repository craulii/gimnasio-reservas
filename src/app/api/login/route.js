import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
// No importamos cookies aquí, usaremos response.cookies

const dbConfig = {
  host: '127.0.0.1',
  user: 'reservas_crauli',
  password: 'CrauliChris69!',
  database: 'reservas_gymusm',
  port: 3306
};

const USM_EMAIL_REGEX = /^[a-z0-9._%+-]+@usm\.cl$/i;

export async function POST(request) {
  let connection;
  try {
    const body = await request.json();
    const { username: rawEmail, password } = body;

    if (!rawEmail || !password) {
      return NextResponse.json({ error: "Faltan credenciales" }, { status: 400 });
    }

    const email = String(rawEmail).trim().toLowerCase();

    if (!USM_EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Email no válido" }, { status: 401 });
    }

    connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const user = rows[0];

    // 🛑 VALIDACIÓN NUEVA: Verificar si está baneado
    if (user.baneado === 1) {
       return NextResponse.json({ error: "Usuario bloqueado/baneado del sistema." }, { status: 403 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    // --- PREPARAR DATOS DE SESIÓN ---
    // Agregamos 'rol_usm' (tu columna 'rol') porque es vital para la USM
    const sessionData = JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      rol_usm: user.rol, // 👈 EL ROL USM (Ej: 202104687-9)
      role_type: user.is_admin === 1 ? 'admin' : 'alumno' // Permisos web
    });

    const response = NextResponse.json({
      message: "Login exitoso",
      id: user.id,
      name: user.name,
      email: user.email,
      rol_usm: user.rol,
      rol: user.is_admin === 1 ? 'admin' : 'alumno',
      is_admin: user.is_admin === 1
    });

    response.cookies.set('user_session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 día
      path: '/'
    });

    return response;

  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Error del servidor: " + error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}