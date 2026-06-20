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
const PORT = Number(process.env.PORT) || 3000;

app.get('/', (req, res) => {
  res.send('<h1>¡Hola desde ${name}!</h1><p>Servidor Express corriendo.</p>');
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log('Servidor escuchando en el puerto ' + port);
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(\`Puerto \${port} ocupado, intentando con \${port + 1}...\`);
      startServer(port + 1);
    } else {
      console.error(err);
    }
  });
}

startServer(PORT);
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
const PORT = Number(process.env.PORT) || 3000;
app.use(express.json());

let items = [{ id: 1, nombre: 'ejemplo' }];

app.get('/api/items', (req, res) => res.json(items));

app.post('/api/items', (req, res) => {
  const nuevo = { id: items.length + 1, ...req.body };
  items.push(nuevo);
  res.status(201).json(nuevo);
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log('API escuchando en el puerto ' + port);
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(\`Puerto \${port} ocupado, intentando con \${port + 1}...\`);
      startServer(port + 1);
    } else {
      console.error(err);
    }
  });
}

startServer(PORT);
`,
      'README.md': `# ${name}\n\nAPI REST generada por NodePilot.\n`,
    }),
  },

  'express-sequelize': {
    label: 'Express + Sequelize + MySQL',
    description: 'Servidor Express con CRUD de productos persistido en MySQL usando Sequelize. ¡Crea la base de datos automáticamente al arrancar!',
    files: (name) => {
      // BD propia por proyecto, derivada del nombre, para no colisionar con la
      // base interna del IDE (nodepilot). MySQL no admite guiones sin backticks,
      // así que se normalizan a guion bajo.
      const dbName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      return {
      'package.json': pkg(name, {
        dependencies: {
          express: '^4.21.2',
          sequelize: '^6.37.5',
          mysql2: '^3.11.5',
          dotenv: '^16.4.7'
        }
      }),
      '.env.example': `# Configuración de base de datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${dbName}
DB_USER=root
DB_PASSWORD=1234

PORT=3000
`,
      'instrucciones.md': `# Instrucciones: Configuración de Base de Datos y Sequelize

Este proyecto es una plantilla de Express lista para usar con MySQL y Sequelize.

## Requisitos Previos

1. **Servicio MySQL Activo**:
   Asegúrate de tener corriendo tu motor de base de datos MySQL local (ej: XAMPP, WAMP o el servicio de Windows \`MySQL80\`).
2. **Base de Datos Automática**:
   ¡No necesitas abrir la consola de MySQL para crear la base de datos! La plantilla está programada para verificar y crear la base de datos de forma automática al iniciar el servidor por primera vez.

## Configuración del Entorno

1. En la raíz de este proyecto, copia el archivo \`.env.example\` y llámalo \`.env\`.
2. Configura las variables de conexión con tus credenciales de MySQL correspondientes en el \`.env\`.

## Ejecución del Proyecto

1. Instala las dependencias en la terminal del IDE usando el botón **Instalar** (\`npm install\`).
2. Inicia el servidor usando el botón **Ejecutar** (\`npm start\`).
3. Abre la pestaña de **Vista previa (Preview)** para probar el CRUD con el formulario integrado.
`,
      'public/index.html': `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Express + Sequelize + MySQL</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 2rem auto; padding: 1rem; line-height: 1.6; background-color: #fcfcfc; color: #333; }
    h1 { color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 0.5rem; }
    form { background: #f9f9f9; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; }
    input, textarea, button { display: block; width: 100%; box-sizing: border-box; margin: 10px 0; padding: 10px; border-radius: 4px; border: 1px solid #cbd5e1; }
    button { background-color: #3498db; color: white; border: none; font-weight: bold; cursor: pointer; transition: background-color 0.2s; }
    button:hover { background-color: #2980b9; }
    ul { list-style: none; padding: 0; }
    li { border: 1px solid #e2e8f0; margin: 10px 0; padding: 15px; border-radius: 6px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .endpoint-link { display: inline-block; margin: 5px 10px 5px 0; font-size: 0.9em; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .error-msg { color: #e74c3c; font-weight: bold; }
  </style>
</head>
<body>
  <h1>🚀 Express + Sequelize + MySQL CRUD</h1>
  <p>Servidor conectado a base de datos y sincronizado correctamente con Sequelize.</p>
  
  <div style="margin-bottom: 1.5rem;">
    <strong>Enlaces directos:</strong>
    <a class="endpoint-link" href="./ping" target="_blank">Probar <code>/ping</code></a>
    <a class="endpoint-link" href="./api/products" target="_blank">Ver JSON <code>/api/products</code></a>
  </div>

  <form id="productForm">
    <h3>Agregar nuevo producto</h3>
    <input type="text" id="nombre" placeholder="Nombre del producto" required>
    <input type="number" id="precio" placeholder="Precio ($)" step="0.01" required min="0">
    <textarea id="descripcion" placeholder="Descripción del producto"></textarea>
    <button type="submit">Guardar Producto</button>
  </form>

  <h2>Productos Guardados</h2>
  <ul id="productList"></ul>

  <script>
    const form = document.getElementById('productForm');
    const list = document.getElementById('productList');

    async function loadProducts() {
      try {
        const res = await fetch('./api/products');
        if (!res.ok) throw new Error();
        const products = await res.json();
        if (products.length === 0) {
          list.innerHTML = '<li>No hay productos registrados aún.</li>';
          return;
        }
        list.innerHTML = products.map(p => \`
          <li>
            <strong>\${p.nombre}</strong> - Precio: \$\${Number(p.precio).toFixed(2)}
            \${p.descripcion ? '<br><small style="color: #64748b">' + p.descripcion + '</small>' : ''}
          </li>
        \`).join('');
      } catch (err) {
        list.innerHTML = '<li class="error-msg">Error al cargar productos. Asegúrate de tener MySQL activo y configurado.</li>';
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('nombre').value;
      const precio = parseFloat(document.getElementById('precio').value);
      const descripcion = document.getElementById('descripcion').value || null;

      try {
        const res = await fetch('./api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, precio, descripcion })
        });

        if (res.ok) {
          form.reset();
          loadProducts();
        } else {
          const err = await res.json();
          alert('Error al crear: ' + (err.error || 'datos inválidos'));
        }
      } catch (err) {
        alert('Error de conexión con el servidor.');
      }
    });

    loadProducts();
  </script>
</body>
</html>
`,
      'src/config/database.js': `const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || '${dbName}';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '1234';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
});

// Crea la base de datos de forma automática utilizando el driver mysql2 directamente
async function ensureDatabaseExists() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
  });
  await connection.query(\`CREATE DATABASE IF NOT EXISTS \\\`\${DB_NAME}\\\`;\`);
  await connection.end();
}

module.exports = { sequelize, ensureDatabaseExists };
`,
      'src/models/Product.js': `const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  precio: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: { min: 0 }
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Product;
`,
      'src/index.js': `require('dotenv').config();
const express = require('express');
const path = require('path');
const { sequelize, ensureDatabaseExists } = require('./config/database');
const Product = require('./models/Product');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Servir archivos estáticos (formulario HTML)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Middleware de logs simple
app.use((req, res, next) => {
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`);
  next();
});

