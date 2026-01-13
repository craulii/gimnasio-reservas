import mysql from 'mysql2/promise'; // O require('mysql2')

const pool = mysql.createPool({
  host: '127.0.0.1',        // <--- PUESTO A MANO
  port: 3306,               // <--- PUESTO A MANO (Número, sin comillas)
  user: 'reservas_crauli',  // <--- PUESTO A MANO
  password: 'CrauliChris69!', // <--- PUESTO A MANO
  database: 'reservas_gymusm', // <--- PUESTO A MANO
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;