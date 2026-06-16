const path = require('path');
const fs = require('fs');

// Raíz donde viven todos los proyectos del usuario, en la raíz del repo.
// server/src/config -> ../../.. = raíz del repo
const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..', '..', 'workspace');

if (!fs.existsSync(WORKSPACE_ROOT)) {
  fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
}

module.exports = { WORKSPACE_ROOT };
