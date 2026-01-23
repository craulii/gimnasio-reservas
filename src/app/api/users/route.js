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

// --- GET: LISTAR USUARIOS (ADMIN) ---
export async function GET(request) {
  let connection;
  try {
    // 1. SEGURIDAD
    const userRole = request.headers.get("x-user-type");
    const userEmail = request.headers.get("x-user");

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    connection = await mysql.createConnection(dbConfig);

    // 2. QUERY
    const [users] = await connection.execute(
      "SELECT id, name, email, rol, is_admin, baneado FROM users ORDER BY name ASC"
    );

    return NextResponse.json(users);

  } catch (error) {
    console.error("Error API Users GET:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

// --- POST: CREAR USUARIO MANUALMENTE (ADMIN) ---
export async function POST(request) {
  let connection;
  try {
    // 1. SEGURIDAD
    const userRole = request.headers.get("x-user-type");
    if (userRole !== 'admin') {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { name, email, password, rol } = await request.json();

    if (!name || !email || !password || !rol) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    connection = await mysql.createConnection(dbConfig);

    // 2. Verificar duplicados
    const [existing] = await connection.execute(
      "SELECT email FROM users WHERE email = ?", 
      [email]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: "El email ya existe" }, { status: 409 });
    }

    // 3. Hashear Password (VITAL)
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Insertar
    // Nota: Si tu tabla requiere 'rut', asegúrate de enviarlo o que acepte NULL.
    // Aquí usamos los campos que mandaste en tu snippet original.
    await connection.execute(
      "INSERT INTO users (name, email, password, rol, is_admin, baneado, faltas) VALUES (?, ?, ?, ?, 0, 0, 0)",
      [name, email, hashedPassword, rol]
    );

    return NextResponse.json({ message: "Usuario creado exitosamente" }, { status: 201 });

  } catch (error) {
    console.error("Error API Users POST:", error);
    return NextResponse.json({ error: "Error interno: " + error.message }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}