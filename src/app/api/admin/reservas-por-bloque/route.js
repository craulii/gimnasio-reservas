import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getFechaChile } from "@/app/utils/constants";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request) {
  try {
    // 1. SEGURIDAD
    const { email: userEmail, userType: userRole } = getUserFromRequest(request);

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Issue #3 fix: Agregar filtro por sede
    const { searchParams } = new URL(request.url);
    const sede = searchParams.get("sede");

    console.log("=== CARGANDO RESERVAS DE HOY (ADMIN) ===");

    // 2. QUERY: Traer reservas de hoy con datos del usuario
    let query = `
      SELECT
        r.bloque_horario,
        r.sede,
        r.fecha,
        u.name,
        u.rol,
        r.email,
        r.asistio
      FROM reservas r
      LEFT JOIN users u ON r.email = u.email
      WHERE r.fecha = ?
    `;
    const params = [getFechaChile()];

    if (sede) {
      query += " AND r.sede = ?";
      params.push(sede);
    }

    query += " ORDER BY r.sede, r.bloque_horario, u.name";

    const [rows] = await pool.execute(query, params);

    console.log(`Reservas encontradas: ${rows.length}`);

    // 3. Agrupar resultados por bloque_horario para el frontend
    const agrupado = {};
    for (const row of rows) {
      const key = row.bloque_horario;
      if (!agrupado[key]) agrupado[key] = [];
      agrupado[key].push({
        nombre: row.name,
        email: row.email,
        rol: row.rol,
        sede: row.sede,
        asistio: row.asistio,
        fecha: row.fecha
      });
    }

    return NextResponse.json(agrupado);

  } catch (error) {
    console.error("Error en reservas-por-bloque:", error);
    return NextResponse.json({
        error: "Error interno",
        message: error.message
    }, { status: 500 });
  }
}
