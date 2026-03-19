import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { getFechaChile, HORARIOS_BLOQUE, BLOQUES_HORARIOS, sortBloques } from "@/app/utils/constants";

export async function GET(request) {
  try {
    const { email: userEmail, userType: userRole } = await getUserFromRequest(request);
    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let fechaInicio = searchParams.get('fechaInicio');
    let fechaFin = searchParams.get('fechaFin');

    if (!fechaInicio || !fechaFin) {
      fechaFin = getFechaChile();
      const [y, m, d] = fechaFin.split('-').map(Number);
      const hace30 = new Date(y, m - 1, d - 30);
      fechaInicio = hace30.toLocaleDateString('en-CA');
    }

    // 1. Resumen general
    const [resumen] = await pool.execute(`
      SELECT
        COUNT(*) as total_reservas,
        SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END) as total_asistencias,
        CASE WHEN COUNT(*) > 0
          THEN ROUND((SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1)
          ELSE 0 END as porcentaje_asistencia,
        COUNT(DISTINCT email) as usuarios_unicos
      FROM reservas
      WHERE fecha BETWEEN ? AND ?
    `, [fechaInicio, fechaFin]);

    // 2. Cupos totales (para tasa de ocupación)
    const [cuposTotales] = await pool.execute(`
      SELECT
        COALESCE(SUM(total), 0) as cupos_totales,
        COALESCE(SUM(reservados), 0) as cupos_reservados
      FROM cupos
      WHERE fecha BETWEEN ? AND ?
    `, [fechaInicio, fechaFin]);

    // 3. Por bloque horario
    const [porBloque] = await pool.execute(`
      SELECT
        bloque_horario as bloque,
        COUNT(*) as reservas,
        SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END) as asistencias,
        CASE WHEN COUNT(*) > 0
          THEN ROUND((SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1)
          ELSE 0 END as porcentaje
      FROM reservas
      WHERE fecha BETWEEN ? AND ?
      GROUP BY bloque_horario
      ORDER BY bloque_horario
    `, [fechaInicio, fechaFin]);

    // Enriquecer con horarios reales y ordenar
    const bloquesEnriquecidos = porBloque
      .map(b => ({
        ...b,
        horario_inicio: HORARIOS_BLOQUE[b.bloque]?.inicio || '',
        horario_fin: HORARIOS_BLOQUE[b.bloque]?.fin || '',
      }))
      .sort((a, b) => sortBloques(a.bloque, b.bloque));

    // 4. Por sede
    const [porSede] = await pool.execute(`
      SELECT
        r.sede,
        COUNT(*) as reservas,
        SUM(CASE WHEN r.asistio = 1 THEN 1 ELSE 0 END) as asistencias,
        CASE WHEN COUNT(*) > 0
          THEN ROUND((SUM(CASE WHEN r.asistio = 1 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1)
          ELSE 0 END as porcentaje
      FROM reservas r
      WHERE r.fecha BETWEEN ? AND ?
      GROUP BY r.sede
      ORDER BY r.sede
    `, [fechaInicio, fechaFin]);

    // Agregar cupos totales por sede
    const [cuposPorSede] = await pool.execute(`
      SELECT sede, COALESCE(SUM(total), 0) as cupos_totales
      FROM cupos
      WHERE fecha BETWEEN ? AND ?
      GROUP BY sede
    `, [fechaInicio, fechaFin]);

    const cuposSedeMap = {};
    cuposPorSede.forEach(c => { cuposSedeMap[c.sede] = parseInt(c.cupos_totales); });
    const sedesEnriquecidas = porSede.map(s => ({
      ...s,
      cupos_totales: cuposSedeMap[s.sede] || 0,
    }));

    // 5. Tendencia diaria
    const [tendencia] = await pool.execute(`
      SELECT
        fecha,
        EXTRACT(DOW FROM fecha) as dia_semana_num,
        COUNT(*) as reservas,
        SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END) as asistencias,
        CASE WHEN COUNT(*) > 0
          THEN ROUND((SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1)
          ELSE 0 END as porcentaje
      FROM reservas
      WHERE fecha BETWEEN ? AND ?
      GROUP BY fecha
      ORDER BY fecha
    `, [fechaInicio, fechaFin]);

    const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const tendenciaConDia = tendencia.map(t => {
      const fechaStr = t.fecha instanceof Date ? t.fecha.toLocaleDateString('en-CA') : String(t.fecha).split('T')[0];
      return {
        ...t,
        fecha: fechaStr,
        dia_semana: DIAS[parseInt(t.dia_semana_num)] || '',
      };
    });

    // 6. Ranking alumnos (top 50)
    const [ranking] = await pool.execute(`
      SELECT
        u.name as nombre,
        r.email,
        COUNT(*) as reservas,
        SUM(CASE WHEN r.asistio = 1 THEN 1 ELSE 0 END) as asistencias,
        CASE WHEN COUNT(*) > 0
          THEN ROUND((SUM(CASE WHEN r.asistio = 1 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1)
          ELSE 0 END as porcentaje
      FROM reservas r
      LEFT JOIN users u ON r.email = u.email
      WHERE r.fecha BETWEEN ? AND ?
      GROUP BY u.name, r.email
      ORDER BY COUNT(*) DESC
      LIMIT 50
    `, [fechaInicio, fechaFin]);

    // 7. Datos crudos (todas las reservas)
    const [datosCrudos] = await pool.execute(`
      SELECT
        r.fecha,
        u.name as nombre,
        r.email,
        r.sede,
        r.bloque_horario as bloque,
        CASE
          WHEN r.asistio = 1 THEN 'Presente'
          WHEN r.asistio = 0 THEN 'Ausente'
          WHEN r.asistio = 2 THEN 'Auto-procesado'
          ELSE 'Pendiente'
        END as estado,
        r.created_at
      FROM reservas r
      LEFT JOIN users u ON r.email = u.email
      WHERE r.fecha BETWEEN ? AND ?
      ORDER BY r.fecha DESC, r.sede, r.bloque_horario, u.name
    `, [fechaInicio, fechaFin]);

    const datosCrudosFormateados = datosCrudos.map(d => {
      const fechaStr = d.fecha instanceof Date ? d.fecha.toLocaleDateString('en-CA') : String(d.fecha).split('T')[0];
      return { ...d, fecha: fechaStr };
    });

    return NextResponse.json({
      fechaInicio,
      fechaFin,
      resumen: resumen[0] || {},
      cupos_totales: cuposTotales[0] || {},
      por_bloque: bloquesEnriquecidos,
      por_sede: sedesEnriquecidas,
      tendencia: tendenciaConDia,
      ranking,
      datos_crudos: datosCrudosFormateados,
    });

  } catch (error) {
    console.error('[EXPORTAR-COMPLETO] Error:', error);
    return NextResponse.json({
      error: 'Error generando datos de exportación',
      message: error.message
    }, { status: 500 });
  }
}
