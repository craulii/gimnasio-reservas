import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

// 1. CREDENCIALES DIRECTAS (Las mismas que usamos en el login y en el PHP)
const dbConfig = {
  host: '127.0.0.1',
  user: 'reservas_crauli',     
  password: 'CrauliChris69!', 
  database: 'reservas_gymusm',
  port: 3306
};

// Función auxiliar para conectar
async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

export async function GET(request) {
  let connection;
  try {
    // 2. Conexión DIRECTA (Bypass de lib/db.js)
    connection = await getConnection();

    // 3. Capturamos parametros (por si filtras por sede)
    const { searchParams } = new URL(request.url);
    const sede = searchParams.get('sede');

    let query = "SELECT * FROM cupos WHERE fecha >= CURDATE()";
    const params = [];

    if (sede) {
      query += " AND sede = ?";
      params.push(sede);
    }

    // Ordenamos para que salgan bonitos en la lista
    query += " ORDER BY fecha ASC, bloque ASC";

    const [rows] = await connection.execute(query, params);

    // 4. Formateo de datos para el Frontend
    // Convertimos la lista de la BDD al formato objeto { "clave": {datos} } que usa tu app
    const cupos = {};
    
    rows.forEach(row => {
      // Clave única: Ej "1-2-Vitacura"
      const key = `${row.bloque}-${row.sede}`;
      
      cupos[key] = {
        bloque: row.bloque,
        sede: row.sede,
        total: row.total,
        reservados: row.reservados,
        // Calculamos disponibles al vuelo
        disponibles: row.total - row.reservados
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

// Mantenemos tu PATCH (Admin) también con conexión directa
export async function PATCH(request) {
  const userHeader = request.headers.get('x-user');
  if (!userHeader) return new Response('No autorizado', { status: 401 });
  
  // Validación simple de admin
  const user = JSON.parse(userHeader);
  if (user.rol !== 'admin' && user.is_admin !== 1 && user.is_admin !== true) {
     return new Response('Solo admin puede modificar', { status: 403 });
  }

  const { bloque, sede, cantidad } = await request.json();
  let connection;

  try {
    connection = await getConnection();
    
    // Actualizar cupos
    await connection.execute(
      'UPDATE cupos SET total = ? WHERE bloque = ? AND sede = ? AND fecha = CURDATE()', 
      [cantidad, bloque, sede]
    );

    // Devolver la lista actualizada
    const [rows] = await connection.execute("SELECT * FROM cupos WHERE fecha = CURDATE()");
    
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

    return NextResponse.json({ message: "Actualizado", cupos });

  } catch (error) {
    console.error("Error Update:", error);
    return new Response('Error actualizando', { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}