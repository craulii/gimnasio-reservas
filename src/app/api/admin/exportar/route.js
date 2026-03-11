import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

// --- GET: EXPORTAR A CSV ---
export async function GET(request) {
  try {
    // 1. SEGURIDAD
    const { email: userEmail, userType: userRole } = await getUserFromRequest(request);

    if (!userEmail || userRole !== 'admin') {
      return new NextResponse('No autorizado', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const tipo = searchParams.get('tipo') || 'completo';

    console.log(`[EXPORTAR] Tipo: ${tipo}, Mes: ${mes || 'último mes'}`);

    // 2. Lógica de Fechas (Issue #18 fix: parse year/month as numbers)
    let fechaInicio, fechaFin;
    if (mes) {
      fechaInicio = `${mes}-01`;
      const [year, month] = mes.split('-').map(Number);
      const ultimoDia = new Date(year, month, 0).getDate();
      fechaFin = `${mes}-${ultimoDia.toString().padStart(2, '0')}`;
    } else {
      const hoy = new Date();
      fechaFin = hoy.toISOString().split('T')[0];
      const hace3Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 3, hoy.getDate());
      fechaInicio = hace3Meses.toISOString().split('T')[0];
    }

    let csvContent = '';
    let fileName = `gimnasio_${tipo}_${mes || 'reciente'}.csv`;

    // 3. Selección de Query según tipo
    if (tipo === 'completo') {
      const [result] = await pool.execute(`
        SELECT
          c.fecha,
          c.sede,
          c.bloque,
          c.total as cupos_totales,
          c.reservados as cupos_reservados,
          (c.total - c.reservados) as cupos_disponibles,
          COUNT(r.id) as reservas_realizadas,
          SUM(CASE WHEN r.asistio = 1 THEN 1 ELSE 0 END) as asistencias,
          SUM(CASE WHEN r.asistio = 0 THEN 1 ELSE 0 END) as inasistencias,
          CASE WHEN COUNT(r.id) > 0 THEN
            ROUND((SUM(CASE WHEN r.asistio = 1 THEN 1 ELSE 0 END) / COUNT(r.id)) * 100, 2)
          ELSE 0 END as porcentaje_asistencia,
          STRING_AGG(DISTINCT u.name, '; ' ORDER BY u.name) as usuarios_reservaron
        FROM cupos c
        LEFT JOIN reservas r ON c.bloque = r.bloque_horario AND c.fecha = r.fecha AND c.sede = r.sede
        LEFT JOIN users u ON r.email = u.email
        WHERE c.fecha BETWEEN ? AND ?
        GROUP BY c.fecha, c.sede, c.bloque, c.total, c.reservados
        ORDER BY c.fecha DESC, c.sede, c.bloque
      `, [fechaInicio, fechaFin]);

      csvContent = 'Fecha,Sede,Bloque,Cupos Totales,Cupos Reservados,Cupos Disponibles,Reservas Realizadas,Asistencias,Inasistencias,Porcentaje Asistencia,Usuarios\n';
      result.forEach(row => {
        const fechaStr = row.fecha instanceof Date ? row.fecha.toISOString().split('T')[0] : row.fecha;
        csvContent += `${fechaStr},${row.sede},${row.bloque},${row.cupos_totales},${row.cupos_reservados},${row.cupos_disponibles},${row.reservas_realizadas},${row.asistencias},${row.inasistencias},${row.porcentaje_asistencia},"${row.usuarios_reservaron || 'Sin reservas'}"\n`;
      });

    } else if (tipo === 'cupos') {
      const [result] = await pool.execute(`
        SELECT
          fecha,
          sede,
          bloque,
          total,
          reservados,
          (total - reservados) as disponibles,
          CASE WHEN total > 0 THEN ROUND((reservados / total) * 100, 2) ELSE 0 END as porcentaje_ocupacion
        FROM cupos
        WHERE fecha BETWEEN ? AND ?
        ORDER BY fecha DESC, sede, bloque
      `, [fechaInicio, fechaFin]);

      csvContent = 'Fecha,Sede,Bloque,Total,Reservados,Disponibles,Porcentaje Ocupacion\n';
      result.forEach(row => {
        const fechaStr = row.fecha instanceof Date ? row.fecha.toISOString().split('T')[0] : row.fecha;
        csvContent += `${fechaStr},${row.sede},${row.bloque},${row.total},${row.reservados},${row.disponibles},${row.porcentaje_ocupacion}\n`;
      });

    } else if (tipo === 'reservas') {
      const [result] = await pool.execute(`
        SELECT
          r.fecha,
          r.sede,
          r.bloque_horario,
          u.name as nombre_usuario,
          u.rol,
          r.email,
          CASE WHEN r.asistio = 1 THEN 'Presente' ELSE 'Ausente' END as estado_asistencia,
          r.asistio as asistio_numerico,
          r.created_at as fecha_reserva
        FROM reservas r
        LEFT JOIN users u ON r.email = u.email
        WHERE r.fecha BETWEEN ? AND ?
        ORDER BY r.fecha DESC, r.sede, r.bloque_horario, u.name
      `, [fechaInicio, fechaFin]);

      csvContent = 'Fecha,Sede,Bloque,Nombre,ROL,Email,Estado,Asistio,Fecha Reserva\n';
      result.forEach(row => {
        const fechaStr = row.fecha instanceof Date ? row.fecha.toISOString().split('T')[0] : row.fecha;
        const fechaReserva = row.fecha_reserva ? new Date(row.fecha_reserva).toISOString().split('T')[0] : 'N/A';
        csvContent += `${fechaStr},${row.sede},${row.bloque_horario},"${row.nombre_usuario || 'Usuario eliminado'}",${row.rol || 'N/A'},${row.email},${row.estado_asistencia},${row.asistio_numerico},${fechaReserva}\n`;
      });
    }

    // Agregar BOM UTF-8 para Excel
    const csvWithBOM = '\uFEFF' + csvContent;

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('[EXPORTAR] Error:', error);
    return NextResponse.json({
      error: 'Error exportando datos',
      message: error.message
    }, { status: 500 });
  }
}

// --- POST: OBTENER MESES DISPONIBLES ---
export async function POST(request) {
  try {
    const { userType: userRole } = await getUserFromRequest(request);
    if (userRole !== 'admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const [meses] = await pool.execute(`
      SELECT
        TO_CHAR(fecha, 'YYYY-MM') as mes,
        COUNT(DISTINCT fecha) as dias_con_datos,
        MIN(fecha) as fecha_inicio,
        MAX(fecha) as fecha_fin,
        COUNT(*) as total_registros_cupos
      FROM cupos c
      WHERE fecha < DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY TO_CHAR(fecha, 'YYYY-MM')
      ORDER BY mes DESC
      LIMIT 12
    `);

    const mesesFormateados = meses.map(m => {
      const [year, month] = m.mes.split('-').map(Number);
      const dateObj = new Date(year, month - 1, 1);
      const nombreMes = dateObj.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

      return {
        ...m,
        nombre: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)
      };
    });

    return NextResponse.json({
      meses_disponibles: mesesFormateados,
      total_meses: meses.length
    });

  } catch (error) {
    console.error('[EXPORTAR] Error obteniendo meses:', error);
    return NextResponse.json({
      error: 'Error interno',
      message: error.message
    }, { status: 500 });
  }
}
