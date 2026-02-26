import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getFechaChile, BLOQUES_HORARIOS } from "@/app/utils/constants";
import { procesarAusenciasDirecto } from "@/lib/procesar-ausencias";

const CUPOS_POR_SEDE = {
  'Vitacura': 13,
  'San Joaquín': 17,
};
const SEDES = ['Vitacura', 'San Joaquín'];

// Fallback: genera cupos del dia si el cron no corrio
async function autoGenerarCupos(fecha) {
  const [existentes] = await pool.execute(
    "SELECT COUNT(*) as count FROM cupos WHERE fecha = ?",
    [fecha]
  );
  if (existentes[0].count > 0) return;

  console.log("[AUTO-CUPOS] Cron no corrio, generando cupos para:", fecha);
  for (const sede of SEDES) {
    const cuposSede = CUPOS_POR_SEDE[sede];
    for (const bloque of BLOQUES_HORARIOS) {
      await pool.execute(
        "INSERT INTO cupos (bloque, sede, total, reservados, fecha) VALUES (?, ?, ?, 0, ?)",
        [bloque, sede, cuposSede, fecha]
      );
    }
  }
  console.log("[AUTO-CUPOS] Cupos generados exitosamente");
}

// --- GET: OBTENER CUPOS (Público/Privado) ---
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sede = searchParams.get('sede');
    const fecha = searchParams.get('fecha') || getFechaChile();
    const hoy = getFechaChile();

    // Fallback: si piden cupos de hoy y no existen, generarlos
    if (fecha === hoy) {
      await autoGenerarCupos(fecha);

      // Auto-procesar ausencias (15 min después de inicio) para liberar cupos
      for (const bloque of BLOQUES_HORARIOS) {
        for (const s of SEDES) {
          await procesarAusenciasDirecto(bloque, s, fecha);
        }
      }
    }

    let query = "SELECT * FROM cupos WHERE fecha = ?";
    const params = [fecha];

    if (sede) {
      query += " AND sede = ?";
      params.push(sede);
    }

    query += " ORDER BY bloque ASC";

    const [rows] = await pool.execute(query, params);

    const cupos = {};
    rows.forEach(row => {
      const key = `${row.bloque}-${row.sede}`;

      cupos[key] = {
        id: row.id,
        bloque: row.bloque,
        sede: row.sede,
        total: row.total,
        reservados: row.reservados,
        disponibles: row.total - row.reservados,
        fecha: row.fecha
      };
    });

    return NextResponse.json(cupos);

  } catch (error) {
    console.error("Error API Cupos:", error);
    return NextResponse.json({ error: "Error cargando cupos" }, { status: 500 });
  }
}

// --- PATCH: MODIFICAR CUPOS (Solo Admin) ---
export async function PATCH(request) {
  try {
    // 1. SEGURIDAD
    const userRole = request.headers.get('x-user-type');
    const userEmail = request.headers.get('x-user');

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: 'Solo admin puede modificar cupos' }, { status: 403 });
    }

    const { bloque, sede, cantidad, fecha } = await request.json();

    const targetDate = fecha || getFechaChile();

    // 2. ACTUALIZAR
    const [result] = await pool.execute(
      'UPDATE cupos SET total = ? WHERE bloque = ? AND sede = ? AND fecha = ?',
      [cantidad, bloque, sede, targetDate]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "No se encontró el bloque para esa fecha" }, { status: 404 });
    }

    // 3. DEVOLVER DATOS ACTUALIZADOS
    const [rows] = await pool.execute(
        "SELECT * FROM cupos WHERE fecha = ?",
        [targetDate]
    );

    const cupos = {};
    rows.forEach(row => {
      const key = `${row.bloque}-${row.sede}`;
      cupos[key] = {
        bloque: row.bloque,
        sede: row.sede,
        total: row.total,
        reservados: row.reservados,
        disponibles: row.total - row.reservados
      };
    });

    return NextResponse.json({ message: "Cupos actualizados", cupos });

  } catch (error) {
    console.error("Error Update Cupos:", error);
    return NextResponse.json({ error: 'Error actualizando' }, { status: 500 });
  }
}
