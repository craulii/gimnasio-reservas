import pool from "../../../lib/db";

export async function GET(request) {
  const userHeader = request.headers.get("x-user");
  if (!userHeader) return new Response("No autorizado", { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== "admin") return new Response("Solo admin", { status: 403 });

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const fechaInicio = searchParams.get("fechaInicio");
  const fechaFin = searchParams.get("fechaFin");

  if (!email) {
    return new Response("Email del alumno requerido", { status: 400 });
  }

  try {
    console.log("=== ESTADÍSTICAS DE ALUMNO ===");
    console.log("Email:", email);
    console.log("Rango:", fechaInicio, "a", fechaFin);

    const [alumnoInfo] = await pool.query(
      "SELECT name, email FROM users WHERE email = ? AND is_admin = 0",
      [email]
    );

    if (alumnoInfo.length === 0) {
      return new Response("Alumno no encontrado", { status: 404 });
    }

    let fechaCondicion = "1=1";
    let fechaParams = [email];

    if (fechaInicio && fechaFin) {
      fechaCondicion = "fecha BETWEEN ? AND ?";
      fechaParams = [email, fechaInicio, fechaFin];
    } else {
      fechaCondicion = "fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    }

    const [estadisticasGenerales] = await pool.query(
      `
      SELECT 
        COUNT(*) as total_reservas,
        SUM(asistio) as total_asistencias,
        ROUND((SUM(asistio) / COUNT(*)) * 100, 2) as porcentaje_asistencia,
        MIN(fecha) as primera_reserva,
        MAX(fecha) as ultima_reserva,
        COUNT(DISTINCT fecha) as dias_activos
      FROM reservas 
      WHERE email = ? AND ${fechaCondicion}
    `,
      fechaParams
    );

    const [reservasPorBloque] = await pool.query(
      `
      SELECT 
        bloque_horario,
        COUNT(*) as total_reservas,
        SUM(asistio) as asistencias,
        ROUND((SUM(asistio) / COUNT(*)) * 100, 2) as porcentaje_asistencia
      FROM reservas 
      WHERE email = ? AND ${fechaCondicion}
      GROUP BY bloque_horario
      ORDER BY total_reservas DESC
    `,
      fechaParams
    );

    const [diasFaltados] = await pool.query(
      `
      SELECT fecha, bloque_horario
      FROM reservas 
      WHERE email = ? AND asistio = 0 AND ${fechaCondicion}
      ORDER BY fecha DESC
    `,
      fechaParams
    );

    const [historialDiario] = await pool.query(
      `
      SELECT 
        fecha,
        COUNT(*) as reservas_dia,
        SUM(asistio) as asistencias_dia,
        ROUND((SUM(asistio) / COUNT(*)) * 100, 2) as porcentaje_dia
      FROM reservas 
      WHERE email = ? AND ${fechaCondicion}
      GROUP BY fecha
      ORDER BY fecha DESC
    `,
      fechaParams
    );

    const [promedioGeneral] = await pool.query(
      `
      SELECT 
        ROUND(AVG(porcentaje_asistencia), 2) as promedio_general
      FROM (
        SELECT 
          email,
          ROUND((SUM(asistio) / COUNT(*)) * 100, 2) as porcentaje_asistencia
        FROM reservas 
        WHERE ${fechaCondicion.replace("email = ? AND ", "")}
        GROUP BY email
      ) AS promedios
    `,
      fechaParams.slice(1)
    );

    const resultado = {
      alumno: alumnoInfo[0],
      estadisticasGenerales: estadisticasGenerales[0],
      reservasPorBloque,
      diasFaltados,
      historialDiario,
      promedioGeneral: promedioGeneral[0]?.promedio_general || 0,
    };

    console.log("Resultado estadísticas alumno:", resultado);

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error en estadísticas alumno:", error);
    return new Response(
      JSON.stringify({
        error: "Error interno",
        message: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
