import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

const dbConfig = {
  host: '127.0.0.1',
  user: 'reservas_crauli',
  password: 'CrauliChris69!',
  database: 'reservas_gymusm',
  port: 3306
};

// --- GET: OBTENER CUPOS (Público/Privado) ---
export async function GET(request) {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    const { searchParams } = new URL(request.url);
    const sede = searchParams.get('sede');
    // Si no mandan fecha, usamos HOY. Si mandan, usamos esa.
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    // Consultamos solo la fecha específica para evitar sobrescribir bloques
    let query = "SELECT * FROM cupos WHERE fecha = ?";
    const params = [fecha];

    if (sede) {
      query += " AND sede = ?";
      params.push(sede);
    }

    query += " ORDER BY bloque ASC";

    const [rows] = await connection.execute(query, params);

    // Formateo tipo diccionario para acceso rápido en Frontend
    const cupos = {};
    rows.forEach(row => {
      // Clave: Bloque + Sede (Ej: "1-2-Santiago")
      // Esto facilita al frontend encontrar el cupo exacto
      const key = `${row.bloque}-${row.sede}`;
      
      cupos[key] = {
        id: row.id,
        bloque: row.bloque,
        sede: row.sede,
        total: row.total,
        reservados: row.reservados,
        disponibles: row.total - row.reservados,
        fecha: row.fecha // útil para validar en frontend
      };
    });

    return NextResponse.json(cupos);

  } catch (error) {
    console.error("Error API Cupos:", error);
    return NextResponse.json({ error: "Error cargando cupos" }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

// --- PATCH: MODIFICAR CUPOS (Solo Admin) ---
export async function PATCH(request) {
  let connection;
  try {
    // 1. SEGURIDAD
    const userRole = request.headers.get('x-user-type');
    const userEmail = request.headers.get('x-user');

    if (!userEmail || userRole !== 'admin') {
      return NextResponse.json({ error: 'Solo admin puede modificar cupos' }, { status: 403 });
    }

    const { bloque, sede, cantidad, fecha } = await request.json();
    
    // Si no viene fecha, asumimos hoy
    const targetDate = fecha || new Date().toISOString().split('T')[0];

    connection = await mysql.createConnection(dbConfig);
    
    // 2. ACTUALIZAR
    const [result] = await connection.execute(
      'UPDATE cupos SET total = ? WHERE bloque = ? AND sede = ? AND fecha = ?', 
      [cantidad, bloque, sede, targetDate]
    );

    if (result.affectedRows === 0) {
      // Si no existe, quizás deberíamos crearlo (opcional, pero seguro devolver 404 por ahora)
      return NextResponse.json({ error: "No se encontró el bloque para esa fecha" }, { status: 404 });
    }

    // 3. DEVOLVER DATOS ACTUALIZADOS (Reutilizamos lógica del GET)
    const [rows] = await connection.execute(
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
  } finally {
    if (connection) await connection.end();
  }
}