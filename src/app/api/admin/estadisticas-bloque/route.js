import pool from '../../../lib/db';

export async function GET(request) {
  const userHeader = request.headers.get('x-user');
  if (!userHeader) return new Response('No autorizado', { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== 'admin') return new Response('Solo admin', { status: 403 });

  const { searchParams } = new URL(request.url);
  const bloque = searchParams.get('bloque');
  const fechaInicio = searchParams.get('fechaInicio');
  const fechaFin = searchParams.get('fechaFin');

  if (!bloque) {
    return new Response('Bloque requerido', { status: 400 });
  }

  try {
    console.log('=== ESTADÍSTICAS DE BLOQUE ===');
    console.log('Bloque:', bloque);
    console.log('Rango:', fechaInicio, 'a', fechaFin);

    let fechaCondicion = '1=1';
    let fechaParams = [bloque];
    
    if (fechaInicio && fechaFin) {
      fechaCondicion = 'fecha BETWEEN ? AND ?';
      fechaParams = [bloque, fechaInicio, fechaFin];
    } else {
      fechaCondicion = 'fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }

    const [estadisticasGenerales] = await pool.query(`
      SELECT 
        COUNT(*) as total_reservas,
        SUM(asistio) as total_asistencias,
        ROUND((SUM(asistio) / COUNT(*)) * 100, 2) as porcentaje_asistencia,
        COUNT(DISTINCT email) as alumnos_unicos,
        COUNT(DISTINCT fecha) as dias_activos,
        ROUND(COUNT(*) / COUNT(DISTINCT fecha), 2) as promedio_reservas_por_dia,
        MIN(fecha) as primera_fecha,
        MAX(fecha) as ultima_fecha
      FROM reservas 
      WHERE bloque_horario = ? AND ${fechaCondicion}
    `, fechaParams);

    const [datosPorDia] = await pool.query(`
      SELECT 
        fecha,
        COUNT(*) as reservas,
        SUM(asistio) as asistencias,
        ROUND((SUM(asistio) / COUNT(*)) * 100, 2) as porcentaje_asistencia,
        DAYNAME(fecha) as dia_semana
      FROM reservas 
      WHERE bloque_horario = ? AND ${fechaCondicion}
      GROUP BY fecha
      ORDER BY fecha DESC
      LIMIT 30
    `, fechaParams);

    const [alumnosFrecuentes] = await pool.query(`
      SELECT 
        u.name,
        r.email,
        COUNT(*) as veces_reservado,
        SUM(r.asistio) as veces_asistido,
        ROUND((SUM(r.asistio) / COUNT(*)) * 100, 2) as porcentaje_asistencia
      FROM reservas r
      JOIN users u ON r.email = u.email
      WHERE r.bloque_horario = ? AND ${fechaCondicion}
      GROUP BY r.email
      ORDER BY veces_reservado DESC
      LIMIT 10
    `, fechaParams);

    const [estadisticasDiaSemana] = await pool.query(`
      SELECT 
        DAYNAME(fecha) as dia_semana,
        COUNT(*) as total_reservas,
        SUM(asistio) as total_asistencias,
        ROUND((SUM(asistio) / COUNT(*)) * 100, 2) as porcentaje_asistencia,
        ROUND(COUNT(*) / COUNT(DISTINCT fecha), 2) as promedio_por_dia
      FROM reservas 
      WHERE bloque_horario = ? AND ${fechaCondicion}
      GROUP BY DAYOFWEEK(fecha), DAYNAME(fecha)
      ORDER BY DAYOFWEEK(fecha)
    `, fechaParams);

    const [tendenciaReciente] = await pool.query(`
      SELECT 
        fecha,
        COUNT(*) as reservas,
        SUM(asistio) as asistencias,
        ROUND((SUM(asistio) / COUNT(*)) * 100, 2) as porcentaje_asistencia
      FROM reservas 
      WHERE bloque_horario = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY fecha
      ORDER BY fecha
    `, [bloque]);

    const resultado = {
      bloque,
      estadisticasGenerales: estadisticasGenerales[0],
      datosPorDia,
      alumnosFrecuentes,
      estadisticasDiaSemana,
      tendenciaReciente
    };

    console.log('Resultado estadísticas bloque:', resultado);

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error en estadísticas bloque:', error);
    return new Response(JSON.stringify({ 
      error: 'Error interno',
      message: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}