import mysql from 'mysql2/promise';

export async function GET() {
  try {
    const db = await mysql.createConnection({
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: 'root',
  database: 'gimnasio',
});


    const [rows] = await db.query('SELECT * FROM users');
    await db.end();
    return Response.json(rows);
  } catch (error) {
    console.error('Error al consultar la base de datos:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
