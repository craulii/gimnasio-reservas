/**
 * Mini framework de testing para gimnasio-reservas
 * Sin dependencias externas - solo Node.js
 *
 * Uso:
 *   const { describe, it, assert, run } = require('./runner');
 *   describe('Mi suite', () => {
 *     it('hace algo', () => assert.ok(true, 'funciona'));
 *   });
 *   run();
 */

const fs = require('fs');
const path = require('path');

// Colores ANSI
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

// Estado global
const suites = [];
let currentSuite = null;

// Root del proyecto
const ROOT = path.join(__dirname, '..');

// ============================================================
// API pública: describe / it
// ============================================================

function describe(name, fn) {
  const suite = { name, tests: [], passed: 0, failed: 0, failures: [] };
  suites.push(suite);
  currentSuite = suite;
  fn();
  currentSuite = null;
}

function it(name, fn) {
  if (!currentSuite) throw new Error('it() must be inside describe()');
  currentSuite.tests.push({ name, fn });
}

// ============================================================
// Assertions
// ============================================================

class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

const assert = {
  ok(value, msg) {
    if (!value) throw new AssertionError(msg || `Expected truthy, got ${JSON.stringify(value)}`);
  },

  equal(a, b, msg) {
    if (a !== b) throw new AssertionError(msg || `Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}`);
  },

  notEqual(a, b, msg) {
    if (a === b) throw new AssertionError(msg || `Expected ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
  },

  includes(str, substr, msg) {
    if (typeof str !== 'string' || !str.includes(substr)) {
      throw new AssertionError(msg || `Expected string to include "${substr}"`);
    }
  },

  notIncludes(str, substr, msg) {
    if (typeof str === 'string' && str.includes(substr)) {
      throw new AssertionError(msg || `Expected string NOT to include "${substr}"`);
    }
  },

  match(str, regex, msg) {
    if (!regex.test(str)) {
      throw new AssertionError(msg || `Expected string to match ${regex}`);
    }
  },

  gt(a, b, msg) {
    if (!(a > b)) throw new AssertionError(msg || `Expected ${a} > ${b}`);
  },

  fileExists(filePath, msg) {
    const full = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
    if (!fs.existsSync(full)) {
      throw new AssertionError(msg || `File not found: ${filePath}`);
    }
  },

  fileNotExists(filePath, msg) {
    const full = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
    if (fs.existsSync(full)) {
      throw new AssertionError(msg || `File should not exist: ${filePath}`);
    }
  },
};

// ============================================================
// Helpers
// ============================================================

function readFile(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function findFiles(dir, pattern) {
  let results = [];
  const fullDir = path.isAbsolute(dir) ? dir : path.join(ROOT, dir);
  const items = fs.readdirSync(fullDir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(fullDir, item.name);
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      results = results.concat(findFiles(fullPath, pattern));
    } else if (item.name.match(pattern)) {
      results.push(fullPath);
    }
  }
  return results;
}

function relPath(absPath) {
  return path.relative(ROOT, absPath);
}

// ============================================================
// Runner
// ============================================================

function run() {
  const startTime = Date.now();
  let totalPassed = 0;
  let totalFailed = 0;
  const allFailures = [];

  console.log(`\n${c.bold}${c.cyan}  Gimnasio Reservas - Test Suite${c.reset}`);
  console.log(`${c.dim}  ${'─'.repeat(50)}${c.reset}\n`);

  for (const suite of suites) {
    console.log(`${c.bold}  ${suite.name}${c.reset}`);

    for (const test of suite.tests) {
      try {
        test.fn();
        suite.passed++;
        totalPassed++;
        console.log(`    ${c.green}✓${c.reset} ${c.dim}${test.name}${c.reset}`);
      } catch (err) {
        suite.failed++;
        totalFailed++;
        const failMsg = `${suite.name} > ${test.name}`;
        suite.failures.push({ test: test.name, error: err.message });
        allFailures.push({ suite: suite.name, test: test.name, error: err.message });
        console.log(`    ${c.red}✗ ${test.name}${c.reset}`);
        console.log(`      ${c.red}${err.message}${c.reset}`);
      }
    }
    console.log('');
  }

  const elapsed = Date.now() - startTime;

  // Resumen
  console.log(`${c.dim}  ${'─'.repeat(50)}${c.reset}`);
  if (totalFailed === 0) {
    console.log(`  ${c.green}${c.bold}✓ ${totalPassed} tests pasaron${c.reset} ${c.dim}(${elapsed}ms)${c.reset}`);
  } else {
    console.log(`  ${c.green}${totalPassed} passed${c.reset}  ${c.red}${c.bold}${totalFailed} failed${c.reset} ${c.dim}(${elapsed}ms)${c.reset}`);
    console.log(`\n${c.red}${c.bold}  Fallas:${c.reset}`);
    for (const f of allFailures) {
      console.log(`  ${c.red}✗${c.reset} ${f.suite} > ${f.test}`);
      console.log(`    ${c.dim}${f.error}${c.reset}`);
    }
  }

  console.log('');
  process.exit(totalFailed > 0 ? 1 : 0);
}

module.exports = { describe, it, assert, run, readFile, findFiles, relPath, ROOT };
