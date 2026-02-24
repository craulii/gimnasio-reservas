import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request) {
  try {
    const adminEmail = request.headers.get("x-user");
    const userRole = request.headers.get("x-user-type");

    if (!adminEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "Acceso denegado. Solo administradores." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetEmail = searchParams.get("email");
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");

    if (!targetEmail) {
      return NextResponse.json({ error: "Email del alumno requerido" }, { status: 400 });
    }

    // Verificar que el alumno existe
    const [alumnoInfo] = await pool.execute(
      "SELECT name, email, rol, faltas, baneado FROM users WHERE email = ? LIMIT 1",
      [targetEmail]
    );

    if (alumnoInfo.length === 0) {
      return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
    }

    // Construir Filtros de Fecha
    let dateCondition = "";
    let dateParams = [];

    let globalDateCondition = "";
    let globalDateParams = [];

    if (fechaInicio && fechaFin) {
      dateCondition = "AND fecha BETWEEN ? AND ?";
      dateParams = [fechaInicio, fechaFin];

      globalDateCondition = "WHERE fecha BETWEEN ? AND ?";
      globalDateParams = [fechaInicio, fechaFin];
    } else {
      dateCondition = "AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
      dateParams = [];

      globalDateCondition = "WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
      globalDateParams = [];
    }

    const queryParams = [targetEmail, ...dateParams];

    // A. ESTADÍSTICAS GENERALES
    const [estadisticasGenerales] = await pool.execute(
      `SELECT
        COUNT(*) as total_reservas,
        COALESCE(SUM(asistio), 0) as total_asistencias,
        CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(asistio) / COUNT(*)) * 100, 2) ELSE 0 END as porcentaje_asistencia,
        MIN(fecha) as primera_reserva,
        MAX(fecha) as ultima_reserva,
        COUNT(DISTINCT fecha) as dias_activos
      FROM reservas
      WHERE email = ? ${dateCondition}`,
      queryParams
    );

    // B. RESERVAS POR BLOQUE
    const [reservasPorBloque] = await pool.execute(
      `SELECT
        bloque_horario,
        COUNT(*) as total_reservas,
        COALESCE(SUM(asistio), 0) as asistencias,
        CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(asistio) / COUNT(*)) * 100, 2) ELSE 0 END as porcentaje_asistencia
      FROM reservas
      WHERE email = ? ${dateCondition}
      GROUP BY bloque_horario
      ORDER BY total_reservas DESC`,
      queryParams
    );

    // C. DÍAS FALTADOS
    const [diasFaltados] = await pool.execute(
      `SELECT fecha, bloque_horario, sede
      FROM reservas
      WHERE email = ? AND asistio = 0 ${dateCondition}
      ORDER BY fecha DESC`,
      queryParams
    );

    // D. HISTORIAL DIARIO
    const [historialDiario] = await pool.execute(
      `SELECT
        fecha,
        COUNT(*) as reservas_dia,
        COALESCE(SUM(asistio), 0) as asistencias_dia,
        CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(asistio) / COUNT(*)) * 100, 2) ELSE 0 END as porcentaje_dia
      FROM reservas
      WHERE email = ? ${dateCondition}
      GROUP BY fecha
      ORDER BY fecha DESC`,
      queryParams
    );

    // E. PROMEDIO GENERAL DEL GIMNASIO
    const [promedioGeneralRows] = await pool.execute(
      `SELECT
        ROUND(AVG(porc_usuario), 2) as promedio_general
      FROM (
        SELECT
          email,
          (SUM(asistio) / COUNT(*)) * 100 as porc_usuario
        FROM reservas
        ${globalDateCondition}
        GROUP BY email
      ) as subquery`,
      globalDateParams
    );

    const resultado = {
      alumno: alumnoInfo[0],
      estadisticasGenerales: estadisticasGenerales[0],
      reservasPorBloque,
      diasFaltados,
      historialDiario,
      promedioGeneral: promedioGeneralRows[0]?.promedio_general || 0,
    };

    return NextResponse.json(resultado);

  } catch (error) {
    console.error("Error en estadísticas alumno:", error);
    return NextResponse.json({ error: "Error interno: " + error.message }, { status: 500 });
  }
}
