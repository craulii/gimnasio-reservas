import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { normalizarRut, validarRut } from "@/lib/rut";
import pool from "@/lib/db";

const USM_EMAIL_REGEX = /^[^\s@]+@usm\.cl$/i;

// --- GET: OBTENER USUARIOS ---
export async function GET(request) {
  try {
    // 1. SEGURIDAD
    const userRole = request.headers.get("x-user-type");
    const adminEmail = request.headers.get("x-user");

    if (!adminEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const tipo = searchParams.get("tipo") || "todos";

    let query = `
      SELECT rol, rut, name, email, is_admin, faltas, baneado,
        (SELECT COUNT(*) FROM reservas WHERE email = users.email) as total_reservas,
        (SELECT COUNT(*) FROM reservas WHERE email = users.email AND asistio = 1) as total_asistencias
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (tipo === "alumnos") {
      query += " AND is_admin = 0";
    } else if (tipo === "admins") {
      query += " AND is_admin = 1";
    }

    if (search) {
      query += " AND (name LIKE ? OR email LIKE ? OR rut LIKE ? OR rol LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += " ORDER BY name ASC LIMIT 500";

    const [users] = await pool.execute(query, params);

    return NextResponse.json(users);

  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// --- PUT: ACTUALIZAR USUARIO ---
export async function PUT(request) {
  try {
    // 1. SEGURIDAD
    const userRole = request.headers.get("x-user-type");
    if (userRole !== 'admin') {
      return NextResponse.json({ error: "Solo admin" }, { status: 403 });
    }

    const { email, name, newEmail, password, isAdmin, rut, rol } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: "Email y nombre son obligatorios" }, { status: 400 });
    }

    console.log(`[ADMIN] Actualizando usuario: ${email}`);

    // Verificar que el usuario existe
    const [existingUser] = await pool.execute("SELECT email FROM users WHERE email = ?", [email]);
    if (existingUser.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Issue #10 fix: Validar email @usm.cl al editar
    if (newEmail && newEmail !== email) {
      const normalizedNewEmail = newEmail.toLowerCase().trim();
      if (!USM_EMAIL_REGEX.test(normalizedNewEmail)) {
        return NextResponse.json({ error: "Email debe ser @usm.cl" }, { status: 400 });
      }
      const [duplicateCheck] = await pool.execute(
        "SELECT email FROM users WHERE email = ?",
        [normalizedNewEmail]
      );
      if (duplicateCheck.length > 0) {
        return NextResponse.json({ error: "El nuevo email ya está en uso" }, { status: 409 });
      }
    }

    // Construir query dinámico
    let updateParts = ["name = ?", "is_admin = ?"];
    let updateParams = [name.trim(), isAdmin ? 1 : 0];

    // Actualizar RUT
    if (typeof rut === "string" && rut.trim() !== "") {
      const rutNorm = normalizarRut(rut);
      if (!validarRut(rutNorm)) {
        return NextResponse.json({ error: "RUT inválido" }, { status: 400 });
      }
      const [dupRut] = await pool.execute(
        "SELECT email FROM users WHERE rut = ? AND email <> ?",
        [rutNorm, email]
      );
      if (dupRut.length > 0) {
        return NextResponse.json({ error: "RUT ya registrado por otro usuario" }, { status: 409 });
      }
      updateParts.push("rut = ?");
      updateParams.push(rutNorm);
    }

    // Actualizar Rol Institucional
    if (typeof rol === "string" && rol.trim() !== "") {
      updateParts.push("rol = ?");
      updateParams.push(rol.trim());
    }

    // Actualizar Email
    let changedEmail = null;
    if (newEmail && newEmail !== email) {
      updateParts.push("email = ?");
      changedEmail = newEmail.toLowerCase().trim();
      updateParams.push(changedEmail);
    }

    // Issue #2 fix: Hash password antes de guardar
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 12);
      updateParts.push("password = ?");
      updateParams.push(hashedPassword);
    }

    // Ejecutar Update
    const updateQuery = `UPDATE users SET ${updateParts.join(", ")} WHERE email = ?`;
    updateParams.push(email);

    await pool.execute(updateQuery, updateParams);

    // Si cambió el email, actualizar referencias en reservas
    if (changedEmail) {
      await pool.execute("UPDATE reservas SET email = ? WHERE email = ?", [changedEmail, email]);
    }

    return NextResponse.json({
      message: "Usuario actualizado exitosamente",
      updatedEmail: changedEmail || email,
    });

  } catch (error) {
    console.error("Error actualizando usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// --- DELETE: ELIMINAR USUARIO ---
export async function DELETE(request) {
  let connection;
  try {
    // 1. SEGURIDAD
    const userRole = request.headers.get("x-user-type");
    const adminEmail = request.headers.get("x-user");

    if (userRole !== 'admin') {
      return NextResponse.json({ error: "Solo admin" }, { status: 403 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email es obligatorio" }, { status: 400 });
    }

    const [existingUser] = await pool.execute(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (email === adminEmail) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
    }

    // Transacción para borrar todo limpio
    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [reservasResult] = await connection.execute("DELETE FROM reservas WHERE email = ?", [email]);
      const [userResult] = await connection.execute("DELETE FROM users WHERE email = ?", [email]);

      await connection.commit();

      console.log(`[ADMIN] Usuario eliminado: ${email}`);

      return NextResponse.json({
        message: `Usuario ${email} eliminado exitosamente`,
        reservasEliminadas: reservasResult.affectedRows,
      });

    } catch (err) {
      await connection.rollback();
      throw err;
    }

  } catch (error) {
    console.error("Error eliminando usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
