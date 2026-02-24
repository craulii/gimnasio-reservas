#!/usr/bin/env node
/**
 * Ejecuta TODAS las suites de tests
 *
 * Uso:
 *   node tests/run-all.js          # todos los tests
 *   npm test                       # todos los tests
 *   npm run test:security          # solo seguridad
 *   npm run test:bugs              # solo bug fixes
 *   npm run test:arch              # solo arquitectura
 */

const { execSync } = require('child_process');
const path = require('path');

const suites = [
  { name: 'Seguridad', file: 'security.test.js' },
  { name: 'Bug Fixes', file: 'bugfixes.test.js' },
  { name: 'Arquitectura', file: 'architecture.test.js' },
];

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

console.log(`\n${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`);
console.log(`${c.bold}${c.cyan}  GIMNASIO RESERVAS - Suite Completa de Tests${c.reset}`);
console.log(`${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}\n`);

let allPassed = true;
const results = [];

for (const suite of suites) {
  const filePath = path.join(__dirname, suite.file);
  console.log(`${c.bold}▶ ${suite.name}${c.reset} ${c.dim}(${suite.file})${c.reset}`);
  console.log(`${c.dim}${'─'.repeat(52)}${c.reset}`);

  try {
    execSync(`node "${filePath}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    results.push({ name: suite.name, passed: true });
  } catch (err) {
    allPassed = false;
    results.push({ name: suite.name, passed: false });
  }

  console.log('');
}

// Resumen final
console.log(`${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`);
console.log(`${c.bold}  RESUMEN FINAL${c.reset}\n`);

for (const r of results) {
  const icon = r.passed ? `${c.green}✓` : `${c.red}✗`;
  console.log(`  ${icon} ${r.name}${c.reset}`);
}

console.log('');

if (allPassed) {
  console.log(`${c.green}${c.bold}  Todas las suites pasaron.${c.reset}\n`);
  process.exit(0);
} else {
  console.log(`${c.red}${c.bold}  Algunas suites fallaron.${c.reset}\n`);
  process.exit(1);
}
