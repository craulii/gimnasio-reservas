import pool from "../../lib/db";

export async function POST(request) {
  try {
    const { name, email, password, confirmPassword } = await request.json();

    if (!name || !email || !password || !confirmPassword) {
      return new Response("Todos los campos son obligatorios", { status: 400 });
    }

    if (password !== confirmPassword) {
      return new Response("Las contraseñas no coinciden", { status: 400 });
    }

    if (password.length < 6) {
      return new Response("La contraseña debe tener al menos 6 caracteres", {
        status: 400,
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response("Email inválido", { status: 400 });
    }

    const [existingUser] = await pool.query(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return new Response("Este email ya está registrado", { status: 409 });
    }

    await pool.query(
      "INSERT INTO users (rol, name, email, password, is_admin) VALUES (?, ?, ?, ?, ?)",
      ["alumno", name.trim(), email.toLowerCase().trim(), password, 0]
    );

    console.log(`[REGISTER] Usuario creado: ${name} (${email})`);

    return new Response(
      JSON.stringify({
        message: "Usuario creado exitosamente",
        user: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          rol: "alumno",
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[REGISTER] Error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return new Response("Este email ya está registrado", { status: 409 });
    }

    return new Response("Error interno del servidor", { status: 500 });
  }
}
