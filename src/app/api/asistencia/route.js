import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getFechaChile } from "@/app/utils/constants";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request) {
  try {
    // 1. SEGURIDAD
    const { email: userEmail, userType: userRole } = getUserFromRequest(request);

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: "Solo admin puede marcar asistencia" }, { status: 403 });
    }

    // 2. DATOS
    const { username, bloque, presente } = await request.json();

    if (!username || !bloque) {
       return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // 3. ACTUALIZAR
    const [result] = await pool.execute(
      "UPDATE reservas SET asistio = ? WHERE email = ? AND bloque_horario = ? AND fecha = ?",
      [presente ? 1 : 0, username, bloque, getFechaChile()]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "No se encontró la reserva para hoy" }, { status: 404 });
    }

    return NextResponse.json({ message: "Asistencia registrada exitosamente" });

  } catch (error) {
    console.error("Error marcando asistencia:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
