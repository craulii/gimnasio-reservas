import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

const dbConfig = {
  host: '127.0.0.1',
  user: 'reservas_crauli',
  password: 'CrauliChris69!',
  database: 'reservas_gymusm',
  port: 3306
};

export async function GET(request) {
  let connection;
  try {
    // 1. SEGURIDAD: Verificar headers del Middleware
    const adminEmail = request.headers.get("x-user");
    const userRole = request.headers.get("x-user-type");

    if (!adminEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "Acceso denegado. Solo administradores." }, { status: 403 });
    }

    // 2. Obtener parámetros de la URL
    const { searchParams } = new URL(request.url);
    const targetEmail = searchParams.get("email"); // El email del alumno que queremos investigar
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");

    if (!targetEmail) {
      return NextResponse.json({ error: "Email del alumno requerido" }, { status: 400 });
    }

    connection = await mysql.createConnection(dbConfig);

    // 3. Verificar que el alumno existe
    const [alumnoInfo] = await connection.execute(
      "SELECT name, email, rol, faltas, baneado FROM users WHERE email = ? LIMIT 1",
      [targetEmail]
    );

    if (alumnoInfo.length === 0) {
      return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
    }

    // 4. Construir Filtros de Fecha
    let dateCondition = "";
    let dateParams = [];
    
    // Filtro Global (para comparar con el promedio general del gym)
    let globalDateCondition = "";
    let globalDateParams = [];

    if (fechaInicio && fechaFin) {
      // Rango específico
      dateCondition = "AND fecha BETWEEN ? AND ?";
      dateParams = [fechaInicio, fechaFin];
      
      globalDateCondition = "WHERE fecha BETWEEN ? AND ?";
      globalDateParams = [fechaInicio, fechaFin];
    } else {
      // Últimos 30 días por defecto
      dateCondition = "AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
      dateParams = [];
      
      globalDateCondition = "WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
      globalDateParams = [];
    }

    // Parametros completos para las consultas del alumno: [email, fecha1?, fecha2?]
    const queryParams = [targetEmail, ...dateParams];

    // --- A. ESTADÍSTICAS GENERALES ---
    const [estadisticasGenerales] = await connection.execute(
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

    // --- B. RESERVAS POR BLOQUE ---
    const [reservasPorBloque] = await connection.execute(
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

    // --- C. DÍAS FALTADOS (Inasistencias) ---
    const [diasFaltados] = await connection.execute(
      `SELECT fecha, bloque_horario, sede
      FROM reservas 
      WHERE email = ? AND asistio = 0 ${dateCondition}
      ORDER BY fecha DESC`,
      queryParams
    );

    // --- D. HISTORIAL DIARIO ---
    const [historialDiario] = await connection.execute(
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

    // --- E. PROMEDIO GENERAL DEL GIMNASIO (Para comparar) ---
    // Calculamos el promedio de asistencia de TODOS los usuarios en ese rango de fechas
    const [promedioGeneralRows] = await connection.execute(
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
  } finally {
    if (connection) await connection.end();
  }
}