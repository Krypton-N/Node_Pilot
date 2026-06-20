// Tras `npm run build`, copia el frontend compilado (dist: index.html + main.js
// + assets) a backend/public, para que el backend lo sirva con express.static.
// Se ejecuta automáticamente como `postbuild` — nada de copiado manual.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'dist');
const dest = path.join(__dirname, '..', '..', 'backend', 'public');

if (!fs.existsSync(src)) {
  console.error('[copy-to-backend] No existe dist/. Corre primero `npm run build`.');
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`[copy-to-backend] Frontend copiado a ${dest}`);
