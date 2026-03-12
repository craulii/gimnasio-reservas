/**
 * Tests de bug fixes
 * Verifican que cada issue reportado esté correctamente arreglado
 *
 * Ejecutar: node tests/bugfixes.test.js
 */

const { describe, it, assert, run, readFile } = require('./runner');

// ============================================================
// Issue #2: Password no se hashea al editar usuario
// ============================================================

describe('Issue #2 - Password hasheado en PUT usuarios', () => {
  const usuarios = readFile('src/app/api/admin/usuarios/route.js');

  it('importa bcrypt', () => {
    assert.includes(usuarios, 'import bcrypt');
  });

  it('PUT hashea password con bcrypt.hash', () => {
    assert.includes(usuarios, 'bcrypt.hash(password');
  });

  it('no guarda password en texto plano', () => {
    assert.notIncludes(usuarios, "updateParams.push(password)");
  });
});

// ============================================================
// Issue #3: Reservas no se diferencian por campus
// ============================================================

describe('Issue #3 - Filtro por sede en reservas', () => {
  const backend = readFile('src/app/api/admin/reservas-por-bloque/route.js');

  it('backend acepta parámetro sede', () => {
    assert.includes(backend, 'searchParams.get("sede")');
  });

  it('backend filtra con AND r.sede = ?', () => {
    assert.includes(backend, 'r.sede = ?');
  });

  const api = readFile('src/services/api.js');

  it('API service acepta parámetro sede', () => {
    assert.includes(api, 'getReservasPorBloque(sede');
  });

  it('API service envía sede como query param', () => {
    assert.includes(api, 'encodeURIComponent(sede)');
  });

  const tab = readFile('src/components/admin/ReservasTab.js');

  it('ReservasTab tiene estado sede', () => {
    assert.includes(tab, 'setSede');
  });

  it('ReservasTab tiene selector Vitacura/San Joaquín', () => {
    assert.includes(tab, 'Vitacura');
    assert.includes(tab, 'San Joaqu');
  });
});

// ============================================================
// Issue #4: "Cargar alumnos" no funciona (asistencia-masiva)
// ============================================================

describe('Issue #4 - asistencia-masiva headers', () => {
  const content = readFile('src/app/api/admin/asistencia-masiva/route.js');

  it('NO usa JSON.parse en header de usuario', () => {
    assert.notIncludes(content, 'JSON.parse(userHeader)');
  });

  it('usa getUserFromRequest para auth', () => {
    assert.includes(content, 'getUserFromRequest');
  });

  it('verifica rol admin', () => {
    assert.includes(content, 'admin');
    assert.includes(content, '403');
  });
});

// ============================================================
// Issue #5: Race condition en reservas
// ============================================================

describe('Issue #5 - Race condition (FOR UPDATE)', () => {
  const reservas = readFile('src/app/api/reservas/route.js');

  it('usa FOR UPDATE para lock de cupos', () => {
    assert.includes(reservas, 'FOR UPDATE');
  });

  it('usa beginTransaction', () => {
    assert.includes(reservas, 'beginTransaction');
  });

  it('FOR UPDATE está DESPUÉS de beginTransaction', () => {
    const txStart = reservas.indexOf('beginTransaction');
    const forUpdate = reservas.indexOf('FOR UPDATE');
    assert.gt(forUpdate, txStart, 'FOR UPDATE debe estar dentro de la transacción');
  });

  it('usa pool.getConnection() para transacción', () => {
    assert.includes(reservas, 'pool.getConnection()');
  });

  it('hace rollback en caso de error', () => {
    assert.includes(reservas, 'rollback');
  });

  it('hace commit al final', () => {
    assert.includes(reservas, 'commit');
  });

  it('verifica reserva existente DENTRO de la transacción', () => {
    const txStart = reservas.indexOf('beginTransaction');
    const checkReserva = reservas.indexOf('SELECT id FROM reservas WHERE email');
    assert.gt(checkReserva, txStart, 'Check de reserva duplicada debe estar dentro de TX');
  });
});

