import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getFechaChile, SEDES, BLOQUES_HORARIOS } from "@/app/utils/constants";
import { getUserFromRequest } from "@/lib/auth";
import { getConfigCompletaAdmin, getBloquesActivosAsync, invalidarCacheConfigBloques } from "@/lib/config-bloques";

const CUPOS_POR_SEDE = {
  'Vitacura': 13,
  'San Joaquín': 17,
};

async function requireAdmin(request) {
  const { email, userType } = await getUserFromRequest(request);
  if (!email || userType !== 'admin') return null;
  return email;
}

// --- GET: config completa (bloques activos por sede/dia + horarios reales) ---
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const config = await getConfigCompletaAdmin();
    return NextResponse.json(config);
  } catch (error) {
    console.error("[CONFIG-BLOQUES GET] Error:", error);
    return NextResponse.json({ error: "Error cargando configuración" }, { status: 500 });
  }
}

// --- PUT: guardar cambios (no toca cupos/reservas) ---
export async function PUT(request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let connection;
  try {
    const { activos, horarios } = await request.json();

    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const item of activos || []) {
      const { sede, bloque, tipo_dia, activo } = item;
      if (!SEDES.includes(sede) || !BLOQUES_HORARIOS.includes(bloque) || !['normal', 'viernes'].includes(tipo_dia)) {
        throw new Error(`Item de bloque inválido: ${JSON.stringify(item)}`);
      }
      await connection.execute(
        `INSERT INTO config_bloques_sede (sede, bloque, tipo_dia, activo, updated_by)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (sede, bloque, tipo_dia)
         DO UPDATE SET activo = EXCLUDED.activo, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
        [sede, bloque, tipo_dia, activo ? 1 : 0, admin]
      );
    }

    for (const item of horarios || []) {
      const { bloque, hora_inicio, hora_fin } = item;
      if (!BLOQUES_HORARIOS.includes(bloque) || !hora_inicio || !hora_fin || hora_fin <= hora_inicio) {
        throw new Error(`Horario de bloque inválido: ${JSON.stringify(item)}`);
      }
      await connection.execute(
        `INSERT INTO config_horarios_bloque (bloque, hora_inicio, hora_fin, updated_by)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (bloque)
         DO UPDATE SET hora_inicio = EXCLUDED.hora_inicio, hora_fin = EXCLUDED.hora_fin, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
        [bloque, hora_inicio, hora_fin, admin]
      );
    }

    await connection.commit();
    invalidarCacheConfigBloques();

    const config = await getConfigCompletaAdmin();
    return NextResponse.json({ message: "Configuración guardada", ...config });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("[CONFIG-BLOQUES PUT] Error:", error);
    return NextResponse.json({ error: "Error guardando configuración: " + error.message }, { status: 400 });
  } finally {
    if (connection) connection.release();
  }
}

// --- POST: aplicar la config vigente a cupos ya generados en los próximos N días ---
export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let connection;
  try {
    const body = await request.json().catch(() => ({}));
    const dias = Math.min(Math.max(parseInt(body.dias) || 7, 1), 30);

    let cuposCreados = 0;
    let cuposEliminados = 0;
    let reservasCanceladas = 0;
    let diasProcesados = 0;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const fechaBase = new Date(getFechaChile() + 'T12:00:00');
    for (let i = 0; i < dias; i++) {
      const fecha = new Date(fechaBase);
      fecha.setDate(fecha.getDate() + i);
      const diaSemana = fecha.getDay();
      if (diaSemana === 0 || diaSemana === 6) continue;
      const fechaStr = fecha.toISOString().split('T')[0];
      diasProcesados++;

      for (const sede of SEDES) {
        const bloquesActivos = new Set(await getBloquesActivosAsync(sede, fechaStr));

        const [existentes] = await connection.execute(
          "SELECT bloque FROM cupos WHERE sede = ? AND fecha = ?",
          [sede, fechaStr]
        );
        const bloquesExistentes = new Set(existentes.map(r => r.bloque));

        for (const bloque of BLOQUES_HORARIOS) {
          const debeExistir = bloquesActivos.has(bloque);
          const yaExiste = bloquesExistentes.has(bloque);

          if (debeExistir && !yaExiste) {
            const [result] = await connection.execute(
              "INSERT INTO cupos (bloque, sede, total, reservados, fecha) VALUES (?, ?, ?, 0, ?) ON CONFLICT (bloque, sede, fecha) DO NOTHING",
              [bloque, sede, CUPOS_POR_SEDE[sede] || 15, fechaStr]
            );
            cuposCreados += result.affectedRows;
          } else if (!debeExistir && yaExiste) {
            const [delReservas] = await connection.execute(
              "DELETE FROM reservas WHERE fecha = ? AND sede = ? AND bloque_horario = ?",
              [fechaStr, sede, bloque]
            );
            reservasCanceladas += delReservas.affectedRows;
            const [delCupos] = await connection.execute(
              "DELETE FROM cupos WHERE fecha = ? AND sede = ? AND bloque = ?",
              [fechaStr, sede, bloque]
            );
            cuposEliminados += delCupos.affectedRows;
          }
        }
      }
    }

    await connection.commit();

    return NextResponse.json({
      message: "Configuración aplicada a cupos existentes",
      diasProcesados,
      cuposCreados,
      cuposEliminados,
      reservasCanceladas,
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("[CONFIG-BLOQUES POST] Error:", error);
    return NextResponse.json({ error: "Error aplicando configuración: " + error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
