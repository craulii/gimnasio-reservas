import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

const dbConfig = {
  host: '127.0.0.1',
  user: 'reservas_crauli',
  password: 'CrauliChris69!',
  database: 'reservas_gymusm',
  port: 3306
};

// Configuración de bloques y sedes
const BLOQUES_DEFAULT = [
  { bloque: "1-2", cupos: 15 }, // Ajusta los cupos si quieres
  { bloque: "3-4", cupos: 15 },
  { bloque: "5-6", cupos: 15 },
  { bloque: "7-8", cupos: 15 },
  { bloque: "9-10", cupos: 15 },
  { bloque: "11-12", cupos: 15 },
  { bloque: "13-14", cupos: 15 },
  { bloque: "15-16", cupos: 15 },
  { bloque: "17-18", cupos: 15 },
];

const SEDES_DEFAULT = ['Santiago', 'Viña']; // ¡Importante para que existan en ambas!

// --- FUNCIONES AUXILIARES (Reciben la conexión como argumento) ---

async function generarCuposDelDia(connection) {
  // 1. Ver si ya existen cupos para hoy
  const [existentes] = await connection.execute(
    "SELECT COUNT(*) as count FROM cupos WHERE fecha = CURDATE()"
  );

  if (existentes[0].count > 0) {
    console.log("✅ Cupos de hoy ya existen, saltando generación.");
    return;
  }

  console.log("🛠️ Generando cupos para:", new Date().toISOString().split("T")[0]);

  // 2. Generar cupos para cada Sede y cada Bloque
  for (const sede of SEDES_DEFAULT) {
    for (const config of BLOQUES_DEFAULT) {
      await connection.execute(
        "INSERT INTO cupos (bloque, sede, total, reservados, fecha) VALUES (?, ?, ?, 0, CURDATE())",
        [config.bloque, sede, config.cupos]
      );
    }
  }

  console.log(`✨ Cupos generados para ${SEDES_DEFAULT.length} sedes.`);
}

async function sincronizarContadores(connection) {
  console.log("🔄 Sincronizando contadores de reservados...");

  // Actualiza la tabla 'cupos' contando las 'reservas' reales
  // Es vital comparar BLOQUE + FECHA + SEDE
  await connection.execute(`
    UPDATE cupos c 
    SET reservados = (
      SELECT COUNT(*) 
      FROM reservas r 
      WHERE r.bloque_horario = c.bloque 
      AND r.fecha = c.fecha
      AND r.sede = c.sede 
    )
    WHERE c.fecha = CURDATE()
  `);

  console.log("✅ Contadores sincronizados.");
}

async function limpiezaSemanal(connection) {
  console.log("🧹 INICIANDO LIMPIEZA DE DATOS ANTIGUOS...");

  const [datosViejos] = await connection.execute(`
    SELECT 
      (SELECT COUNT(*) FROM cupos WHERE fecha <= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)) as cupos_viejos,
      (SELECT COUNT(*) FROM reservas WHERE fecha <= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)) as reservas_viejas
  `);

  const { cupos_viejos, reservas_viejas } = datosViejos[0];

  if (cupos_viejos === 0 && reservas_viejas === 0) {
    console.log("📭 No hay datos antiguos para limpiar.");
    return;
  }

  console.log(`🗑️ Eliminando: ${reservas_viejas} reservas, ${cupos_viejos} cupos antiguos...`);

  await connection.beginTransaction();

  try {
    const [reservasResult] = await connection.execute(
      "DELETE FROM reservas WHERE fecha <= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)"
    );

    const [cuposResult] = await connection.execute(
      "DELETE FROM cupos WHERE fecha <= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)"
    );

    await connection.commit();
    console.log(`✅ Limpieza completada. R: ${reservasResult.affectedRows}, C: ${cuposResult.affectedRows}`);
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error en limpieza, rollback ejecutado.");
    throw error;
  }
}

// --- API HANDLERS ---

export async function GET(request) {
  let connection;
  try {
    console.log("🚀 MANTENIMIENTO AUTOMÁTICO INICIADO");

    connection = await mysql.createConnection(dbConfig);

    // 1. Generar
    await generarCuposDelDia(connection);

    // 2. Sincronizar (Por seguridad, por si quedó algo desfazado)
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
    console.error("❌ ERROR CRÍTICO EN MANTENIMIENTO:", error);
    return NextResponse.json({ 
        error: "Error en mantenimiento", 
        details: error.message 
    }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

export async function POST(request) {
  // Verificación Manual (Solo Admins pueden forzar el mantenimiento)
  const userRole = request.headers.get("x-user-type");
  const userEmail = request.headers.get("x-user");

  if (!userEmail || userRole !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  console.log(`🔧 Mantenimiento manual forzado por: ${userEmail}`);

  // Reutilizamos la lógica del GET
  return GET(request);
}