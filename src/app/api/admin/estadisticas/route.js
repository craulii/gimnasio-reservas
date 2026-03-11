import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request) {
  try {
    const { email: userEmail, userType: userRole } = await getUserFromRequest(request);

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "Acceso denegado. Solo administradores." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");

    console.log("=== CARGANDO ESTADÍSTICAS AVANZADAS ===");
    console.log("Rango:", fechaInicio, "a", fechaFin);

    // QUERY 1: ESTADÍSTICAS POR BLOQUE
    let queryBloques = `
      SELECT
        bloque_horario,
        COUNT(*) as total_reservas,
        COALESCE(SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END), 0) as total_asistencias,
        CASE WHEN COUNT(*) > 0 THEN
            ROUND((COALESCE(SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END), 0) / COUNT(*)) * 100, 2)
        ELSE 0 END as porcentaje_asistencia
      FROM reservas
      WHERE 1=1
    `;

    const params = [];
    if (fechaInicio && fechaFin) {
      queryBloques += " AND fecha BETWEEN ? AND ?";
      params.push(fechaInicio, fechaFin);
    } else {
      queryBloques += " AND fecha >= CURRENT_DATE - INTERVAL '30 days'";
    }

    queryBloques += " GROUP BY bloque_horario ORDER BY bloque_horario";

    const [estadisticasBloques] = await pool.execute(queryBloques, params);

    // QUERY 2: ESTADÍSTICAS POR SEDE
    let querySedes = `
      SELECT
        sede,
        COUNT(*) as total_reservas,
        COALESCE(SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END), 0) as total_asistencias,
        CASE WHEN COUNT(*) > 0 THEN
            ROUND((COALESCE(SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END), 0) / COUNT(*)) * 100, 2)
        ELSE 0 END as porcentaje_asistencia
      FROM reservas
      WHERE 1=1
    `;

    const paramsSedes = [...params];
    if (fechaInicio && fechaFin) {
        querySedes += " AND fecha BETWEEN ? AND ?";
    } else {
        querySedes += " AND fecha >= CURRENT_DATE - INTERVAL '30 days'";
    }

    querySedes += " GROUP BY sede ORDER BY sede";

    const [estadisticasSedes] = await pool.execute(querySedes, paramsSedes);

    // QUERY 3: RESUMEN GENERAL
    let queryResumen = `
      SELECT
        COUNT(DISTINCT email) as usuarios_unicos,
        COUNT(*) as total_reservas,
        COALESCE(SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END), 0) as total_asistencias,
        CASE WHEN COUNT(*) > 0 THEN
            ROUND((COALESCE(SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END), 0) / COUNT(*)) * 100, 2)
        ELSE 0 END as porcentaje_asistencia
      FROM reservas
      WHERE 1=1
    `;

    if (fechaInicio && fechaFin) {
        queryResumen += " AND fecha BETWEEN ? AND ?";
    } else {
        queryResumen += " AND fecha >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const [resumen] = await pool.execute(queryResumen, params);

    const resultado = {
      resumen: resumen[0] || {
        usuarios_unicos: 0,
        total_reservas: 0,
        total_asistencias: 0,
        porcentaje_asistencia: 0,
      },
      por_bloque: estadisticasBloques || [],
      por_sede: estadisticasSedes || [],
    };

    return NextResponse.json(resultado);

  } catch (error) {
    console.error("Error completo en estadísticas:", error);
    return NextResponse.json({
        error: "Error interno",
        message: error.message
    }, { status: 500 });
  }
}
