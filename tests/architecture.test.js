/**
 * Tests de arquitectura
 * Verifican patrones de código, estructura y convenciones del proyecto
 *
 * Ejecutar: node tests/architecture.test.js
 */

const { describe, it, assert, run, readFile, findFiles, relPath } = require('./runner');

// ============================================================
// 1. Patrón de conexiones: release() no end()
// ============================================================

describe('Patrón de conexiones (release vs end)', () => {
  const filesWithTransactions = [
    'src/app/api/admin/cancelar-reserva/route.js',
    'src/app/api/admin/boton-panico/route.js',
    'src/app/api/admin/mantenimiento/route.js',
    'src/app/api/admin/procesar-ausencias/route.js',
    'src/app/api/admin/usuarios/route.js',
    'src/app/api/reservas/route.js',
  ];

  for (const file of filesWithTransactions) {
    const content = readFile(file);
    if (content.includes('getConnection')) {
      it(`${file} usa .release()`, () => {
        assert.includes(content, '.release()');
      });

      it(`${file} NO usa connection.end()`, () => {
        assert.notIncludes(content, 'connection.end()');
      });

      it(`${file} tiene finally con release`, () => {
        assert.includes(content, 'finally');
      });
    }
  }
});

// ============================================================
// 2. Patrón de transacciones
// ============================================================

describe('Patrón de transacciones', () => {
  const transactionFiles = [
    'src/app/api/admin/cancelar-reserva/route.js',
    'src/app/api/admin/boton-panico/route.js',
    'src/app/api/admin/procesar-ausencias/route.js',
    'src/app/api/admin/asistencia-masiva/route.js',
    'src/app/api/reservas/route.js',
  ];

  for (const file of transactionFiles) {
    const content = readFile(file);

    it(`${file} tiene beginTransaction`, () => {
      assert.includes(content, 'beginTransaction');
    });

    it(`${file} tiene commit`, () => {
      assert.includes(content, 'commit');
    });

    it(`${file} tiene rollback`, () => {
      assert.includes(content, 'rollback');
    });
  }
});

// ============================================================
// 3. Estructura de archivos
// ============================================================

describe('Estructura de archivos del proyecto', () => {
  it('src/lib/db.js existe', () => {
    assert.fileExists('src/lib/db.js');
  });

  it('src/lib/rate-limit.js existe', () => {
    assert.fileExists('src/lib/rate-limit.js');
  });

  it('middleware.js existe', () => {
    assert.fileExists('middleware.js');
  });

  it('src/app/utils/constants.js existe', () => {
    assert.fileExists('src/app/utils/constants.js');
  });

  it('src/services/api.js existe', () => {
    assert.fileExists('src/services/api.js');
  });

  it('.env.example existe', () => {
    assert.fileExists('.env.example');
  });

  it('next.config.mjs existe', () => {
    assert.fileExists('next.config.mjs');
  });

  const routeFiles = findFiles('src/app/api', /route\.js$/);

  it('existen al menos 18 endpoints API', () => {
    assert.gt(routeFiles.length, 17);
  });
});

// ============================================================
// 4. Consistencia de API responses
// ============================================================

describe('Consistencia de respuestas API', () => {
  const routeFiles = findFiles('src/app/api', /route\.js$/);

  for (const file of routeFiles) {
    const content = readFile(relPath(file));
    const rel = relPath(file);

    it(`${rel} retorna JSON responses`, () => {
      assert.ok(
        content.includes('NextResponse.json') || content.includes('Response.json'),
        `${rel} debe retornar JSON via NextResponse.json() o Response.json()`
      );
    });
  }
});

// ============================================================
// 5. Manejo de errores en endpoints
// ============================================================

describe('Manejo de errores en endpoints', () => {
  const criticalEndpoints = [
    'src/app/api/login/route.js',
    'src/app/api/register/route.js',
    'src/app/api/reservas/route.js',
    'src/app/api/admin/usuarios/route.js',
    'src/app/api/admin/asistencia-masiva/route.js',
    'src/app/api/admin/cancelar-reserva/route.js',
  ];

  for (const file of criticalEndpoints) {
    const content = readFile(file);

    it(`${file} tiene try/catch`, () => {
      assert.includes(content, 'try {');
      assert.includes(content, 'catch');
    });

    it(`${file} retorna status 500 en error interno`, () => {
      assert.includes(content, '500');
    });
  }
});

// ============================================================
// 6. Archivos migrados (test y users)
// ============================================================

describe('Archivos olvidados ahora migrados', () => {
  const testRoute = readFile('src/app/api/test/route.js');

  it('test/route.js no tiene password "root"', () => {
    assert.notIncludes(testRoute, 'password: "root"');
  });

  it('test/route.js usa pool centralizado', () => {
    assert.includes(testRoute, '@/lib/db');
  });

  const usersRoute = readFile('src/app/api/users/route.js');

  it('users/route.js no tiene password hardcodeado', () => {
    assert.notIncludes(usersRoute, 'CrauliChris69');
  });

  it('users/route.js usa pool centralizado', () => {
    assert.includes(usersRoute, '@/lib/db');
  });

  it('users/route.js no usa connection.end()', () => {
    assert.notIncludes(usersRoute, 'connection.end()');
  });
});

// ============================================================
// 7. Next.js configuración (Vercel - sin standalone)
// ============================================================

describe('Configuración Next.js (Vercel)', () => {
  const config = readFile('next.config.mjs');

  it('no tiene output standalone (Vercel no lo necesita)', () => {
    assert.notIncludes(config, 'standalone');
  });
});

// ============================================================
// 8. Autorización consistente en endpoints admin
// ============================================================

describe('Autorización en endpoints admin', () => {
  const adminFiles = findFiles('src/app/api/admin', /route\.js$/);

  for (const file of adminFiles) {
    const content = readFile(relPath(file));
    const rel = relPath(file);

    it(`${rel} verifica autorización`, () => {
      assert.ok(
        content.includes('x-user-type') || content.includes('x-user') || content.includes('403'),
        `${rel} debe verificar autorización`
      );
    });
  }
});

// ============================================================
// 9. No hay mysql.createConnection directos
// ============================================================

describe('Sin imports directos de DB driver', () => {
  const routeFiles = findFiles('src/app/api', /route\.js$/);

  for (const file of routeFiles) {
    const content = readFile(relPath(file));
    const rel = relPath(file);

    it(`${rel} no importa pg directamente`, () => {
      assert.notIncludes(content, "from 'pg'");
      assert.notIncludes(content, 'from "pg"');
    });

    it(`${rel} no importa mysql2 directamente`, () => {
      assert.notIncludes(content, 'from "mysql2/promise"');
      assert.notIncludes(content, "from 'mysql2/promise'");
    });
  }
});

run();
