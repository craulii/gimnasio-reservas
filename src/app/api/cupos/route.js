import pool from "../../lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query(
      "SELECT bloque, total, reservados FROM cupos"
    );

    const cupos = {};
    for (const row of rows) {
      cupos[row.bloque] = {
        total: row.total,
        reservados: row.reservados,
        disponibles: row.total - row.reservados,
      };
    }

    return new Response(JSON.stringify(cupos), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response("Error al obtener cupos", { status: 500 });
  }
}

export async function PATCH(request) {
  const userHeader = request.headers.get("x-user");
  if (!userHeader) return new Response("No autorizado", { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== "admin")
    return new Response("Solo admin puede modificar cupos", { status: 403 });

  const { bloque, cantidad } = await request.json();
  if (!bloque || typeof cantidad !== "number") {
    return new Response("Datos inválidos", { status: 400 });
  }

  try {
    const [rows] = await pool.query(
      "SELECT total, reservados FROM cupos WHERE bloque = ?",
      [bloque]
    );

    if (rows.length === 0) {
      return new Response("Bloque no encontrado", { status: 404 });
    }

    let nuevoTotal = rows[0].total + cantidad;
    if (nuevoTotal < 0) nuevoTotal = 0;

    if (nuevoTotal < rows[0].reservados) {
      return new Response(
        `No se puede reducir a ${nuevoTotal}. Hay ${rows[0].reservados} reservas activas.`,
        { status: 400 }
      );
    }

    await pool.query("UPDATE cupos SET total = ? WHERE bloque = ?", [
      nuevoTotal,
      bloque,
    ]);

    const [allRows] = await pool.query(
      "SELECT bloque, total, reservados FROM cupos"
    );
    const cupos = {};
    for (const row of allRows) {
      cupos[row.bloque] = {
        total: row.total,
        reservados: row.reservados,
        disponibles: row.total - row.reservados,
      };
    }

    return new Response(
      JSON.stringify({ message: "Cupos actualizados", cupos }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response("Error actualizando cupos", { status: 500 });
  }
}
