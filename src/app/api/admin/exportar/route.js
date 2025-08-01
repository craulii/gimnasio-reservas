import pool from '../../../lib/db';

export async function GET(request) {
  const userHeader = request.headers.get('x-user');
  if (!userHeader) return new Response('No autorizado', { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== 'admin') return new Response('Solo admin', { status: 403 });

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get('mes');
  const tipo = searchParams.get('tipo') || 'completo'; 

  try {
    console.log(`📤 [${new Date().toISOString()}] Exportando ${tipo} para ${mes || 'último mes'}`);

    let datos = [];
    let csvContent = '';
    let fileName = '';

    let fechaInicio, fechaFin;
    if (mes) {
      fechaInicio = `${mes}-01`;
      const [year, month] = mes.split('-');
      const ultimoDia = new Date(year, month, 0).getDate();
      fechaFin = `${mes}-${ultimoDia.toString().padStart(2, '0')}`;
      fileName = `gimnasio_${tipo}_${mes}.csv`;
    } else {
      const hoy = new Date();
      const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      
      fechaInicio = mesAnterior.toISOString().split('T')[0];
      fechaFin = ultimoDiaMesAnterior.toISOString().split('T')[0];
      fileName = `gimnasio_${tipo}_${mesAnterior.toISOString().slice(0, 7)}.csv`;
    }

    if (tipo === 'completo') {
      const [result] = await pool.query(`
        SELECT 
          c.fecha,
          c.bloque,
          c.total as cupos_totales,
          c.reservados as cupos_reservados,
          (c.total - c.reservados) as cupos_disponibles,
          COUNT(r.id) as reservas_realizadas,
          SUM(CASE WHEN r.asistio = 1 THEN 1 ELSE 0 END) as asistencias,
          ROUND(
            CASE 
              WHEN COUNT(r.id) > 0 THEN (SUM(CASE WHEN r.asistio = 1 THEN 1 ELSE 0 END) / COUNT(r.id)) * 100 
              ELSE 0 
            END, 2
          ) as porcentaje_asistencia,
          GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR '; ') as usuarios_reservaron
        FROM cupos c
        LEFT JOIN reservas r ON c.bloque = r.bloque_horario AND c.fecha = r.fecha
        LEFT JOIN users u ON r.email = u.email
        WHERE c.fecha BETWEEN ? AND ?
        GROUP BY c.fecha, c.bloque
        ORDER BY c.fecha, c.bloque
      `, [fechaInicio, fechaFin]);

      csvContent = 'fecha,bloque,cupos_totales,cupos_reservados,cupos_disponibles,reservas_realizadas,asistencias,porcentaje_asistencia,usuarios_reservaron\n';
      result.forEach(row => {
        csvContent += `${row.fecha.toISOString().split('T')[0]},${row.bloque},${row.cupos_totales},${row.cupos_reservados},${row.cupos_disponibles},${row.reservas_realizadas},${row.asistencias},${row.porcentaje_asistencia},"${row.usuarios_reservaron || ''}"\n`;
      });

    } else if (tipo === 'cupos') {
      const [result] = await pool.query(`
        SELECT fecha, bloque, total, reservados, (total - reservados) as disponibles
        FROM cupos 
        WHERE fecha BETWEEN ? AND ?
        ORDER BY fecha, bloque
      `, [fechaInicio, fechaFin]);

      csvContent = 'fecha,bloque,total,reservados,disponibles\n';
      result.forEach(row => {
        csvContent += `${row.fecha.toISOString().split('T')[0]},${row.bloque},${row.total},${row.reservados},${row.disponibles}\n`;
      });

    } else if (tipo === 'reservas') {
      const [result] = await pool.query(`
        SELECT 
          r.fecha,
          r.bloque_horario,
          u.name as nombre_usuario,
          r.email,
          CASE WHEN r.asistio = 1 THEN 'Presente' ELSE 'Ausente' END as asistencia,
          r.asistio
        FROM reservas r
        LEFT JOIN users u ON r.email = u.email
        WHERE r.fecha BETWEEN ? AND ?
        ORDER BY r.fecha, r.bloque_horario, u.name
      `, [fechaInicio, fechaFin]);

      csvContent = 'fecha,bloque_horario,nombre_usuario,email,asistencia,asistio_numerico\n';
      result.forEach(row => {
        csvContent += `${row.fecha.toISOString().split('T')[0]},${row.bloque_horario},"${row.nombre_usuario || 'Usuario eliminado'}",${row.email},${row.asistencia},${row.asistio}\n`;
      });
    }

    const csvWithBOM = '\uFEFF' + csvContent;
    
    console.log(`Exportación completada: ${fileName} (${csvContent.split('\n').length - 2} registros)`);

    return new Response(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error exportando datos:', error);
    return new Response(JSON.stringify({ 
      error: 'Error exportando datos',
      message: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  const userHeader = request.headers.get('x-user');
  if (!userHeader) return new Response('No autorizado', { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== 'admin') return new Response('Solo admin', { status: 403 });

  try {
    const [meses] = await pool.query(`
      SELECT 
        DATE_FORMAT(fecha, '%Y-%m') as mes,
        COUNT(DISTINCT fecha) as dias_con_datos,
        MIN(fecha) as fecha_inicio,
        MAX(fecha) as fecha_fin,
        COUNT(*) as total_registros_cupos,
        (SELECT COUNT(*) FROM reservas WHERE DATE_FORMAT(fecha, '%Y-%m') = DATE_FORMAT(c.fecha, '%Y-%m')) as total_reservas
      FROM cupos c
      WHERE fecha < DATE_FORMAT(CURDATE(), '%Y-%m-01') -- Solo meses completos pasados
      GROUP BY DATE_FORMAT(fecha, '%Y-%m')
      ORDER BY mes DESC
      LIMIT 12
    `);

    return new Response(JSON.stringify({
      meses_disponibles: meses,
      total_meses: meses.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error obteniendo meses disponibles:', error);
    return new Response('Error interno', { status: 500 });
  }
}