// Plantillas de scaffolding. Cada plantilla devuelve un mapa
// { rutaRelativa: contenido } que el FileService escribe en disco.

function pkg(name, extra = {}) {
  return JSON.stringify(
    {
      name,
      version: '1.0.0',
      private: true,
      scripts: { start: 'node src/index.js' },
      ...extra,
    },
    null,
    2
  );
}

const templates = {
  empty: {
    label: 'Vacío',
    description: 'Solo un README. Empiezas de cero.',
    files: (name) => ({
      'README.md': `# ${name}\n\nProyecto creado con NodePilot.\n`,
    }),
  },

  'express-basic': {
    label: 'Express básico',
    description: 'Servidor Express que sirve una página de bienvenida.',
    files: (name) => ({
      'package.json': pkg(name, { dependencies: { express: '^4.21.2' } }),
      'src/index.js': `const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('<h1>¡Hola desde ${name}!</h1><p>Servidor Express corriendo.</p>');
});

app.listen(PORT, () => {
  console.log('Servidor escuchando en el puerto ' + PORT);
});
`,
      'README.md': `# ${name}\n\nServidor Express básico generado por NodePilot.\n\n## Uso\n\n\`\`\`bash\nnpm install\nnpm start\n\`\`\`\n`,
    }),
  },

  'express-api': {
    label: 'API REST (Express)',
    description: 'API REST mínima con rutas GET/POST en memoria.',
    files: (name) => ({
      'package.json': pkg(name, { dependencies: { express: '^4.21.2' } }),
      'src/index.js': `const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

let items = [{ id: 1, nombre: 'ejemplo' }];

app.get('/api/items', (req, res) => res.json(items));

app.post('/api/items', (req, res) => {
  const nuevo = { id: items.length + 1, ...req.body };
  items.push(nuevo);
  res.status(201).json(nuevo);
});

app.listen(PORT, () => {
  console.log('API escuchando en el puerto ' + PORT);
});
`,
      'README.md': `# ${name}\n\nAPI REST generada por NodePilot.\n`,
    }),
  },
};

function listTemplates() {
  return Object.entries(templates).map(([id, t]) => ({
    id,
    label: t.label,
    description: t.description,
  }));
}

module.exports = { templates, listTemplates };
