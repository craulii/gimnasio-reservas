import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request) {
  try {
    const userRole = request.headers.get("x-user-type");
    const userEmail = request.headers.get("x-user");

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const bloque = searchParams.get("bloque");
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");

    if (!bloque) {
      return NextResponse.json({ error: "Bloque requerido" }, { status: 400 });
    }

    // CONSTRUCCIÓN DE FILTROS
    let dateCondition = "";
    let dateParams = [bloque];

    if (fechaInicio && fechaFin) {
      dateCondition = "AND fecha BETWEEN ? AND ?";
      dateParams.push(fechaInicio, fechaFin);
    } else {
      dateCondition = "AND fecha >= CURRENT_DATE - INTERVAL '30 days'";
    }

    // QUERY 1: GENERALES
    const [estadisticasGenerales] = await pool.execute(
      `SELECT
        COUNT(*) as total_reservas,
        COALESCE(SUM(asistio), 0) as total_asistencias,
        CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(asistio) / COUNT(*)) * 100, 2) ELSE 0 END as porcentaje_asistencia,
        COUNT(DISTINCT email) as alumnos_unicos,
        COUNT(DISTINCT fecha) as dias_activos,
        CASE WHEN COUNT(DISTINCT fecha) > 0 THEN ROUND(COUNT(*) / COUNT(DISTINCT fecha), 2) ELSE 0 END as promedio_reservas_por_dia,
        MIN(fecha) as primera_fecha,
        MAX(fecha) as ultima_fecha
      FROM reservas
      WHERE bloque_horario = ? ${dateCondition}`,
      dateParams
    );

    // QUERY 2: POR DÍA
    const [datosPorDia] = await pool.execute(
      `SELECT
        fecha,
        COUNT(*) as reservas,
        COALESCE(SUM(asistio), 0) as asistencias,
        CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(asistio) / COUNT(*)) * 100, 2) ELSE 0 END as porcentaje_asistencia,
        TRIM(TO_CHAR(fecha, 'Day')) as dia_semana
      FROM reservas
      WHERE bloque_horario = ? ${dateCondition}
      GROUP BY fecha
      ORDER BY fecha DESC
      LIMIT 30`,
      dateParams
    );

    // QUERY 3: ALUMNOS FRECUENTES
    const [alumnosFrecuentes] = await pool.execute(
      `SELECT
        u.name,
        r.email,
        COUNT(*) as veces_reservado,
        COALESCE(SUM(r.asistio), 0) as veces_asistido,
        CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(r.asistio) / COUNT(*)) * 100, 2) ELSE 0 END as porcentaje_asistencia
      FROM reservas r
      JOIN users u ON r.email = u.email
      WHERE r.bloque_horario = ? ${dateCondition}
      GROUP BY r.email, u.name
      ORDER BY veces_reservado DESC
      LIMIT 10`,
      dateParams
    );

    // QUERY 4: DÍA DE LA SEMANA
    const [estadisticasDiaSemana] = await pool.execute(
      `SELECT
        TRIM(TO_CHAR(fecha, 'Day')) as dia_semana,
        COUNT(*) as total_reservas,
        COALESCE(SUM(asistio), 0) as total_asistencias,
        CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(asistio) / COUNT(*)) * 100, 2) ELSE 0 END as porcentaje_asistencia,
        CASE WHEN COUNT(DISTINCT fecha) > 0 THEN ROUND(COUNT(*) / COUNT(DISTINCT fecha), 2) ELSE 0 END as promedio_por_dia
      FROM reservas
      WHERE bloque_horario = ? ${dateCondition}
      GROUP BY EXTRACT(DOW FROM fecha), TRIM(TO_CHAR(fecha, 'Day'))
      ORDER BY EXTRACT(DOW FROM fecha)`,
      dateParams
    );

    // QUERY 5: TENDENCIA RECIENTE
    const [tendenciaReciente] = await pool.execute(
      `SELECT
        fecha,
        COUNT(*) as reservas,
        COALESCE(SUM(asistio), 0) as asistencias,
        CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(asistio) / COUNT(*)) * 100, 2) ELSE 0 END as porcentaje_asistencia
      FROM reservas
      WHERE bloque_horario = ? AND fecha >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY fecha
      ORDER BY fecha`,
      [bloque]
    );

    const resultado = {
      bloque,
      estadisticasGenerales: estadisticasGenerales[0] || {},
      datosPorDia,
      alumnosFrecuentes,
      estadisticasDiaSemana,
      tendenciaReciente,
    };

    return NextResponse.json(resultado);

  } catch (error) {
    console.error("Error en estadísticas bloque:", error);
    return NextResponse.json({ error: "Error interno: " + error.message }, { status: 500 });
  }
}
