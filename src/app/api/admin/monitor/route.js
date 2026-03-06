import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getFechaChile } from "@/app/utils/constants";
import { getUserFromRequest } from "@/lib/auth";

const GOD_MODE_EMAILS = ['jose.vargasv@usm.cl', 'crauli1@usm.cl', 'christian.riquelmep@usm.cl'];

export async function GET(request) {
  try {
    const { email: userEmail } = getUserFromRequest(request);

    if (!userEmail || !GOD_MODE_EMAILS.includes(userEmail)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const hoy = getFechaChile();

    const results = await Promise.allSettled([
      // 1. DB ping con latencia
      (async () => {
        const start = Date.now();
        await pool.execute('SELECT 1');
        return { latency_ms: Date.now() - start, status: 'ok' };
      })(),

      // 2. Stats de hoy
      pool.execute(
        `SELECT
          COUNT(*) as total_reservas,
          COALESCE(SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END), 0) as asistencias,
          COALESCE(SUM(CASE WHEN asistio = 2 THEN 1 ELSE 0 END), 0) as ausencias_auto,
          COALESCE(SUM(CASE WHEN asistio = 0 THEN 1 ELSE 0 END), 0) as ausencias_manual
        FROM reservas WHERE fecha = ?`,
        [hoy]
      ),

      // 3. Activity feed - ultimas 50 reservas de hoy con nombre
      pool.execute(
        `SELECT r.id, r.email, u.name, r.bloque_horario, r.sede, r.asistio, r.created_at
        FROM reservas r
        LEFT JOIN users u ON r.email = u.email
        WHERE r.fecha = ?
        ORDER BY r.created_at DESC
        LIMIT 50`,
        [hoy]
      ),

      // 4. Cupos heatmap - todos los cupos de hoy
      pool.execute(
        `SELECT bloque, sede, total, reservados,
          CASE WHEN total > 0 THEN ROUND((reservados::numeric / total) * 100, 1) ELSE 0 END as porcentaje
        FROM cupos
        WHERE fecha = ?
        ORDER BY bloque, sede`,
        [hoy]
      ),

      // 5. Usuarios en riesgo (faltas > 0)
      pool.execute(
        `SELECT name, email, faltas, baneado
        FROM users
        WHERE faltas > 0
        ORDER BY faltas DESC, baneado DESC
        LIMIT 20`
      ),

      // 6. Tendencia 7 dias
      pool.execute(
        `SELECT fecha,
          COUNT(*) as reservas,
          COUNT(DISTINCT email) as usuarios_unicos
        FROM reservas
        WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY fecha
        ORDER BY fecha ASC`
      ),

      // 7. Verificar si cron/fallback genero cupos hoy
      (async () => {
        try {
          const [rows] = await pool.execute(
            `SELECT COUNT(*) as cupos_generados FROM cupos WHERE fecha = ?`,
            [hoy]
          );
          const count = Number(rows[0]?.cupos_generados || 0);
          return { cupos_generados: count, status: count > 0 ? 'ok' : 'sin_cupos' };
        } catch {
          return null;
        }
      })(),

      // 8. Totales usuarios
      pool.execute(
        `SELECT
          COUNT(*) as total,
          COALESCE(SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END), 0) as admins,
          COALESCE(SUM(CASE WHEN baneado = 1 THEN 1 ELSE 0 END), 0) as baneados
        FROM users`
      ),
    ]);

    const extract = (r, isRaw = false) => {
      if (r.status === 'fulfilled') {
        if (isRaw) return r.value;
        return r.value[0];
      }
      return null;
    };

    const dbPing = extract(results[0], true);
    const statsRows = extract(results[1]);
    const activityRows = extract(results[2]);
    const cuposRows = extract(results[3]);
    const riesgoRows = extract(results[4]);
    const tendenciaRows = extract(results[5]);
    const mantenimiento = extract(results[6], true);
    const totalesRows = extract(results[7]);

    // Calcular cancelaciones de hoy (reservas que ya no existen se pierden,
    // pero podemos contar las con asistio = 0 marcadas manualmente como proxy)
    const statsHoy = statsRows?.[0] || {
      total_reservas: 0, asistencias: 0, ausencias_auto: 0, ausencias_manual: 0
    };

    // Calcular total cupos y uso
    let totalCuposCapacidad = 0;
    let totalCuposReservados = 0;
    if (cuposRows) {
      cuposRows.forEach(c => {
        totalCuposCapacidad += Number(c.total || 0);
        totalCuposReservados += Number(c.reservados || 0);
      });
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      fecha: hoy,
      db: dbPing,
      stats_hoy: {
        ...statsHoy,
        total_reservas: Number(statsHoy.total_reservas),
        asistencias: Number(statsHoy.asistencias),
        ausencias_auto: Number(statsHoy.ausencias_auto),
        ausencias_manual: Number(statsHoy.ausencias_manual),
      },
      cupos: {
        detalle: cuposRows || [],
        total_capacidad: totalCuposCapacidad,
        total_reservados: totalCuposReservados,
        porcentaje_uso: totalCuposCapacidad > 0
          ? Math.round((totalCuposReservados / totalCuposCapacidad) * 1000) / 10
          : 0
      },
      actividad: activityRows || [],
      usuarios_riesgo: riesgoRows || [],
      tendencia_7d: tendenciaRows || [],
      mantenimiento: mantenimiento,
      usuarios_totales: totalesRows?.[0] || { total: 0, admins: 0, baneados: 0 }
    });

  } catch (error) {
    console.error("[God Mode Monitor] Error:", error);
    return NextResponse.json({ error: "Error interno", message: error.message }, { status: 500 });
  }
}
