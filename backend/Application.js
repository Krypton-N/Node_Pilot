const path = require('path');
// Carga backend/.env sin depender del directorio desde el que se ejecute node.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { sequelize, checkConnection } = require('./src/config/database');
const projectsRouter = require('./src/routes/projects');
const aiRouter = require('./src/routes/ai');
const authRouter = require('./src/routes/auth');
const { setupWebSocket } = require('./src/ws');
const { setupPreview } = require('./src/preview');
const processManager = require('./src/services/processManager');

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(cors());

// Preview ANTES de express.json(): el proxy reenvía el body crudo a la app
// del usuario sin que el parser de JSON lo consuma.
setupPreview(app);

app.use(express.json());

// Front-End integrado: sirve el build del frontend (index.html + main.js) que
// `npm run build` del frontend copia a backend/public. No tapa /api ni /np-ws
// porque esos paths no existen como archivos dentro de public.
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de la API (workspace, archivos, plantillas)
app.use('/api', authRouter);
app.use('/api', projectsRouter);
app.use('/api', aiRouter);

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

// Limpia procesos huérfanos de una sesión anterior y arranca los health-checks.
processManager.cleanupOrphans();
processManager.startHealthChecks();

// Crea las tablas (historial de chat y usuarios) si la BD está disponible
// y siembra el usuario por defecto del login (admin / 1234).
require('./src/models/chatMessage');
const { ensureDefaultUser } = require('./src/models/user');
sequelize
  .sync()
  .then(() => ensureDefaultUser())
  .then(() => console.log('[NodePilot] Modelos sincronizados (historial de chat y login listos).'))
  .catch((e) => console.warn('[NodePilot] Sin persistencia (BD no disponible):', e.message));

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
