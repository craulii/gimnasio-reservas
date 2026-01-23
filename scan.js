// scan-project.js
// Ejecutar con: node scan-project.js

const fs = require('fs');
const path = require('path');

// Carpetas que NO queremos ver para no ensuciar la salida
const IGNORE_DIRS = ['node_modules', '.git', '.next', '.vscode', 'coverage'];
// Archivos que no aportan mucho a la estructura
const IGNORE_FILES = ['.DS_Store', 'package-lock.json', 'yarn.lock'];

function scanDir(dir, prefix = '') {
    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        // Filtramos para quitar lo que no nos sirve
        const filteredItems = items.filter(item => {
            if (item.isDirectory() && IGNORE_DIRS.includes(item.name)) return false;
            if (item.isFile() && IGNORE_FILES.includes(item.name)) return false;
            return true;
        });

        // Ordenamos: Carpetas primero, luego archivos
        filteredItems.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        });

        filteredItems.forEach((item, index) => {
            const isLast = index === filteredItems.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            
            console.log(`${prefix}${connector}${item.name}`);

            if (item.isDirectory()) {
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                scanDir(path.join(dir, item.name), newPrefix);
            }
        });
    } catch (err) {
        console.error(`Error leyendo ${dir}: ${err.message}`);
    }
}

console.log(`\n📂 ESTRUCTURA DEL PROYECTO: ${path.basename(process.cwd())}\n`);
scanDir(process.cwd());
console.log('\n--- FIN DEL ESCANEO ---\n');