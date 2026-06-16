const path = require('path');
// Carga server/.env sin depender del directorio desde el que se ejecute node.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const { checkConnection } = require('./config/database');
const projectsRouter = require('./routes/projects');
const { setupWebSocket } = require('./ws');
const processManager = require('./services/processManager');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

// Rutas de la API (workspace, archivos, plantillas)
app.use('/api', projectsRouter);

// Health check: reporta el estado del servidor y de la conexión a MySQL.
app.get('/healthz', async (req, res) => {
  const db = await checkConnection();
  const ok = db.status === 'ok';
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    service: 'nodepilot-server',
    db,
    timestamp: new Date().toISOString(),
  });
});

// Manejador de errores centralizado: usa err.status si existe.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[NodePilot] Error:', err);
  res.status(status).json({ error: err.message || 'Error interno.' });
});

const server = app.listen(PORT, () => {
  console.log(`[NodePilot] Servidor escuchando en http://localhost:${PORT}`);
  console.log(`[NodePilot] Health check: http://localhost:${PORT}/healthz`);
});

// WebSocket para logs de procesos en vivo (mismo puerto).
setupWebSocket(server);

// Al apagar el servidor, mata los procesos hijos para no dejar zombies.
function shutdown() {
  processManager.stopAll();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Red de seguridad: en desarrollo, no dejar que un error suelto (p. ej. de un
// socket WebSocket) tumbe el servidor. Se registra y se sigue.
process.on('uncaughtException', (err) => {
  console.error('[NodePilot] uncaughtException:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[NodePilot] unhandledRejection:', err);
});
