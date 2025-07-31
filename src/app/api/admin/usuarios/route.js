import pool from "../../../lib/db";

export async function GET(request) {
  const userHeader = request.headers.get("x-user");
  if (!userHeader) return new Response("No autorizado", { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== "admin") return new Response("Solo admin", { status: 403 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const tipo = searchParams.get("tipo") || "todos";

  try {
    let query = `
      SELECT rol, name, email, is_admin,
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
      query += " AND (name LIKE ? OR email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY name";

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

  const { email, name, newEmail, password, isAdmin } = await request.json();

  if (!email || !name) {
    return new Response("Email y nombre son obligatorios", { status: 400 });
  }

  try {
    console.log(`[ADMIN] Actualizando usuario: ${email}`);

    const [existingUser] = await pool.query(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length === 0) {
      return new Response("Usuario no encontrado", { status: 404 });
    }

    if (newEmail && newEmail !== email) {
      const [duplicateCheck] = await pool.query(
        "SELECT email FROM users WHERE email = ?",
        [newEmail]
      );
      if (duplicateCheck.length > 0) {
        return new Response("El nuevo email ya está en uso", { status: 409 });
      }
    }

    let updateQuery = "UPDATE users SET name = ?, is_admin = ?";
    let updateParams = [name.trim(), isAdmin ? 1 : 0];

    if (newEmail && newEmail !== email) {
      updateQuery += ", email = ?";
      updateParams.push(newEmail.toLowerCase().trim());
    }

    if (password && password.trim() !== "") {
      updateQuery += ", password = ?";
      updateParams.push(password);
    }

    updateQuery += " WHERE email = ?";
    updateParams.push(email);

    await pool.query(updateQuery, updateParams);

    if (newEmail && newEmail !== email) {
      await pool.query("UPDATE reservas SET email = ? WHERE email = ?", [
        newEmail.toLowerCase().trim(),
        email,
      ]);
    }

    console.log(`[ADMIN] Usuario actualizado exitosamente: ${email}`);

    return new Response(
      JSON.stringify({
        message: "Usuario actualizado exitosamente",
        updatedEmail: newEmail || email,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
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
      return new Response("No puedes eliminar tu propia cuenta", {
        status: 400,
      });
    }

    await pool.query("BEGIN");

    const [reservasResult] = await pool.query(
      "DELETE FROM reservas WHERE email = ?",
      [email]
    );
    console.log(
      `[ADMIN] Eliminadas ${reservasResult.affectedRows} reservas del usuario`
    );

    const [userResult] = await pool.query("DELETE FROM users WHERE email = ?", [
      email,
    ]);

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
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error eliminando usuario:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}
