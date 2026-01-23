import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { normalizarRut, validarRut } from "@/lib/rut";
const dbConfig = {
  host: '127.0.0.1',
  user: 'reservas_crauli',
  password: 'CrauliChris69!',
  database: 'reservas_gymusm',
  port: 3306
};

// --- GET: OBTENER USUARIOS ---
export async function GET(request) {
  let connection;
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

    connection = await mysql.createConnection(dbConfig);

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

    const [users] = await connection.execute(query, params);

    return NextResponse.json(users);

  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

// --- PUT: ACTUALIZAR USUARIO ---
export async function PUT(request) {
  let connection;
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

    connection = await mysql.createConnection(dbConfig);

    console.log(`[ADMIN] Actualizando usuario: ${email}`);

    // Verificar que el usuario existe
    const [existingUser] = await connection.execute("SELECT email FROM users WHERE email = ?", [email]);
    if (existingUser.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Si va a cambiar el email, verificar duplicados
    if (newEmail && newEmail !== email) {
      const [duplicateCheck] = await connection.execute(
        "SELECT email FROM users WHERE email = ?",
        [newEmail.toLowerCase().trim()]
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
      // Verificar duplicado
      const [dupRut] = await connection.execute(
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
      // Regex opcional, si quieres validarlo estricto descomenta:
      // const ROL_REGEX = /^\d{9}-\d{1}$/;
      // if (!ROL_REGEX.test(rol.trim())) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
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

    // Actualizar Password (Directo)
    if (password && password.trim() !== "") {
      // Nota: Si usas bcrypt, aquí deberías hashearlo. 
      // Si tu sistema guarda texto plano (no recomendado pero funcional), déjalo así.
      updateParts.push("password = ?");
      updateParams.push(password);
    }

    // Ejecutar Update
    const updateQuery = `UPDATE users SET ${updateParts.join(", ")} WHERE email = ?`;
    updateParams.push(email);

    await connection.execute(updateQuery, updateParams);

    // Si cambió el email, actualizar referencias en reservas
    if (changedEmail) {
      await connection.execute("UPDATE reservas SET email = ? WHERE email = ?", [changedEmail, email]);
    }

    return NextResponse.json({
      message: "Usuario actualizado exitosamente",
      updatedEmail: changedEmail || email,
    });

  } catch (error) {
    console.error("Error actualizando usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

// --- DELETE: ELIMINAR USUARIO ---
export async function DELETE(request) {
  let connection;
  try {
    // 1. SEGURIDAD
    const userRole = request.headers.get("x-user-type");
    const adminEmail = request.headers.get("x-user"); // Quien ejecuta la acción

    if (userRole !== 'admin') {
      return NextResponse.json({ error: "Solo admin" }, { status: 403 });
    }

    const { email } = await request.json(); // Email a eliminar

    if (!email) {
      return NextResponse.json({ error: "Email es obligatorio" }, { status: 400 });
    }

    connection = await mysql.createConnection(dbConfig);

    const [existingUser] = await connection.execute(
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
    if (connection) await connection.end();
  }
}