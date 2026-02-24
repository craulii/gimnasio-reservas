/**
 * Tests unitarios - verifican lógica pura sin BD
 * Ejecutar: node tests/unit.test.js
 */

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, name) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32mOK\x1b[0m ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  \x1b[31mFAIL\x1b[0m ${name}`);
  }
}

// ============================================================
// TEST 1: db.js no tiene credenciales hardcodeadas
// ============================================================
console.log('\n\x1b[1m[1] Verificar que db.js no tiene credenciales hardcodeadas\x1b[0m');

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const dbContent = fs.readFileSync(path.join(root, 'src/lib/db.js'), 'utf8');
assert(!dbContent.includes('CrauliChris69'), 'db.js no contiene password hardcodeado');
assert(!dbContent.includes('reservas_crauli'), 'db.js no contiene user hardcodeado');
assert(dbContent.includes('process.env.DB_USER'), 'db.js usa process.env.DB_USER');
assert(dbContent.includes('process.env.DB_PASSWORD'), 'db.js usa process.env.DB_PASSWORD');
assert(dbContent.includes('process.env.DB_NAME'), 'db.js usa process.env.DB_NAME');

// ============================================================
// TEST 2: Ningún route.js tiene credenciales hardcodeadas
// ============================================================
console.log('\n\x1b[1m[2] Verificar que NINGÚN route.js tiene credenciales\x1b[0m');

function findFiles(dir, pattern) {
  let results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      results = results.concat(findFiles(fullPath, pattern));
    } else if (item.name.match(pattern)) {
      results.push(fullPath);
    }
  }
  return results;
}

const routeFiles = findFiles(path.join(root, 'src/app/api'), /route\.js$/);
assert(routeFiles.length >= 18, `Encontrados ${routeFiles.length} route.js (esperado >=18)`);

for (const file of routeFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  assert(!content.includes('CrauliChris69'), `${rel} no tiene password hardcodeado`);
  assert(!content.includes("password: 'root'"), `${rel} no tiene password root`);
  assert(!content.includes('const dbConfig'), `${rel} no tiene dbConfig local`);
}

// ============================================================
// TEST 3: Todos los route.js importan pool desde @/lib/db
// ============================================================
console.log('\n\x1b[1m[3] Verificar imports de pool centralizados\x1b[0m');

for (const file of routeFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  // Cada route debe usar pool o no usar DB directamente
  const usesDB = content.includes('pool') || content.includes('mysql');
  if (usesDB) {
    assert(
      content.includes('from "@/lib/db"') || content.includes("from '@/lib/db'"),
      `${rel} importa desde @/lib/db`
    );
    assert(
      !content.includes("import mysql from"),
      `${rel} NO importa mysql directamente`
    );
  }
}

// ============================================================
// TEST 4: asistencia-masiva no usa JSON.parse en headers (Issue #4)
// ============================================================
console.log('\n\x1b[1m[4] Verificar fix Issue #4 - asistencia-masiva\x1b[0m');

const asistMasiva = fs.readFileSync(
  path.join(root, 'src/app/api/admin/asistencia-masiva/route.js'), 'utf8'
);
assert(!asistMasiva.includes('JSON.parse(userHeader)'), 'No usa JSON.parse en header de usuario');
assert(asistMasiva.includes('request.headers.get("x-user")'), 'Usa request.headers.get("x-user")');
assert(asistMasiva.includes('request.headers.get("x-user-type")'), 'Usa request.headers.get("x-user-type")');

// ============================================================
// TEST 5: usuarios PUT hashea password (Issue #2)
// ============================================================
console.log('\n\x1b[1m[5] Verificar fix Issue #2 - password hasheado\x1b[0m');

const usuarios = fs.readFileSync(
  path.join(root, 'src/app/api/admin/usuarios/route.js'), 'utf8'
);
assert(usuarios.includes('bcrypt.hash(password'), 'PUT hashea password con bcrypt');
assert(usuarios.includes('import bcrypt'), 'Importa bcrypt');

// ============================================================
// TEST 6: reservas-por-bloque filtra por sede (Issue #3)
// ============================================================
console.log('\n\x1b[1m[6] Verificar fix Issue #3 - filtro por sede\x1b[0m');

const reservasBloque = fs.readFileSync(
  path.join(root, 'src/app/api/admin/reservas-por-bloque/route.js'), 'utf8'
);
assert(reservasBloque.includes('searchParams.get("sede")'), 'Backend acepta parámetro sede');
assert(reservasBloque.includes('r.sede = ?'), 'Backend filtra con AND r.sede = ?');

const apiService = fs.readFileSync(path.join(root, 'src/services/api.js'), 'utf8');
assert(apiService.includes('getReservasPorBloque(sede'), 'API service acepta parámetro sede');

const reservasTab = fs.readFileSync(
  path.join(root, 'src/components/admin/ReservasTab.js'), 'utf8'
);
assert(reservasTab.includes('setSede'), 'ReservasTab tiene selector de sede');

// ============================================================
// TEST 7: reservas POST usa FOR UPDATE (Issue #5)
// ============================================================
console.log('\n\x1b[1m[7] Verificar fix Issue #5 - race condition\x1b[0m');

const reservas = fs.readFileSync(
  path.join(root, 'src/app/api/reservas/route.js'), 'utf8'
);
assert(reservas.includes('FOR UPDATE'), 'Usa FOR UPDATE para lock de cupos');
assert(reservas.includes('beginTransaction'), 'Usa transacción');

// Verificar que el SELECT de cupos está DESPUÉS de beginTransaction
const txStart = reservas.indexOf('beginTransaction');
const forUpdate = reservas.indexOf('FOR UPDATE');
assert(forUpdate > txStart, 'FOR UPDATE está dentro de la transacción (después de beginTransaction)');

// ============================================================
// TEST 8: procesar-ausencias usa comparación numérica (Issue #13)
// ============================================================
console.log('\n\x1b[1m[8] Verificar fix Issue #13 - comparación de hora\x1b[0m');

const procesarAusencias = fs.readFileSync(
  path.join(root, 'src/app/api/admin/procesar-ausencias/route.js'), 'utf8'
);
assert(procesarAusencias.includes('horaAMinutos'), 'Usa función horaAMinutos para comparar horas');
assert(!procesarAusencias.includes('horaActual < horaLimite') ||
       procesarAusencias.includes('horaAMinutos(horaActual) < horaAMinutos(horaLimite)'),
       'Compara minutos numéricos, no strings');

// ============================================================
// TEST 9: constants.js tiene los nuevos exports (Issues #7, #14, #15)
// ============================================================
console.log('\n\x1b[1m[9] Verificar constants.js actualizado\x1b[0m');

const constants = fs.readFileSync(
  path.join(root, 'src/app/utils/constants.js'), 'utf8'
);
assert(constants.includes('HORARIOS_LIMITE'), 'Tiene HORARIOS_LIMITE centralizado (#15)');
assert(constants.includes('BLOQUE_REGEX'), 'Tiene BLOQUE_REGEX (#14)');
assert(constants.includes('getFechaChile'), 'Tiene getFechaChile (#7)');
assert(constants.includes('getHoraChile'), 'Tiene getHoraChile (#7)');
assert(constants.includes("America/Santiago"), 'Usa timezone America/Santiago');

// ============================================================
// TEST 10: procesar-ausencias importa HORARIOS_LIMITE desde constants (#15)
// ============================================================
console.log('\n\x1b[1m[10] Verificar centralización HORARIOS_LIMITE\x1b[0m');

assert(
  procesarAusencias.includes('HORARIOS_LIMITE') &&
  procesarAusencias.includes('from "@/app/utils/constants"'),
  'procesar-ausencias importa HORARIOS_LIMITE desde constants'
);
assert(
  !procesarAusencias.includes('const HORARIOS_LIMITE = {'),
  'procesar-ausencias NO tiene HORARIOS_LIMITE hardcodeado localmente'
);

// ============================================================
// TEST 11: usuarios PUT valida email @usm.cl (Issue #10)
// ============================================================
console.log('\n\x1b[1m[11] Verificar validación email @usm.cl en edit\x1b[0m');

assert(usuarios.includes('usm\\.cl'), 'PUT valida regex @usm.cl');
assert(usuarios.includes('Email debe ser @usm.cl'), 'Tiene mensaje de error para email no @usm.cl');

// ============================================================
// TEST 12: page.js sin código muerto (Issue #11)
// ============================================================
console.log('\n\x1b[1m[12] Verificar page.js sin código muerto\x1b[0m');

const page = fs.readFileSync(path.join(root, 'src/app/page.js'), 'utf8');
assert(!page.includes("user.rol === 'admin'"), 'No tiene comparación muerta user.rol');
assert(page.includes("user.role_type === 'admin'"), 'Usa user.role_type correctamente');

// ============================================================
// TEST 13: exportar parsea mes como Number (Issue #18)
// ============================================================
console.log('\n\x1b[1m[13] Verificar fix Issue #18 - parseo de fecha\x1b[0m');

const exportar = fs.readFileSync(
  path.join(root, 'src/app/api/admin/exportar/route.js'), 'utf8'
);
assert(exportar.includes(".split('-').map(Number)"), 'Parsea year/month como Number');

// ============================================================
// TEST 14: rate-limit.js existe y funciona
// ============================================================
console.log('\n\x1b[1m[14] Verificar rate limiting\x1b[0m');

const rateLimit = fs.readFileSync(path.join(root, 'src/lib/rate-limit.js'), 'utf8');
assert(rateLimit.includes('checkRateLimit'), 'Exporta checkRateLimit');
assert(rateLimit.includes('MAX_ATTEMPTS'), 'Tiene MAX_ATTEMPTS configurado');

const login = fs.readFileSync(path.join(root, 'src/app/api/login/route.js'), 'utf8');
assert(login.includes('checkRateLimit'), 'Login usa rate limiting');
assert(login.includes('429'), 'Login retorna 429 al exceder límite');

const register = fs.readFileSync(path.join(root, 'src/app/api/register/route.js'), 'utf8');
assert(register.includes('checkRateLimit'), 'Register usa rate limiting');

// ============================================================
// TEST 15: .env.example existe, .env NO se commitea
// ============================================================
console.log('\n\x1b[1m[15] Verificar archivos de entorno\x1b[0m');

assert(fs.existsSync(path.join(root, '.env.example')), '.env.example existe');
assert(fs.existsSync(path.join(root, '.env')), '.env existe localmente');

const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
assert(!envExample.includes('CrauliChris69'), '.env.example no tiene passwords reales');
assert(envExample.includes('DB_HOST'), '.env.example tiene DB_HOST');

const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
assert(gitignore.includes('.env'), '.gitignore incluye .env');

// ============================================================
// TEST 16: Frontend fixes
// ============================================================
console.log('\n\x1b[1m[16] Verificar fixes de frontend\x1b[0m');

const loginForm = fs.readFileSync(
  path.join(root, 'src/components/auth/LoginForm.js'), 'utf8'
);
assert(!loginForm.includes('onKeyPress'), 'LoginForm no usa onKeyPress deprecado');
assert(loginForm.includes('onKeyDown'), 'LoginForm usa onKeyDown');
assert(loginForm.includes('data.user'), 'LoginForm lee data.user correctamente');

const reservarCupo = fs.readFileSync(
  path.join(root, 'src/components/alumno/ReservarCupo.js'), 'utf8'
);
assert(
  reservarCupo.includes('data?.error || data?.message'),
  'ReservarCupo extrae error correctamente (no muestra [object Object])'
);

const reservasTabContent = fs.readFileSync(
  path.join(root, 'src/components/admin/ReservasTab.js'), 'utf8'
);
assert(
  reservasTabContent.includes("typeof data === 'object'"),
  'ReservasTab valida datos defensivamente (#19)'
);

// ============================================================
// TEST 17: Conexiones usan release() no end() para pool
// ============================================================
console.log('\n\x1b[1m[17] Verificar patrón de conexiones (release vs end)\x1b[0m');

const filesWithTransactions = [
  'src/app/api/admin/cancelar-reserva/route.js',
  'src/app/api/admin/boton-panico/route.js',
  'src/app/api/admin/mantenimiento/route.js',
  'src/app/api/admin/procesar-ausencias/route.js',
  'src/app/api/admin/usuarios/route.js',
  'src/app/api/reservas/route.js',
];

for (const file of filesWithTransactions) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  const rel = file;
  if (content.includes('getConnection')) {
    assert(content.includes('.release()'), `${rel} usa .release() (no .end())`);
    assert(!content.includes('connection.end()'), `${rel} NO usa .end() en conexiones de pool`);
  }
}

// ============================================================
// TEST 18: test/route.js y users/route.js migrados
// ============================================================
console.log('\n\x1b[1m[18] Verificar archivos olvidados ahora migrados\x1b[0m');

const testRoute = fs.readFileSync(path.join(root, 'src/app/api/test/route.js'), 'utf8');
assert(!testRoute.includes("password: \"root\""), 'test/route.js no tiene password root');
assert(testRoute.includes('@/lib/db'), 'test/route.js usa pool centralizado');

const usersRoute = fs.readFileSync(path.join(root, 'src/app/api/users/route.js'), 'utf8');
assert(!usersRoute.includes('CrauliChris69'), 'users/route.js no tiene password hardcodeado');
assert(usersRoute.includes('@/lib/db'), 'users/route.js usa pool centralizado');
assert(!usersRoute.includes('connection.end()'), 'users/route.js no usa connection.end()');

// ============================================================
// RESULTADOS
// ============================================================
console.log('\n' + '='.repeat(55));
console.log(`\x1b[1m  RESULTADOS: ${passed} passed, ${failed} failed, ${passed + failed} total\x1b[0m`);
console.log('='.repeat(55));

if (failed > 0) {
  console.log('\n\x1b[31mFallas:\x1b[0m');
  failures.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
} else {
  console.log('\n\x1b[32mTodos los tests pasaron.\x1b[0m\n');
  process.exit(0);
}