// ============================================================
// Issue #7: Timezone inconsistente
// ============================================================

describe('Issue #7 - Timezone Chile', () => {
  const constants = readFile('src/app/utils/constants.js');

  it('tiene getFechaChile()', () => {
    assert.includes(constants, 'getFechaChile');
  });

  it('tiene getHoraChile()', () => {
    assert.includes(constants, 'getHoraChile');
  });

  it('usa timezone America/Santiago', () => {
    assert.includes(constants, 'America/Santiago');
  });

  it('getFechaChile exportada', () => {
    assert.includes(constants, 'export function getFechaChile');
  });

  it('getHoraChile exportada', () => {
    assert.includes(constants, 'export function getHoraChile');
  });
});

// ============================================================
// Issue #10: Email @usm.cl no se valida al editar
// ============================================================

describe('Issue #10 - Validación email @usm.cl en edición', () => {
  const usuarios = readFile('src/app/api/admin/usuarios/route.js');

  it('PUT valida regex @usm.cl', () => {
    assert.includes(usuarios, 'usm\\.cl');
  });

  it('tiene mensaje de error para email inválido', () => {
    assert.includes(usuarios, 'Email debe ser @usm.cl');
  });
});

// ============================================================
// Issue #11: Código muerto user.rol
// ============================================================

describe('Issue #11 - Sin código muerto en page.js', () => {
  const page = readFile('src/app/page.js');

  it('no tiene comparación muerta user.rol', () => {
    assert.notIncludes(page, "user.rol === 'admin'");
  });

  it('usa user.role_type correctamente', () => {
    assert.includes(page, "user.role_type === 'admin'");
  });
});

// ============================================================
// Issue #13: Comparación de hora por string
// ============================================================

describe('Issue #13 - Comparación numérica de hora', () => {
  const content = readFile('src/app/api/admin/procesar-ausencias/route.js');

  it('tiene función horaAMinutos', () => {
    assert.includes(content, 'horaAMinutos');
  });

  it('convierte HH:MM a minutos numéricos', () => {
    assert.ok(
      content.includes("split(':')") || content.includes('split(":")'),
      'Debe separar por ":" para extraer horas y minutos'
    );
  });
});

// ============================================================
// Issue #14: BLOQUE_REGEX
// ============================================================

describe('Issue #14 - Validación formato bloque', () => {
  const constants = readFile('src/app/utils/constants.js');

  it('tiene BLOQUE_REGEX exportado', () => {
    assert.includes(constants, 'BLOQUE_REGEX');
  });

  it('regex valida formato N-N', () => {
    assert.includes(constants, '\\d');
  });
});

// ============================================================
// Issue #15: HORARIOS_LIMITE centralizados
// ============================================================

describe('Issue #15 - HORARIOS_LIMITE centralizados', () => {
  const constants = readFile('src/app/utils/constants.js');

  it('constants.js tiene HORARIOS_LIMITE', () => {
    assert.includes(constants, 'HORARIOS_LIMITE');
  });

  it('incluye bloque 1-2', () => {
    assert.includes(constants, '"1-2"');
  });

  const procesar = readFile('src/app/api/admin/procesar-ausencias/route.js');

  it('procesar-ausencias importa HORARIOS_LIMITE desde constants', () => {
    assert.includes(procesar, 'HORARIOS_LIMITE');
    assert.includes(procesar, 'from "@/app/utils/constants"');
  });

  it('procesar-ausencias NO tiene HORARIOS_LIMITE hardcodeado', () => {
    assert.notIncludes(procesar, 'const HORARIOS_LIMITE = {');
  });
});

// ============================================================
// Issue #18: Cálculo fecha exportación
// ============================================================

describe('Issue #18 - Parseo de fecha en exportar', () => {
  const exportar = readFile('src/app/api/admin/exportar/route.js');

  it('parsea year/month como Number', () => {
    assert.includes(exportar, ".split('-').map(Number)");
  });
});

// ============================================================
// Issue #19: Frontend no valida datos del API
// ============================================================

