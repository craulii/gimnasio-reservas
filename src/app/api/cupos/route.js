import pool from '../../lib/db';

export async function GET() {
  try {
    console.log(`[${new Date().toISOString()}] Cargando cupos del día...`);
    
    await ejecutarMantenimientoSiEsNecesario();
    
    const [rows] = await pool.query(`
      SELECT bloque, total, reservados 
      FROM cupos 
      WHERE fecha = CURDATE() 
      ORDER BY 
        CAST(SUBSTRING_INDEX(bloque, '-', 1) AS UNSIGNED),
        CAST(SUBSTRING_INDEX(bloque, '-', -1) AS UNSIGNED)
    `);
    
    const cupos = {};
    for (const row of rows) {
      cupos[row.bloque] = {
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

  const { bloque, cantidad } = await request.json();
  if (!bloque || typeof cantidad !== 'number') {
    return new Response('Datos inválidos', { status: 400 });
  }

  try {
    console.log(`[${new Date().toISOString()}] Admin modificando cupos: ${bloque} ${cantidad > 0 ? '+' : ''}${cantidad}`);
    
    await ejecutarMantenimientoSiEsNecesario();
    
    const [rows] = await pool.query(
      'SELECT total, reservados FROM cupos WHERE bloque = ? AND fecha = CURDATE()', 
      [bloque]
    );

    if (rows.length === 0) {
      return new Response('Bloque no encontrado para hoy', { status: 404 });
    }

    let nuevoTotal = rows[0].total + cantidad;
    if (nuevoTotal < 0) nuevoTotal = 0;
    
    if (nuevoTotal < rows[0].reservados) {
      return new Response(
        `No se puede reducir a ${nuevoTotal}. Hay ${rows[0].reservados} reservas activas hoy.`, 
        { status: 400 }
      );
    }

    await pool.query(
      'UPDATE cupos SET total = ? WHERE bloque = ? AND fecha = CURDATE()', 
      [nuevoTotal, bloque]
    );

    const [allRows] = await pool.query(`
      SELECT bloque, total, reservados 
      FROM cupos 
      WHERE fecha = CURDATE() 
      ORDER BY 
        CAST(SUBSTRING_INDEX(bloque, '-', 1) AS UNSIGNED),
        CAST(SUBSTRING_INDEX(bloque, '-', -1) AS UNSIGNED)
    `);
    
    const cupos = {};
    for (const row of allRows) {
      cupos[row.bloque] = {
        total: row.total,
        reservados: row.reservados,
        disponibles: row.total - row.reservados
      };
    }

    console.log(`Cupos actualizados: ${bloque} = ${nuevoTotal}`);

    return new Response(
      JSON.stringify({ 
        message: `Cupos de ${bloque} actualizados a ${nuevoTotal}`, 
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