// insert-alumnos.js
import db from './src/app/lib/db.js';

const alumnos = Array.from({ length: 100 }, (_, i) => {
  const numero = 202100000 + i;
  return {
    rol: `${numero}-${i % 10}`, // ejemplo: 202100000-0, 202100001-1, etc.
    name: `Alumno ${i + 1}`,
    email: `alumno${i + 1}@usm.cl`,
    password: '123456', // por simplicidad, sin hashear (no recomendable en prod)
    is_admin: false
  };
});

const insertAlumnos = async () => {
  try {
    const values = alumnos.map(a => [a.rol, a.name, a.email, a.password, a.is_admin]);
    const [result] = await db.query(
      'INSERT INTO users (rol, name, email, password, is_admin) VALUES ?',
      [values]
    );
    console.log(`✅ Insertados ${result.affectedRows} alumnos`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al insertar alumnos:', error);
    process.exit(1);
  }
};

insertAlumnos();
