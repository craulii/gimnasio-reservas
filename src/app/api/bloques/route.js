import pool from '../../lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT * FROM bloques');
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error al obtener bloques:', err);
    return new Response('Error interno', { status: 500 });
  }
}

export async function POST(request) {
  const { bloque, cupos_maximos } = await request.json();
  if (!bloque || !cupos_maximos) {
    return new Response('Datos incompletos', { status: 400 });
  }

  try {
    await pool.query('INSERT INTO bloques (bloque, cupos_maximos) VALUES (?, ?)', [bloque, cupos_maximos]);
    return new Response('Bloque creado', { status: 201 });
  } catch (err) {
    console.error('Error al crear bloque:', err);
    return new Response('Error interno', { status: 500 });
  }
}

export async function PUT(request) {
  const { bloque, nuevos_cupos } = await request.json();
  if (!bloque || nuevos_cupos === undefined) {
    return new Response('Datos incompletos', { status: 400 });
  }

  try {
    const [result] = await pool.query('UPDATE bloques SET cupos_maximos = ? WHERE bloque = ?', [nuevos_cupos, bloque]);
    if (result.affectedRows === 0) {
      return new Response('Bloque no encontrado', { status: 404 });
    }
    return new Response('Bloque actualizado', { status: 200 });
  } catch (err) {
    console.error('Error al actualizar bloque:', err);
    return new Response('Error interno', { status: 500 });
  }
}

export async function DELETE(request) {
  const { bloque } = await request.json();
  if (!bloque) {
    return new Response('Bloque no especificado', { status: 400 });
  }

  try {
    const [result] = await pool.query('DELETE FROM bloques WHERE bloque = ?', [bloque]);
    if (result.affectedRows === 0) {
      return new Response('Bloque no encontrado', { status: 404 });
    }
    return new Response('Bloque eliminado', { status: 200 });
  } catch (err) {
    console.error('Error al eliminar bloque:', err);
    return new Response('Error interno', { status: 500 });
  }
}
