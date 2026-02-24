#!/usr/bin/env node
/**
 * Watch mode - Re-ejecuta tests automáticamente al detectar cambios
 *
 * Uso: npm run test:watch
 *
 * Observa cambios en src/ y tests/ y re-ejecuta la suite completa.
 * Ctrl+C para detener.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  yellow: '\x1b[33m',
};

const ROOT = path.join(__dirname, '..');
const DEBOUNCE_MS = 500;
let timeout = null;
let running = false;

function runTests() {
  if (running) return;
  running = true;

  console.clear();
  const time = new Date().toLocaleTimeString('es-CL');
  console.log(`${c.dim}[${time}]${c.reset} ${c.cyan}Ejecutando tests...${c.reset}\n`);

  try {
    execSync('node tests/run-all.js', {
      stdio: 'inherit',
      cwd: ROOT,
    });
    console.log(`${c.green}${c.bold}Esperando cambios...${c.reset} ${c.dim}(Ctrl+C para salir)${c.reset}`);
  } catch (err) {
    console.log(`${c.red}${c.bold}Tests fallaron. Esperando cambios...${c.reset} ${c.dim}(Ctrl+C para salir)${c.reset}`);
  }

  running = false;
}

function scheduleRun() {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(runTests, DEBOUNCE_MS);
}

// Directorios a observar
const watchDirs = ['src', 'tests'];

console.log(`${c.bold}${c.yellow}  Test Watch Mode${c.reset}`);
console.log(`${c.dim}  Observando: ${watchDirs.join(', ')}${c.reset}`);
console.log(`${c.dim}  Ctrl+C para detener${c.reset}\n`);

for (const dir of watchDirs) {
  const fullPath = path.join(ROOT, dir);
  if (fs.existsSync(fullPath)) {
    fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.js') || filename.endsWith('.mjs'))) {
        console.log(`${c.dim}  Cambio detectado: ${dir}/${filename}${c.reset}`);
        scheduleRun();
      }
    });
  }
}

// Ejecutar inmediatamente al inicio
runTests();
