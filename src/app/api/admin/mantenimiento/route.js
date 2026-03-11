import { NextResponse } from "next/server";
import pool from "@/lib/db";

import { getFechaChile, BLOQUES_HORARIOS, getBloquesParaSedeFecha } from "@/app/utils/constants";
import { getUserFromRequest } from "@/lib/auth";

const CUPOS_POR_SEDE = {
  'Vitacura': 13,
  'San Joaquín': 17,
};

const SEDES_DEFAULT = ['Vitacura', 'San Joaquín'];

// --- FUNCIONES AUXILIARES ---

async function generarCuposSemana(connection) {
  const fechaBase = new Date(getFechaChile() + 'T12:00:00');
  let diasGenerados = 0;

  for (let i = 0; i < 7; i++) {
    const fecha = new Date(fechaBase);
    fecha.setDate(fecha.getDate() + i);
    const fechaStr = fecha.toISOString().split('T')[0];

    // No generar cupos para fines de semana
    const diaSemana = fecha.getDay();
    if (diaSemana === 0 || diaSemana === 6) continue;

    const [existentes] = await connection.execute(
      "SELECT COUNT(*) as count FROM cupos WHERE fecha = ?",
      [fechaStr]
    );

    if (existentes[0].count > 0) {
      continue;
    }

    console.log("Generando cupos para:", fechaStr);

    for (const sede of SEDES_DEFAULT) {
      const cuposSede = CUPOS_POR_SEDE[sede] || 15;
      const bloquesSede = getBloquesParaSedeFecha(sede, fechaStr);
      for (const bloque of bloquesSede) {
        await connection.execute(
          "INSERT INTO cupos (bloque, sede, total, reservados, fecha) VALUES (?, ?, ?, 0, ?)",
          [bloque, sede, cuposSede, fechaStr]
        );
      }
    }
    diasGenerados++;
  }

  console.log(`Cupos generados para ${diasGenerados} día(s) nuevos (7 días adelante).`);
}

async function sincronizarContadores(connection) {
  const fechaChile = getFechaChile();
  console.log("Sincronizando contadores de reservados...");

  await connection.execute(`
    UPDATE cupos c
    SET reservados = (
      SELECT COUNT(*)
      FROM reservas r
      WHERE r.bloque_horario = c.bloque
      AND r.fecha = c.fecha
      AND r.sede = c.sede
    )
    WHERE c.fecha = ?
  `, [fechaChile]);

  console.log("Contadores sincronizados.");
}

async function limpiezaSemanal(connection) {
  console.log("INICIANDO LIMPIEZA DE DATOS ANTIGUOS...");

  const [datosViejos] = await connection.execute(`
    SELECT
      (SELECT COUNT(*) FROM cupos WHERE fecha <= CURRENT_DATE - INTERVAL '6 months') as cupos_viejos,
      (SELECT COUNT(*) FROM reservas WHERE fecha <= CURRENT_DATE - INTERVAL '6 months') as reservas_viejas
  `);

  const { cupos_viejos, reservas_viejas } = datosViejos[0];

  if (cupos_viejos === 0 && reservas_viejas === 0) {
    console.log("No hay datos antiguos para limpiar.");
    return;
  }

  console.log(`Eliminando: ${reservas_viejas} reservas, ${cupos_viejos} cupos antiguos...`);

  await connection.beginTransaction();

  try {
    const [reservasResult] = await connection.execute(
      "DELETE FROM reservas WHERE fecha <= CURRENT_DATE - INTERVAL '6 months'"
    );

    const [cuposResult] = await connection.execute(
      "DELETE FROM cupos WHERE fecha <= CURRENT_DATE - INTERVAL '6 months'"
    );

    await connection.commit();
    console.log(`Limpieza completada. R: ${reservasResult.affectedRows}, C: ${cuposResult.affectedRows}`);
  } catch (error) {
    await connection.rollback();
    console.error("Error en limpieza, rollback ejecutado.");
    throw error;
  }
}

// --- API HANDLERS ---

export async function GET(request) {
  let connection;
  try {
    console.log("MANTENIMIENTO AUTOMÁTICO INICIADO");

    connection = await pool.getConnection();

    // 1. Generar cupos para la semana (hoy + 6 días)
    await generarCuposSemana(connection);

    // 2. Sincronizar
    await sincronizarContadores(connection);

    // 3. Limpiar (Solo los lunes = día 1)
    const hoy = new Date();
    const esLunes = hoy.getDay() === 1;
    if (esLunes) {
      await limpiezaSemanal(connection);
    }

    return NextResponse.json({
      message: "Mantenimiento ejecutado exitosamente",
      timestamp: new Date().toISOString(),
      limpieza_ejecutada: esLunes,
    });

  } catch (error) {
    console.error("ERROR CRÍTICO EN MANTENIMIENTO:", error);
    return NextResponse.json({
        error: "Error en mantenimiento",
        details: error.message
    }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function POST(request) {
  const { email: userEmail, userType: userRole } = await getUserFromRequest(request);

  if (!userEmail || userRole !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  console.log(`Mantenimiento manual forzado por: ${userEmail}`);

  return GET(request);
}