describe('Issue #19 - Validación defensiva en ReservasTab', () => {
  const tab = readFile('src/components/admin/ReservasTab.js');

  it('valida que data sea objeto', () => {
    assert.includes(tab, "typeof data === 'object'");
  });

  it('verifica que no sea Array', () => {
    assert.includes(tab, 'Array.isArray');
  });
});

// ============================================================
// Frontend: LoginForm fixes
// ============================================================

describe('Frontend - LoginForm fixes', () => {
  const form = readFile('src/components/auth/LoginForm.js');

  it('no usa onKeyPress (deprecado)', () => {
    assert.notIncludes(form, 'onKeyPress');
  });

  it('usa onKeyDown', () => {
    assert.includes(form, 'onKeyDown');
  });

  it('lee data.user correctamente', () => {
    assert.includes(form, 'data.user');
  });

  it('verifica data.user antes de usar', () => {
    assert.includes(form, 'ok && data.user');
  });

  it('usa role_type para determinar tipo usuario', () => {
    assert.includes(form, 'role_type');
  });
});

// ============================================================
// Frontend: ReservarCupo error display
// ============================================================

describe('Frontend - ReservarCupo error display', () => {
  const content = readFile('src/components/alumno/ReservarCupo.js');

  it('extrae error correctamente (no [object Object])', () => {
    assert.includes(content, 'data?.error || data?.message');
  });

  it('convierte mensajes a String()', () => {
    assert.includes(content, 'String(');
  });
});

// ============================================================
// Issue #20: Race conditions (faltas infladas, cupos duplicados, overbooking)
// ============================================================

describe('Issue #20 - Faltas infladas (procesar-ausencias)', () => {
  const content = readFile('src/lib/procesar-ausencias.js');

  it('UPDATE reservas usa AND asistio IS NULL (atómico)', () => {
    assert.includes(content, 'AND asistio IS NULL');
  });

  it('chequea affectedRows antes de incrementar faltas', () => {
    assert.includes(content, 'affectedRows');
  });

  it('salta reserva si ya fue procesada (affectedRows === 0)', () => {
    assert.includes(content, 'affectedRows === 0');
  });
});

describe('Issue #20 - Cupos duplicados (ON CONFLICT)', () => {
  const cupos = readFile('src/app/api/cupos/route.js');
  const mantenimiento = readFile('src/app/api/admin/mantenimiento/route.js');

  it('autoGenerarCupos usa ON CONFLICT DO NOTHING', () => {
    assert.includes(cupos, 'ON CONFLICT');
    assert.includes(cupos, 'DO NOTHING');
  });

  it('generarCuposSemana usa ON CONFLICT DO NOTHING', () => {
    assert.includes(mantenimiento, 'ON CONFLICT');
    assert.includes(mantenimiento, 'DO NOTHING');
  });
});

describe('Issue #20 - Overbooking (sync query eliminado)', () => {
  const cupos = readFile('src/app/api/cupos/route.js');

  it('GET /api/cupos NO tiene UPDATE cupos SET reservados en línea', () => {
    // El sync query causaba overbooking al resetear reservados durante reservas concurrentes
    assert.notIncludes(cupos, 'UPDATE cupos c');
  });

  it('GET /api/cupos NO tiene subquery COUNT de reservas para sync', () => {
    assert.notIncludes(cupos, 'SET reservados = (');
  });
});

describe('Issue #20 - FOR UPDATE con LIMIT 1', () => {
  const reservas = readFile('src/app/api/reservas/route.js');

  it('SELECT FOR UPDATE usa LIMIT 1', () => {
    assert.includes(reservas, 'LIMIT 1 FOR UPDATE');
  });
});

describe('Issue #20 - UNIQUE constraints en schema', () => {
  const schema = readFile('supabase-schema.sql');

  it('schema tiene UNIQUE constraint en cupos(bloque, sede, fecha)', () => {
    assert.includes(schema, 'cupos_bloque_sede_fecha_unique');
  });

  it('schema tiene UNIQUE constraint en reservas(email, fecha)', () => {
    assert.includes(schema, 'reservas_email_fecha_unique');
  });
});

run();
