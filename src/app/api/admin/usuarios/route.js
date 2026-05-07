import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { normalizarRut, validarRut } from "@/lib/rut";
import pool from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

const USM_EMAIL_REGEX = /^[^\s@]+@(usm\.cl|sansano\.usm\.cl)$/i;

// --- GET: OBTENER USUARIOS ---
export async function GET(request) {
  try {
    // 1. SEGURIDAD
    const { email: adminEmail, userType: userRole } = await getUserFromRequest(request);

    if (!adminEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const tipo = searchParams.get("tipo") || "todos";

    let query = `
      SELECT u.rol, u.rut, u.name, u.email, u.is_admin, u.faltas, u.baneado,
        COALESCE(r.total_reservas, 0) as total_reservas,
        COALESCE(r.total_asistencias, 0) as total_asistencias
      FROM users u
      LEFT JOIN (
        SELECT email,
          COUNT(*) as total_reservas,
          SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END) as total_asistencias
        FROM reservas GROUP BY email
      ) r ON u.email = r.email
      WHERE 1=1
    `;
    const params = [];

    if (tipo === "alumnos") {
      query += " AND u.is_admin = 0";
    } else if (tipo === "admins") {
      query += " AND u.is_admin = 1";
    }

    if (search) {
      query += " AND (u.name LIKE ? OR u.email LIKE ? OR u.rut LIKE ? OR u.rol LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += " ORDER BY u.name ASC LIMIT 500";

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
    const { userType: userRole } = await getUserFromRequest(request);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: "Solo admin" }, { status: 403 });
    }

    const { email, name, newEmail, password, isAdmin, rut, rol, faltas, baneado, resetDate } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email es obligatorio" }, { status: 400 });
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
        return NextResponse.json({ error: "Email debe ser @usm.cl o @sansano.usm.cl" }, { status: 400 });
      }
      const [duplicateCheck] = await pool.execute(
        "SELECT email FROM users WHERE email = ?",
        [normalizedNewEmail]
      );
      if (duplicateCheck.length > 0) {
        return NextResponse.json({ error: "El nuevo email ya está en uso" }, { status: 409 });
      }
    }

    // Construir query dinámico (name e is_admin son opcionales para updates parciales como desbanear)
    let updateParts = [];
    let updateParams = [];

    if (name) {
      updateParts.push("name = ?");
      updateParams.push(name.trim());
    }
    if (typeof isAdmin !== "undefined") {
      updateParts.push("is_admin = ?");
      updateParams.push(isAdmin ? 1 : 0);
    }

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

    // Actualizar Faltas (auto-sincroniza baneado si no se envía explícitamente, evita estado inconsistente)
    if (typeof faltas === "number" && faltas >= 0) {
      const faltasNorm = Math.floor(faltas);
      updateParts.push("faltas = ?");
      updateParams.push(faltasNorm);
      if (typeof baneado === "undefined") {
        updateParts.push("baneado = ?");
        updateParams.push(faltasNorm >= 3 ? 1 : 0);
      }
    }

    // Actualizar Baneado (explícito tiene precedencia sobre auto-sync)
    if (typeof baneado !== "undefined") {
      updateParts.push("baneado = ?");
      updateParams.push(baneado ? 1 : 0);
    }

    // Al desbanear, resetear la fecha de conteo para que el cron no re-cuente ausencias antiguas
    if (resetDate) {
      updateParts.push("ultimo_reset_faltas = NOW()");
    }

    if (updateParts.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
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

// --- PATCH: BORRAR FALTA INDIVIDUAL ---
export async function PATCH(request) {
  let connection;
  try {
    const { userType: userRole } = await getUserFromRequest(request);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: "Solo admin" }, { status: 403 });
    }

    const { email, reservaId } = await request.json();
    if (!email || !reservaId) {
      return NextResponse.json({ error: "Email y reservaId son obligatorios" }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Verificar que la reserva existe, pertenece al email, y es una falta
      const [reservaRows] = await connection.execute(
        "SELECT id, asistio FROM reservas WHERE id = ? AND email = ? LIMIT 1",
        [reservaId, email]
      );

      if (reservaRows.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: "Reserva no encontrada para este usuario" }, { status: 404 });
      }

      const reserva = reservaRows[0];
      if (reserva.asistio !== 0 && reserva.asistio !== 2) {
        await connection.rollback();
        return NextResponse.json({ error: "Esta reserva no es una falta" }, { status: 400 });
      }

      // Cambiar asistio a 1 (presente)
      await connection.execute(
        "UPDATE reservas SET asistio = 1 WHERE id = ?",
        [reservaId]
      );

      // Decrementar faltas (mínimo 0) y auto-desbanear si < 3
      await connection.execute(
        "UPDATE users SET faltas = GREATEST(faltas - 1, 0), baneado = CASE WHEN GREATEST(faltas - 1, 0) < 3 THEN 0 ELSE baneado END WHERE email = ?",
        [email]
      );

      await connection.commit();

      // Obtener usuario actualizado
      const [updatedUser] = await pool.execute(
        "SELECT email, name, faltas, baneado FROM users WHERE email = ? LIMIT 1",
        [email]
      );

      console.log(`[ADMIN] Falta eliminada: reserva ${reservaId} de ${email}`);

      return NextResponse.json({
        message: "Falta eliminada correctamente",
        usuario: updatedUser[0]
      });

    } catch (err) {
      await connection.rollback();
      throw err;
    }

  } catch (error) {
    console.error("Error eliminando falta:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// --- DELETE: ELIMINAR USUARIO ---
export async function DELETE(request) {
  let connection;
  try {
    // 1. SEGURIDAD
    const { email: adminEmail, userType: userRole } = await getUserFromRequest(request);

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
