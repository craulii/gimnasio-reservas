import pool from "../../../lib/db";
import { normalizarRut, validarRut } from "../../../lib/rut";

export async function GET(request) {
  const userHeader = request.headers.get("x-user");
  if (!userHeader) return new Response("No autorizado", { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== "admin") return new Response("Solo admin", { status: 403 });

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();
  const tipo = searchParams.get("tipo") || "todos";

  try {
    let query = `
      SELECT rol, rut, name, email, is_admin,
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
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += " ORDER BY name ASC LIMIT 500";

    console.log("Query usuarios:", query);
    console.log("Parámetros:", params);

    const [users] = await pool.query(query, params);

    return new Response(JSON.stringify(users), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    return new Response("Error interno", { status: 500 });
  }
}

export async function PUT(request) {
  const userHeader = request.headers.get("x-user");
  if (!userHeader) return new Response("No autorizado", { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== "admin") return new Response("Solo admin", { status: 403 });

  const { email, name, newEmail, password, isAdmin, rut, rol } = await request.json();

  if (!email || !name) {
    return new Response("Email y nombre son obligatorios", { status: 400 });
  }

  try {
    console.log(`[ADMIN] Actualizando usuario: ${email}`);

    // Verificar que el usuario existe
    const [existingUser] = await pool.query("SELECT email FROM users WHERE email = ?", [email]);
    if (existingUser.length === 0) {
      return new Response("Usuario no encontrado", { status: 404 });
    }

    // Si va a cambiar el email, verificar que no esté en uso
    if (newEmail && newEmail !== email) {
      const [duplicateCheck] = await pool.query(
        "SELECT email FROM users WHERE email = ?",
        [newEmail.toLowerCase().trim()]
      );
      if (duplicateCheck.length > 0) {
        return new Response("El nuevo email ya está en uso", { status: 409 });
      }
    }

    // Construir query dinámico
    let updateParts = ["name = ?", "is_admin = ?"];
    let updateParams = [name.trim(), isAdmin ? 1 : 0];

    // Actualizar RUT si se proporciona
    if (typeof rut === "string" && rut.trim() !== "") {
      const rutNorm = normalizarRut(rut);
      if (!validarRut(rutNorm)) {
        return new Response("RUT inválido", { status: 400 });
      }
      // Verificar que no esté duplicado
      const [dupRut] = await pool.query(
        "SELECT email FROM users WHERE rut = ? AND email <> ?",
        [rutNorm, email]
      );
      if (dupRut.length > 0) {
        return new Response("RUT ya registrado por otro usuario", { status: 409 });
      }
      updateParts.push("rut = ?");
      updateParams.push(rutNorm);
    }

    // Actualizar rol institucional si se proporciona
    if (typeof rol === "string" && rol.trim() !== "") {
      const ROL_REGEX = /^\d{9}-\d{1}$/;
      if (!ROL_REGEX.test(rol.trim())) {
        return new Response("Rol institucional inválido", { status: 400 });
      }
      updateParts.push("rol = ?");
      updateParams.push(rol.trim());
    }

    // Actualizar email si cambió
    let changedEmail = null;
    if (newEmail && newEmail !== email) {
      updateParts.push("email = ?");
      changedEmail = newEmail.toLowerCase().trim();
      updateParams.push(changedEmail);
    }

    // Actualizar contraseña si se proporciona
    if (password && password.trim() !== "") {
      updateParts.push("password = ?");
      updateParams.push(password);
    }

    // Ejecutar update
    const updateQuery = `UPDATE users SET ${updateParts.join(", ")} WHERE email = ?`;
    updateParams.push(email);

    await pool.query(updateQuery, updateParams);

    // Si cambió el email, actualizar también en reservas
    if (changedEmail) {
      await pool.query("UPDATE reservas SET email = ? WHERE email = ?", [changedEmail, email]);
    }

    console.log(`[ADMIN] Usuario actualizado exitosamente: ${email}`);

    return new Response(
      JSON.stringify({
        message: "Usuario actualizado exitosamente",
        updatedEmail: changedEmail || email,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}

export async function DELETE(request) {
  const userHeader = request.headers.get("x-user");
  if (!userHeader) return new Response("No autorizado", { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== "admin") return new Response("Solo admin", { status: 403 });

  const { email } = await request.json();

  if (!email) {
    return new Response("Email es obligatorio", { status: 400 });
  }

  try {
    console.log(`[ADMIN] Eliminando usuario: ${email}`);

    const [existingUser] = await pool.query(
      "SELECT email, is_admin FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length === 0) {
      return new Response("Usuario no encontrado", { status: 404 });
    }

    if (email === user.email) {
      return new Response("No puedes eliminar tu propia cuenta", { status: 400 });
    }

    await pool.query("BEGIN");

    const [reservasResult] = await pool.query("DELETE FROM reservas WHERE email = ?", [email]);
    console.log(`[ADMIN] Eliminadas ${reservasResult.affectedRows} reservas del usuario`);

    const [userResult] = await pool.query("DELETE FROM users WHERE email = ?", [email]);

    await pool.query("COMMIT");

    if (userResult.affectedRows === 0) {
      return new Response("Usuario no encontrado", { status: 404 });
    }

    console.log(`[ADMIN] Usuario eliminado exitosamente: ${email}`);

    return new Response(
      JSON.stringify({
        message: `Usuario ${email} eliminado exitosamente`,
        reservasEliminadas: reservasResult.affectedRows,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error eliminando usuario:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}
