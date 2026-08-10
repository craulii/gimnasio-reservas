import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getFechaChile, BLOQUES_HORARIOS } from "@/app/utils/constants";
import { procesarAusenciasDirecto, horaAMinutos } from "@/lib/procesar-ausencias";
import { getUserFromRequest } from "@/lib/auth";
import { getBloquesActivosAsync, getHorariosLimiteAsync } from "@/lib/config-bloques";

const CUPOS_POR_SEDE = {
  'Vitacura': 13,
  'San Joaquín': 17,
};
const SEDES = ['Vitacura', 'San Joaquín'];

// Fallback: genera cupos para una fecha si el cron no corrio
// Retorna true si se generaron cupos nuevos
async function autoGenerarCupos(fecha) {
  const [existentes] = await pool.execute(
    "SELECT COUNT(*) as count FROM cupos WHERE fecha = ?",
    [fecha]
  );
  if (Number(existentes[0].count) > 0) return false;

  console.log("[AUTO-CUPOS] Cron no corrio, generando cupos para:", fecha);
  for (const sede of SEDES) {
    const cuposSede = CUPOS_POR_SEDE[sede];
    const bloquesSede = await getBloquesActivosAsync(sede, fecha);
    for (const bloque of bloquesSede) {
      await pool.execute(
        "INSERT INTO cupos (bloque, sede, total, reservados, fecha) VALUES (?, ?, ?, 0, ?) ON CONFLICT (bloque, sede, fecha) DO NOTHING",
        [bloque, sede, cuposSede, fecha]
      );
    }
  }
  console.log("[AUTO-CUPOS] Cupos generados para:", fecha);
  return true;
}

// --- GET: OBTENER CUPOS (Público/Privado) ---
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sede = searchParams.get('sede');
    const fecha = searchParams.get('fecha') || getFechaChile();
    const hoy = getFechaChile();

    // Fallback: si piden cupos de hoy y no existen, generarlos
    // No generar ni procesar en fines de semana
    const hoyDate = new Date(hoy + 'T12:00:00');
    const esFinDeSemana = hoyDate.getDay() === 0 || hoyDate.getDay() === 6;

    if (fecha === hoy && !esFinDeSemana) {
      const cuposGenerados = await autoGenerarCupos(fecha);

      // Limpiar cupos restringidos solo si se acaban de generar
      if (cuposGenerados) {
        for (const s of SEDES) {
          const bloquesValidos = await getBloquesActivosAsync(s, fecha);
          const bloquesInvalidos = BLOQUES_HORARIOS.filter(b => !bloquesValidos.includes(b));
          if (bloquesInvalidos.length > 0) {
            for (const bloque of bloquesInvalidos) {
              await pool.execute(
                "DELETE FROM reservas WHERE fecha = ? AND sede = ? AND bloque_horario = ?",
                [fecha, s, bloque]
              );
              await pool.execute(
                "DELETE FROM cupos WHERE fecha = ? AND sede = ? AND bloque = ?",
                [fecha, s, bloque]
              );
            }
            console.log(`[CUPOS] Limpiados bloques restringidos para ${s}: ${bloquesInvalidos.join(', ')}`);
          }
        }
      }

      // Auto-procesar ausencias solo para bloques que ya expiraron
      const horaActual = new Date().toLocaleTimeString('es-CL', {
        timeZone: 'America/Santiago',
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      const minutosActuales = horaAMinutos(horaActual);
      const horariosLimite = await getHorariosLimiteAsync();

      for (const bloque of BLOQUES_HORARIOS) {
        if (minutosActuales < horaAMinutos(horariosLimite[bloque])) continue;
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

    // Cache-Control: cupos de hoy cambian con reservas, otras fechas son estables
    const headers = fecha === hoy
      ? { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=20' }
      : { 'Cache-Control': 'public, max-age=300, s-maxage=300' };

    return NextResponse.json(cupos, { headers });

  } catch (error) {
    console.error("Error API Cupos:", error);
    return NextResponse.json({ error: "Error cargando cupos" }, { status: 500 });
  }
}

// --- PATCH: MODIFICAR CUPOS (Solo Admin) ---
export async function PATCH(request) {
  try {
    // 1. SEGURIDAD
    const { email: userEmail, userType: userRole } = await getUserFromRequest(request);

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
