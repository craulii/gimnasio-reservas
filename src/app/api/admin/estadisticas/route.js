import pool from "../../../lib/db";

export async function GET(request) {
  const userHeader = request.headers.get("x-user");
  if (!userHeader) return new Response("No autorizado", { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== "admin") return new Response("Solo admin", { status: 403 });

  const { searchParams } = new URL(request.url);
  const fechaInicio = searchParams.get("fechaInicio");
  const fechaFin = searchParams.get("fechaFin");

  try {
    console.log("=== CARGANDO ESTADÍSTICAS ===");
    console.log("Fecha inicio:", fechaInicio);
    console.log("Fecha fin:", fechaFin);

    // ========================================
    // QUERY 1: ESTADÍSTICAS POR BLOQUE
    // ========================================
    let queryBloques = `
      SELECT 
        bloque_horario,
        COUNT(*) as total_reservas,
        COALESCE(SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END), 0) as total_asistencias,
        ROUND(
          (COALESCE(SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END), 0) / COUNT(*)) * 100, 
          2
        ) as porcentaje_asistencia
      FROM reservas 
      WHERE 1=1
    `;

    const params = [];
    if (fechaInicio && fechaFin) {
      queryBloques += " AND fecha BETWEEN ? AND ?";
      params.push(fechaInicio, fechaFin);
    } else {
      queryBloques += " AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    }

    queryBloques += " GROUP BY bloque_horario ORDER BY bloque_horario";

    console.log("Query bloques:", queryBloques);

    const [estadisticasBloques] = await pool.query(queryBloques, params);
    console.log("Estadísticas por bloque:", estadisticasBloques);

    // ========================================
    // QUERY 2: ESTADÍSTICAS POR SEDE
    // ========================================
    let querySedes = `
      SELECT 
        sede,
        COUNT(*) as total_reservas,
        COALESCE(SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END), 0) as total_asistencias,
        ROUND(
          (COALESCE(SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END), 0) / COUNT(*)) * 100, 
          2
        ) as porcentaje_asistencia
      FROM reservas 
      WHERE 1=1
    `;

    const paramsSedes = [];
    if (fechaInicio && fechaFin) {
      querySedes += " AND fecha BETWEEN ? AND ?";
      paramsSedes.push(fechaInicio, fechaFin);
    } else {
      querySedes += " AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    }

    querySedes += " GROUP BY sede ORDER BY sede";

    const [estadisticasSedes] = await pool.query(querySedes, paramsSedes);
    console.log("Estadísticas por sede:", estadisticasSedes);

    // ========================================
    // QUERY 3: RESUMEN GENERAL
    // ========================================
    let queryResumen = `
      SELECT 
        COUNT(DISTINCT email) as usuarios_unicos,
        COUNT(*) as total_reservas,
        COALESCE(SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END), 0) as total_asistencias,
        ROUND(
          (COALESCE(SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END), 0) / COUNT(*)) * 100, 
          2
        ) as porcentaje_asistencia
      FROM reservas
      WHERE 1=1
    `;

    const paramsResumen = [];
    if (fechaInicio && fechaFin) {
      queryResumen += " AND fecha BETWEEN ? AND ?";
      paramsResumen.push(fechaInicio, fechaFin);
    } else {
      queryResumen += " AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    }

    const [resumen] = await pool.query(queryResumen, paramsResumen);
    console.log("Resumen obtenido:", resumen[0]);

    // ========================================
    // CONSTRUIR RESPUESTA CON NOMBRES CORRECTOS
    // ========================================
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

    console.log("RESULTADO FINAL:", JSON.stringify(resultado, null, 2));
    console.log("=== FIN ESTADÍSTICAS ===");

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error completo en estadísticas:", error);
    return new Response(
      JSON.stringify({
        error: "Error interno",
        message: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
