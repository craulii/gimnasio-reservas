import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

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
      return NextResponse.json({ error: "Email no válido (debe ser @usm.cl)" }, { status: 401 });
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

    if (user.baneado === 1) {
       return NextResponse.json({ error: "Usuario bloqueado/baneado del sistema." }, { status: 403 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const isAdmin = Number(user.is_admin) === 1;
    const roleType = isAdmin ? 'admin' : 'alumno';

    // 1. Preparamos el objeto de datos (consistente con lo que espera tu middleware)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      rol_usm: user.rol, // Asegúrate que tu middleware use 'rol_usm' o cámbialo a 'rol'
      role_type: roleType
    };

    const response = NextResponse.json({
      message: "Login exitoso",
      user: userData // Enviamos los datos para el estado del frontend
    });

    // 2. 🔥 CORRECCIÓN CRÍTICA: Guardar Cookie con path '/' y el nombre correcto
    // Usamos JSON.stringify(userData) porque tu middleware hace JSON.parse
    response.cookies.set("user_session", JSON.stringify(userData), {
      httpOnly: true, // Seguridad: No accesible por JS del cliente
      secure: process.env.NODE_ENV === "production", 
      sameSite: "lax", // 'lax' es más compatible para redirecciones iniciales
      path: "/", // CRÍTICO: Para que sea visible en todas las rutas
      maxAge: 60 * 60 * 24 // 1 día (puedes subirlo a 7 días si prefieres)
    });

    return response;

  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}