// GET - Obtener todos los productos
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener un producto por ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Crear producto
app.post('/api/products', async (req, res) => {
  try {
    const { nombre, precio, descripcion } = req.body;
    const newProduct = await Product.create({ nombre, precio, descripcion });
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT - Actualizar producto
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    const { nombre, precio, descripcion } = req.body;
    await product.update({ nombre, precio, descripcion });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE - Eliminar producto
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    await product.destroy();
    res.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - ping
app.get('/ping', (req, res) => res.json({ status: 'pong' }));

// Conexión y arranque
(async () => {
  try {
    // Crear base de datos de forma automática si no existe en el servidor
    await ensureDatabaseExists();

    // Sincronizar tablas de Sequelize (crea, altera y maneja columnas)
    await sequelize.sync({ alter: true });
    console.log('Base de datos MySQL sincronizada con Sequelize exitosamente.');
    
    function startServer(port) {
      const server = app.listen(port, () => {
        console.log(\`Servidor Express escuchando en http://localhost:\${port}\`);
      });
      
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(\`Puerto \${port} ocupado, intentando con \${port + 1}...\`);
          startServer(port + 1);
        } else {
          console.error('Error en el servidor:', err);
        }
      });
    }

    startServer(PORT);
  } catch (err) {
    console.error('Error fatal al iniciar la aplicación:', err);
  }
})();
`,
      };
    },
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
