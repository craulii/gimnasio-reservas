import pool from '../../lib/db';

export async function GET(request) {
  try {
    console.log(`[${new Date().toISOString()}] Cargando cupos del día...`);
    
    await ejecutarMantenimientoSiEsNecesario();
    
    const { searchParams } = new URL(request.url);
    const sede = searchParams.get('sede');

    let query = `
      SELECT bloque, sede, total, reservados 
      FROM cupos 
      WHERE fecha = CURDATE()
    `;
    let params = [];

    if (sede) {
      query += ' AND sede = ?';
      params.push(sede);
    }

    query += ` ORDER BY 
      CAST(SUBSTRING_INDEX(bloque, '-', 1) AS UNSIGNED),
      CAST(SUBSTRING_INDEX(bloque, '-', -1) AS UNSIGNED),
      sede
    `;
    
    const [rows] = await pool.query(query, params);
    
    const cupos = {};
    for (const row of rows) {
      const key = `${row.bloque}-${row.sede}`;
      cupos[key] = {
        bloque: row.bloque,
        sede: row.sede,
        total: row.total,
        reservados: row.reservados,
        disponibles: row.total - row.reservados
      };
    }

    console.log(`Cupos cargados: ${Object.keys(cupos).length} bloques para ${new Date().toISOString().split('T')[0]}`);

    return new Response(JSON.stringify(cupos), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
    });
  } catch (error) {
    console.error('Error cargando cupos:', error);
    return new Response(JSON.stringify({ error: 'Error al obtener cupos' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PATCH(request) {
  const userHeader = request.headers.get('x-user');
  if (!userHeader) return new Response('No autorizado', { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.rol !== 'admin') return new Response('Solo admin puede modificar cupos', { status: 403 });

  const { bloque, sede, cantidad } = await request.json();
  if (!bloque || !sede || typeof cantidad !== 'number') {
    return new Response('Datos inválidos (se requiere bloque, sede y cantidad)', { status: 400 });
  }

  try {
    console.log(`[${new Date().toISOString()}] Admin modificando cupos: ${bloque} en ${sede} a ${cantidad}`);
    
    await ejecutarMantenimientoSiEsNecesario();
    
    const [rows] = await pool.query(
      'SELECT total, reservados FROM cupos WHERE bloque = ? AND sede = ? AND fecha = CURDATE()', 
      [bloque, sede]
    );

    if (rows.length === 0) {
      return new Response(`Bloque ${bloque} en ${sede} no encontrado para hoy`, { status: 404 });
    }

    if (cantidad < 0) {
      return new Response('La cantidad no puede ser negativa', { status: 400 });
    }
    
    if (cantidad < rows[0].reservados) {
      return new Response(
        `No se puede reducir a ${cantidad}. Hay ${rows[0].reservados} reservas activas hoy en ${sede}.`, 
        { status: 400 }
      );
    }

    await pool.query(
      'UPDATE cupos SET total = ? WHERE bloque = ? AND sede = ? AND fecha = CURDATE()', 
      [cantidad, bloque, sede]
    );

    const [allRows] = await pool.query(`
      SELECT bloque, sede, total, reservados 
      FROM cupos 
      WHERE fecha = CURDATE() 
      ORDER BY 
        CAST(SUBSTRING_INDEX(bloque, '-', 1) AS UNSIGNED),
        CAST(SUBSTRING_INDEX(bloque, '-', -1) AS UNSIGNED),
        sede
    `);
    
    const cupos = {};
    for (const row of allRows) {
      const key = `${row.bloque}-${row.sede}`;
      cupos[key] = {
        bloque: row.bloque,
        sede: row.sede,
        total: row.total,
        reservados: row.reservados,
        disponibles: row.total - row.reservados
      };
    }

    console.log(`Cupos actualizados: ${bloque} en ${sede} = ${cantidad}`);

    return new Response(
      JSON.stringify({ 
        message: `Cupos de ${bloque} en ${sede} actualizados a ${cantidad}`, 
        cupos 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error actualizando cupos:', error);
    return new Response('Error actualizando cupos', { status: 500 });
  }
}

async function ejecutarMantenimientoSiEsNecesario() {
  try {
    const [existentes] = await pool.query(
      'SELECT COUNT(*) as count FROM cupos WHERE fecha = CURDATE()'
    );
    
    if (existentes[0].count === 0) {
      console.log('Generando cupos para hoy (backup del Event Scheduler)...');
      
      await pool.query('CALL GenerarCuposDiarios()');
      
      console.log('Cupos generados por backup del Event Scheduler');
    }
  } catch (error) {
    console.error('Error en mantenimiento backup:', error);
  }
}