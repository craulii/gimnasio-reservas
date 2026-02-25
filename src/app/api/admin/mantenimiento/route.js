import { NextResponse } from "next/server";
import pool from "@/lib/db";

import { getFechaChile } from "@/app/utils/constants";

// Configuración de bloques y sedes
const BLOQUES_DEFAULT = [
  { bloque: "1-2", cupos: 15 },
  { bloque: "3-4", cupos: 15 },
  { bloque: "5-6", cupos: 15 },
  { bloque: "7-8", cupos: 15 },
  { bloque: "9-10", cupos: 15 },
  { bloque: "11-12", cupos: 15 },
  { bloque: "13-14", cupos: 15 },
  { bloque: "15-16", cupos: 15 },
];

const CUPOS_POR_SEDE = {
  'Vitacura': 13,
  'San Joaquín': 17,
};

const SEDES_DEFAULT = ['Vitacura', 'San Joaquín'];

// --- FUNCIONES AUXILIARES ---

async function generarCuposDelDia(connection) {
  const fechaChile = getFechaChile();

  const [existentes] = await connection.execute(
    "SELECT COUNT(*) as count FROM cupos WHERE fecha = ?",
    [fechaChile]
  );

  if (existentes[0].count > 0) {
    console.log("Cupos de hoy ya existen, saltando generación.");
    return;
  }

  console.log("Generando cupos para:", fechaChile);

  for (const sede of SEDES_DEFAULT) {
    const cuposSede = CUPOS_POR_SEDE[sede] || 15;
    for (const config of BLOQUES_DEFAULT) {
      await connection.execute(
        "INSERT INTO cupos (bloque, sede, total, reservados, fecha) VALUES (?, ?, ?, 0, ?)",
        [config.bloque, sede, cuposSede, fechaChile]
      );
    }
  }

  console.log(`Cupos generados para ${SEDES_DEFAULT.length} sedes.`);
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

    // 1. Generar
    await generarCuposDelDia(connection);

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
  const userRole = request.headers.get("x-user-type");
  const userEmail = request.headers.get("x-user");

  if (!userEmail || userRole !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  console.log(`Mantenimiento manual forzado por: ${userEmail}`);

  return GET(request);
}
