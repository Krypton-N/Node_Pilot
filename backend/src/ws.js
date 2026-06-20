const { WebSocketServer } = require('ws');
const processManager = require('./services/processManager');

// Levanta el servidor WebSocket sobre el mismo HTTP server (mismo puerto 8080).
// Cada cliente se suscribe a UN proyecto y recibe sus logs y cambios de estado.
function setupWebSocket(server) {
  // Ruta propia: '/ws' choca con el WebSocket de HMR de webpack-dev-server.
  const wss = new WebSocketServer({ server, path: '/np-ws' });

  // 'ws' lanza errores de socket como excepción si no se manejan; sin esto, un
  // código de cierre inválido del proxy tumba todo el backend.
  wss.on('error', (err) => console.error('[NodePilot] WSS error:', err.message));

  // El ProcessManager emite eventos; los reenviamos solo a los clientes
  // suscritos al proyecto correspondiente.
  processManager.setEmitter((event) => {
    const msg = JSON.stringify(event);
    for (const ws of wss.clients) {
      if (ws.readyState === ws.OPEN && ws._projectId === event.projectId) {
        ws.send(msg);
      }
    }
  });

  wss.on('connection', (ws) => {
    ws._projectId = null;

    // Imprescindible: sin este handler, un frame de cierre inválido crashea Node.
    ws.on('error', (err) => console.error('[NodePilot] WS conn error:', err.message));

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.action === 'subscribe' && msg.projectId) {
        ws._projectId = msg.projectId;
        // Manda el backlog para reconstruir la terminal y el estado actual.
        ws.send(
          JSON.stringify({
            type: 'history',
            projectId: msg.projectId,
            logs: processManager.getLogs(msg.projectId),
          })
        );
        ws.send(JSON.stringify({ type: 'status', ...processManager.status(msg.projectId) }));
      }
    });
  });

  return wss;
}

module.exports = { setupWebSocket };
