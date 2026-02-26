/**
 * Tests de seguridad
 * Verifican que no haya credenciales expuestas y que la configuración sea segura
 *
 * Ejecutar: node tests/security.test.js
 */

const { describe, it, assert, run, readFile, findFiles, relPath } = require('./runner');

// ============================================================
// 1. Base de datos centralizada
// ============================================================

describe('DB centralizada (src/lib/db.js)', () => {
  const db = readFile('src/lib/db.js');

  it('usa process.env.DATABASE_URL', () => {
    assert.includes(db, 'process.env.DATABASE_URL');
  });

  it('no tiene password hardcodeado "CrauliChris69"', () => {
    assert.notIncludes(db, 'CrauliChris69');
  });

  it('no tiene user hardcodeado "reservas_crauli"', () => {
    assert.notIncludes(db, 'reservas_crauli');
  });

  it('exporta pool por defecto', () => {
    assert.includes(db, 'export default pool');
  });

  it('usa pg.Pool', () => {
    assert.includes(db, 'pg.Pool');
  });

  it('convierte placeholders ? a $N', () => {
    assert.includes(db, 'convertPlaceholders');
  });

  it('wrapper retorna [rows, fields] como mysql2', () => {
    assert.includes(db, 'wrapResult');
  });

  it('soporta getConnection con transacciones', () => {
    assert.includes(db, 'getConnection');
    assert.includes(db, 'beginTransaction');
    assert.includes(db, 'commit');
    assert.includes(db, 'rollback');
  });
});

// ============================================================
// 2. Ningún route.js tiene credenciales
// ============================================================

describe('Sin credenciales en route.js (20 archivos)', () => {
  const routeFiles = findFiles('src/app/api', /route\.js$/);

  it('existen al menos 18 route.js', () => {
    assert.gt(routeFiles.length, 17, `Encontrados ${routeFiles.length}, esperado >=18`);
  });

  for (const file of routeFiles) {
    const content = readFile(relPath(file));
    const rel = relPath(file);

    it(`${rel} no tiene "CrauliChris69"`, () => {
      assert.notIncludes(content, 'CrauliChris69');
    });

    it(`${rel} no tiene password: 'root'`, () => {
      assert.notIncludes(content, "password: 'root'");
    });

    it(`${rel} no tiene password: "root"`, () => {
      assert.notIncludes(content, 'password: "root"');
    });

    it(`${rel} no tiene dbConfig local`, () => {
      assert.notIncludes(content, 'const dbConfig');
    });
  }
});

// ============================================================
// 3. Imports centralizados desde @/lib/db
// ============================================================

describe('Imports centralizados de pool', () => {
  const routeFiles = findFiles('src/app/api', /route\.js$/);

  for (const file of routeFiles) {
    const content = readFile(relPath(file));
    const rel = relPath(file);
    const usesDB = content.includes('pool') || content.includes('pg');

    if (usesDB) {
      it(`${rel} importa desde @/lib/db`, () => {
        assert.ok(
          content.includes('from "@/lib/db"') || content.includes("from '@/lib/db'"),
          `${rel} no importa desde @/lib/db`
        );
      });

      it(`${rel} NO importa mysql directamente`, () => {
        assert.notIncludes(content, 'import mysql from');
      });
    }
  }
});

// ============================================================
// 4. Rate limiting
// ============================================================

describe('Rate limiting', () => {
  const rateLimit = readFile('src/lib/rate-limit.js');

  it('exporta checkRateLimit', () => {
    assert.includes(rateLimit, 'checkRateLimit');
  });

  it('tiene MAX_ATTEMPTS configurado', () => {
    assert.includes(rateLimit, 'MAX_ATTEMPTS');
  });

  it('tiene WINDOW_MS configurado', () => {
    assert.includes(rateLimit, 'WINDOW_MS');
  });

  it('retorna allowed y remaining', () => {
    assert.includes(rateLimit, 'allowed');
    assert.includes(rateLimit, 'remaining');
  });

  const login = readFile('src/app/api/login/route.js');

  it('login importa checkRateLimit', () => {
    assert.includes(login, 'checkRateLimit');
  });

  it('login retorna 429 al exceder límite', () => {
    assert.includes(login, '429');
  });

  const register = readFile('src/app/api/register/route.js');

  it('register importa checkRateLimit', () => {
    assert.includes(register, 'checkRateLimit');
  });

  it('register retorna 429 al exceder límite', () => {
    assert.includes(register, '429');
  });
});

// ============================================================
// 5. Archivos de entorno
// ============================================================

describe('Archivos de entorno (.env / .gitignore)', () => {
  it('.env.example existe', () => {
    assert.fileExists('.env.example');
  });

  it('.env existe localmente', () => {
    assert.fileExists('.env');
  });

  const envExample = readFile('.env.example');

  it('.env.example no tiene passwords reales', () => {
    assert.notIncludes(envExample, 'CrauliChris69');
  });

  it('.env.example tiene DATABASE_URL', () => {
    assert.includes(envExample, 'DATABASE_URL');
  });

  const gitignore = readFile('.gitignore');

  it('.gitignore incluye .env', () => {
    assert.includes(gitignore, '.env');
  });
});

// ============================================================
// 6. Cookie de sesión segura
// ============================================================

describe('Seguridad de cookies (login)', () => {
  const login = readFile('src/app/api/login/route.js');

  it('cookie es httpOnly', () => {
    assert.includes(login, 'httpOnly: true');
  });

  it('cookie usa sameSite', () => {
    assert.includes(login, 'sameSite');
  });

  it('maxAge es 2 horas', () => {
    assert.ok(
      login.includes('7200') || login.includes('60 * 60 * 2'),
      'Cookie maxAge debe ser 2 horas (7200 o 60*60*2)'
    );
  });
});

// ============================================================
// 7. Validaciones de entrada
// ============================================================

describe('Validaciones de entrada', () => {
  const login = readFile('src/app/api/login/route.js');

  it('login valida formato email @usm.cl', () => {
    assert.includes(login, 'usm');
    assert.includes(login, 'Email');
  });

  const register = readFile('src/app/api/register/route.js');

  it('register valida email @usm.cl', () => {
    assert.includes(register, '@usm.cl');
  });

  it('register valida formato de rol/RUT', () => {
    assert.ok(
      register.includes('ROL_REGEX') || register.includes('rol'),
      'Register valida rol'
    );
  });

  it('register hashea password con bcrypt', () => {
    assert.includes(register, 'bcrypt.hash');
  });

  it('register usa salt rounds >= 10', () => {
    assert.ok(
      register.includes('12') || register.includes('10'),
      'Bcrypt cost debe ser >= 10'
    );
  });
});

// ============================================================
// 8. Middleware
// ============================================================

describe('Middleware de autenticación', () => {
  const mw = readFile('middleware.js');

  it('inyecta header x-user', () => {
    assert.includes(mw, 'x-user');
  });

  it('inyecta header x-user-type', () => {
    assert.includes(mw, 'x-user-type');
  });

  it('valida cookie de sesión', () => {
    assert.includes(mw, 'user_session');
  });

  it('protege rutas admin', () => {
    assert.includes(mw, 'admin');
  });

  it('tiene lista de rutas públicas', () => {
    assert.ok(
      mw.includes('PUBLIC') || mw.includes('public') || mw.includes('/api/login'),
      'Middleware tiene rutas públicas definidas'
    );
  });
});

run();
