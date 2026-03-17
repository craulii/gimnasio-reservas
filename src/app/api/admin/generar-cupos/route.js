import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getFechaChile, getBloquesParaSedeFecha } from "@/app/utils/constants";

const CUPOS_POR_SEDE = {
  'Vitacura': 13,
  'San Joaquín': 17,
};
const SEDES = ['Vitacura', 'San Joaquín'];

export async function POST(request) {
  try {
    // Auth
    const userType = request.headers.get("x-user-type");
    if (userType !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { fechaHasta } = await request.json();
    if (!fechaHasta) {
      return NextResponse.json({ error: "Falta fechaHasta" }, { status: 400 });
    }

    // Validar formato fecha
    const fechaHastaDate = new Date(fechaHasta + 'T12:00:00');
    if (isNaN(fechaHastaDate.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }

    // Límite 90 días
    const hoy = getFechaChile();
    const hoyDate = new Date(hoy + 'T12:00:00');
    const diffDias = Math.round((fechaHastaDate - hoyDate) / (1000 * 60 * 60 * 24));
    if (diffDias < 0) {
      return NextResponse.json({ error: "La fecha debe ser hoy o futura" }, { status: 400 });
    }
    if (diffDias > 90) {
      return NextResponse.json({ error: "Máximo 90 días adelante" }, { status: 400 });
    }

    let cuposCreados = 0;
    let cuposExistentes = 0;
    let diasProcesados = 0;

    // Iterar desde hoy hasta fechaHasta
    const current = new Date(hoyDate);
    while (current <= fechaHastaDate) {
      const dia = current.getDay();
      // Saltar fines de semana
      if (dia !== 0 && dia !== 6) {
        const fechaStr = current.toISOString().split('T')[0];
        diasProcesados++;

        for (const sede of SEDES) {
          const cuposSede = CUPOS_POR_SEDE[sede];
          const bloquesSede = getBloquesParaSedeFecha(sede, fechaStr);

          for (const bloque of bloquesSede) {
            const [result] = await pool.execute(
              "INSERT INTO cupos (bloque, sede, total, reservados, fecha) VALUES (?, ?, ?, 0, ?) ON CONFLICT (bloque, sede, fecha) DO NOTHING",
              [bloque, sede, cuposSede, fechaStr]
            );
            if (result.affectedRows > 0) {
              cuposCreados++;
            } else {
              cuposExistentes++;
            }
          }
        }
      }
      current.setDate(current.getDate() + 1);
    }

    console.log(`[GENERAR-CUPOS] ${diasProcesados} días, ${cuposCreados} creados, ${cuposExistentes} existentes`);

    return NextResponse.json({
      message: `Cupos generados exitosamente`,
      cuposCreados,
      cuposExistentes,
      diasProcesados,
    });

  } catch (error) {
    console.error("Error generar-cupos:", error);
    return NextResponse.json({ error: "Error interno: " + error.message }, { status: 500 });
  }
}
