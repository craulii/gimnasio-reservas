import pool from '../../../lib/db';

export async function GET(request) {
  const userHeader = request.headers.get('x-user');
  if (!userHeader) return new Response('No autorizado', { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== 'admin') return new Response('Solo admin', { status: 403 });

  const { searchParams } = new URL(request.url);
  const fechaInicio = searchParams.get('fechaInicio');
  const fechaFin = searchParams.get('fechaFin');

  try {
    console.log('=== CARGANDO ESTADÍSTICAS ===');
    console.log('Fecha inicio:', fechaInicio);
    console.log('Fecha fin:', fechaFin);

    let queryBloques = `
      SELECT 
        bloque_horario,
        COUNT(*) as total_reservas,
        SUM(asistio) as total_asistencias,
        ROUND((SUM(asistio) / COUNT(*)) * 100, 2) as porcentaje_asistencia
      FROM reservas 
      WHERE 1=1
    `;
    
    const params = [];
    if (fechaInicio && fechaFin) {
      queryBloques += ' AND fecha BETWEEN ? AND ?';
      params.push(fechaInicio, fechaFin);
    } else {
      queryBloques += ' AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }
    
    queryBloques += ' GROUP BY bloque_horario ORDER BY bloque_horario';
    
    console.log('Query bloques:', queryBloques);
    console.log('Parámetros:', params);
    
    const [estadisticasBloques] = await pool.query(queryBloques, params);
    console.log('Estadísticas por bloque encontradas:', estadisticasBloques.length);

    let queryAlumnos = `
      SELECT 
        u.name,
        u.email,
        COUNT(r.id) as total_reservas,
        SUM(r.asistio) as total_asistencias,
        ROUND((SUM(r.asistio) / COUNT(r.id)) * 100, 2) as porcentaje_asistencia
      FROM users u
      LEFT JOIN reservas r ON u.email = r.email
      WHERE u.is_admin = 0
    `;
    
    const paramsAlumnos = [];
    if (fechaInicio && fechaFin) {
      queryAlumnos += ' AND (r.fecha IS NULL OR r.fecha BETWEEN ? AND ?)';
      paramsAlumnos.push(fechaInicio, fechaFin);
    } else {
      queryAlumnos += ' AND (r.fecha IS NULL OR r.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY))';
    }
    
    queryAlumnos += ' GROUP BY u.email ORDER BY total_reservas DESC';
    
    console.log('Query alumnos:', queryAlumnos);
    
    const [estadisticasAlumnos] = await pool.query(queryAlumnos, paramsAlumnos);
    console.log('Estadísticas de alumnos encontradas:', estadisticasAlumnos.length);

    let queryResumen = `
      SELECT 
        COUNT(DISTINCT email) as total_alumnos_activos,
        COUNT(*) as total_reservas,
        SUM(asistio) as total_asistencias,
        ROUND((SUM(asistio) / COUNT(*)) * 100, 2) as porcentaje_asistencia_general
      FROM reservas
      WHERE 1=1
    `;
    
    const paramsResumen = [];
    if (fechaInicio && fechaFin) {
      queryResumen += ' AND fecha BETWEEN ? AND ?';
      paramsResumen.push(fechaInicio, fechaFin);
    } else {
      queryResumen += ' AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }
    
    console.log('Query resumen:', queryResumen);
    
    const [resumen] = await pool.query(queryResumen, paramsResumen);
    console.log('Resumen obtenido:', resumen[0]);

    const resultado = {
      resumen: resumen[0] || { 
        total_alumnos_activos: 0, 
        total_reservas: 0, 
        total_asistencias: 0, 
        porcentaje_asistencia_general: 0 
      },
      estadisticasBloques: estadisticasBloques || [],
      estadisticasAlumnos: estadisticasAlumnos || []
    };

    console.log('RESULTADO FINAL:', resultado);
    console.log('=== FIN ESTADÍSTICAS ===');

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error completo en estadísticas:', error);
    return new Response(JSON.stringify({ 
      error: 'Error interno',
      message: error.message,
      stack: error.stack 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}