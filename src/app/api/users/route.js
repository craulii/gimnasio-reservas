import pool from "../../lib/db";

export async function GET() {
  try {
    const [users] = await pool.query("SELECT id, name, email, rol FROM users");
    return new Response(JSON.stringify(users), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response("Error interno", { status: 500 });
  }
}

export async function POST(request) {
  const { name, email, password, rol } = await request.json();
  if (!name || !email || !password || !rol) {
    return new Response("Faltan datos", { status: 400 });
  }

  try {
    await pool.query(
      "INSERT INTO users (name, email, password, rol) VALUES (?, ?, ?, ?)",
      [name, email, password, rol]
    );
    return new Response("Usuario creado", { status: 201 });
  } catch (error) {
    return new Response("Error interno", { status: 500 });
  }
}
