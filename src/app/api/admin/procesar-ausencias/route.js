import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

const dbConfig = {
  host: '127.0.0.1',
  user: 'reservas_crauli',
  password: 'CrauliChris69!',
  database: 'reservas_gymusm',
  port: 3306
};

// Mapeo de bloques a hora límite (15 min después de inicio)
const HORARIOS_LIMITE = {
  "1-2": "08:30:00",    // Bloque 8:15-9:40 → Límite 8:30
  "3-4": "09:55:00",    // Bloque 9:40-11:05 → Límite 9:55
  "5-6": "11:20:00",    // Bloque 11:05-12:30 → Límite 11:20
  "7-8": "12:45:00",    // Bloque 12:30-13:55 → Límite 12:45
  "9-10": "14:55:00",   // Bloque 14:40-16:05 → Límite 14:55
  "11-12": "16:20:00",  // Bloque 16:05-17:30 → Límite 16:20
  "13-14": "17:45:00",  // Bloque 17:30-18:55 → Límite 17:45
  "15-16": "19:10:00",  // Agregué estos por si acaso
  "17-18": "20:35:00",
};

export async function POST(request) {
  let connection;
  try {
    // 1. SEGURIDAD
    const userRole = request.headers.get("x-user-type");
    const userEmail = request.headers.get("x-user");

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { bloque, sede, fecha } = await request.json();
    
    // 2. Validar Hora Actual (Chile)
    const now = new Date();
    // Forzamos zona horaria Santiago para evitar líos con servidores en UTC
    const horaActual = now.toLocaleTimeString('es-CL', { 
      timeZone: 'America/Santiago',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }); // Retorna HH:MM:SS

    const horaLimite = HORARIOS_LIMITE[bloque];
    
    if (!horaLimite) {
      return NextResponse.json({ message: "Bloque no válido" }, { status: 400 });
    }

    // Solo procesar si ya pasó la hora límite
    // Nota: Comparación de strings "14:56:00" > "14:55:00" funciona en JS
    if (horaActual < horaLimite) {
      return NextResponse.json({ 
        message: "Aún no es hora de marcar ausencias automáticas",
        horaActual,
        horaLimite,
        procesado: false
      });
    }

    connection = await mysql.createConnection(dbConfig);

    // 3. Buscar reservas pendientes (asistio = 0)
    // IMPORTANTE: Solo buscamos las que NO han sido procesadas (asistio = 0)
    // Si ya fue procesada, la marcaremos con un 2 para no castigar doble.
    const [reservasSinMarcar] = await connection.execute(
      `SELECT r.id, r.email, r.bloque_horario, r.sede 
       FROM reservas r
       WHERE r.fecha = ? 
       AND r.bloque_horario = ?
       AND r.sede = ?
       AND r.asistio = 0`,
      [fecha, bloque, sede]
    );

    if (reservasSinMarcar.length === 0) {
      return NextResponse.json({ 
        message: "No hay reservas pendientes para procesar en este bloque",
        procesado: false 
      });
    }

    let faltasRegistradas = 0;

    // 4. Procesar cada ausencia
    for (const reserva of reservasSinMarcar) {
      await connection.beginTransaction();

      try {
        // A. Marcar reserva como "AUSENTE PROCESADO" (2)
        // Usamos el estado '2' para saber que el sistema ya le cobró la falta.
        // Así, si corres el script de nuevo, no le suma otra falta.
        await connection.execute(
          "UPDATE reservas SET asistio = 2 WHERE id = ?",
          [reserva.id]
        );

        // B. Incrementar faltas del usuario
        await connection.execute(
          "UPDATE users SET faltas = faltas + 1 WHERE email = ?",
          [reserva.email]
        );

        // C. Verificar Ban (Si llega a 3, baneado)
        const [user] = await connection.execute(
          "SELECT faltas FROM users WHERE email = ? LIMIT 1",
          [reserva.email]
        );

        if (user[0]?.faltas >= 3) {
          await connection.execute(
            "UPDATE users SET baneado = 1 WHERE email = ?",
            [reserva.email]
          );
          console.log(`[AUTO-AUSENCIA] 🚫 Usuario ${reserva.email} baneado por 3 faltas`);
        }

        // D. Liberar el cupo (Ya que no vino, el cupo técnicamente se perdió, 
        // pero liberarlo ajusta los contadores para estadísticas correctas)
        await connection.execute(
          `UPDATE cupos 
           SET reservados = GREATEST(0, reservados - 1)
           WHERE bloque = ? AND sede = ? AND fecha = ?`,
          [bloque, sede, fecha]
        );

        await connection.commit();
        faltasRegistradas++;

        console.log(`[AUTO-AUSENCIA] ⚠️ Falta registrada: ${reserva.email}`);

      } catch (error) {
        await connection.rollback();
        console.error(`[AUTO-AUSENCIA] Error en reserva ${reserva.id}:`, error);
        // No lanzamos error global para que siga procesando a los demás
      }
    }

    return NextResponse.json({
      message: `Procesadas ${faltasRegistradas} ausencias automáticas`,
      bloque,
      sede,
      fecha,
      horaLimite,
      horaActual,
      faltasRegistradas,
      procesado: true
    });

  } catch (error) {
    console.error("[PROCESAR-AUSENCIAS] Error Fatal:", error);
    return NextResponse.json(
      { message: "Error interno al procesar ausencias: " + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}