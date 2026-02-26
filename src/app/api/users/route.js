import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

// --- GET: LISTAR USUARIOS (ADMIN) ---
export async function GET(request) {
  try {
    const userRole = request.headers.get("x-user-type");
    const userEmail = request.headers.get("x-user");

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const [users] = await pool.execute(
      "SELECT id, name, email, rol, is_admin, baneado FROM users ORDER BY name ASC"
    );

    return NextResponse.json(users);

  } catch (error) {
    console.error("Error API Users GET:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// --- POST: CREAR USUARIO MANUALMENTE (ADMIN) ---
export async function POST(request) {
  try {
    const userRole = request.headers.get("x-user-type");
    if (userRole !== 'admin') {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { name, email, password, rol } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const [existing] = await pool.execute(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: "El email ya existe" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await pool.execute(
      "INSERT INTO users (name, email, password, rol, is_admin, baneado, faltas) VALUES (?, ?, ?, ?, 0, 0, 0)",
      [name, email, hashedPassword, rol || null]
    );

    return NextResponse.json({ message: "Usuario creado exitosamente" }, { status: 201 });

  } catch (error) {
    console.error("Error API Users POST:", error);
    return NextResponse.json({ error: "Error interno: " + error.message }, { status: 500 });
  }
}
