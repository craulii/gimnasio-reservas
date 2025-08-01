import pool from "../../../lib/db";

const BLOQUES_DEFAULT = [
  { bloque: "1-2", cupos: 12 },
  { bloque: "3-4", cupos: 12},
  { bloque: "5-6", cupos: 12 },
  { bloque: "7-8", cupos: 12 },
  { bloque: "9-10", cupos: 12 },
  { bloque: "11-12", cupos: 12 },
  { bloque: "13-14", cupos: 12 },
  { bloque: "15-16", cupos: 12 },
  { bloque: "17-18", cupos: 12 },
];

export async function GET(request) {
  try {
    console.log(
      "MANTENIMIENTO AUTOMÁTICO INICIADO:",
      new Date().toISOString()
    );

    await generarCuposDelDia();

    await sincronizarContadores();

    const hoy = new Date();
    if (hoy.getDay() === 1) {
      await limpiezaSemanal();
    }

    console.log("MANTENIMIENTO COMPLETADO:", new Date().toISOString());

    return new Response(
      JSON.stringify({
        message: "Mantenimiento ejecutado exitosamente",
        timestamp: new Date().toISOString(),
        dia_semana: hoy.getDay(),
        limpieza_ejecutada: hoy.getDay() === 1,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("ERROR EN MANTENIMIENTO:", error);
    return new Response(
      JSON.stringify({
        error: "Error en mantenimiento",
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function generarCuposDelDia() {
  try {
    const [existentes] = await pool.query(
      "SELECT COUNT(*) as count FROM cupos WHERE fecha = CURDATE()"
    );

    if (existentes[0].count > 0) {
      console.log("Cupos de hoy ya existen, saltando generación");
      return;
    }

    console.log(
      "Generando cupos para:",
      new Date().toISOString().split("T")[0]
    );

    for (const config of BLOQUES_DEFAULT) {
      await pool.query(
        "INSERT INTO cupos (bloque, total, reservados, fecha) VALUES (?, ?, 0, CURDATE())",
        [config.bloque, config.cupos]
      );
    }

    console.log(
      `${BLOQUES_DEFAULT.length} bloques de cupos generados para hoy`
    );
  } catch (error) {
    console.error("Error generando cupos:", error);
    throw error;
  }
}

async function sincronizarContadores() {
  try {
    console.log("Sincronizando contadores de reservados...");

    const [result] = await pool.query(`
      UPDATE cupos c 
      SET reservados = (
        SELECT COUNT(*) 
        FROM reservas r 
        WHERE r.bloque_horario = c.bloque 
        AND r.fecha = c.fecha
      )
      WHERE c.fecha = CURDATE()
    `);

    console.log(
      `Contadores sincronizados (${result.affectedRows} registros)`
    );
  } catch (error) {
    console.error("Error sincronizando contadores:", error);
    throw error;
  }
}

async function limpiezaSemanal() {
  try {
    console.log("INICIANDO LIMPIEZA SEMANAL...");

    const [datosViejos] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM cupos WHERE fecha <= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)) as cupos_viejos,
        (SELECT COUNT(*) FROM reservas WHERE fecha <= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)) as reservas_viejas
    `);

    const { cupos_viejos, reservas_viejas } = datosViejos[0];

    if (cupos_viejos === 0 && reservas_viejas === 0) {
      console.log("📭 No hay datos antiguos para limpiar");
      return;
    }

    console.log(
      `Datos a eliminar: ${reservas_viejas} reservas, ${cupos_viejos} cupos`
    );

    await pool.query("BEGIN");

    const [reservasResult] = await pool.query(
      "DELETE FROM reservas WHERE fecha <= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)"
    );

    const [cuposResult] = await pool.query(
      "DELETE FROM cupos WHERE fecha <= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)"
    );

    await pool.query("COMMIT");

    console.log(`LIMPIEZA COMPLETADA:`);
    console.log(`Reservas eliminadas: ${reservasResult.affectedRows}`);
    console.log(`Cupos eliminados: ${cuposResult.affectedRows}`);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error en limpieza semanal:", error);
    throw error;
  }
}

export async function POST(request) {
  const userHeader = request.headers.get("x-user");
  if (!userHeader) return new Response("No autorizado", { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== "admin") return new Response("Solo admin", { status: 403 });

  console.log(
    `Mantenimiento manual ejecutado por: ${user.email || "admin"}`
  );

  return GET(request);
}
