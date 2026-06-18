const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const processManager = require('./services/processManager');

function page(title, body) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;
height:100vh;margin:0;background:#f8f9fa;color:#555;text-align:center}div{max-width:420px;padding:2rem}
h2{color:#333}</style></head><body><div><h2>${title}</h2>${body}</div></body></html>`;
}

// Monta el reverse-proxy de preview. Se llama ANTES de express.json() para no
// consumir el body de las peticiones que se reenvían a la app del usuario.
function setupPreview(app) {
  // Verifica que el proyecto esté corriendo; si no, muestra una página amable.
  app.use('/preview/:id', (req, res, next) => {
    const st = processManager.status(req.params.id);
    if (!st.running || !st.port) {
      return res
        .status(503)
        .type('html')
        .send(
          page(
            'La preview no está disponible',
            `<p>El proyecto <b>${req.params.id}</b> no está en ejecución.</p>
             <p>Pulsa <b>▶ Ejecutar</b> en la terminal para levantarlo.</p>`
          )
        );
    }
    req._previewTarget = `http://127.0.0.1:${st.port}`;
    next();
  });

  app.use(
    '/preview/:id',
    createProxyMiddleware({
      changeOrigin: true,
      // El puerto destino se resuelve por petición según el proceso activo.
      router: (req) => req._previewTarget,
      selfHandleResponse: true,
      on: {
        // Inyecta <base> en el HTML para que los assets relativos resuelvan
        // bajo el prefijo /preview/:id/ (si no, irían a la raíz de NodePilot).
        proxyRes: responseInterceptor(async (buffer, proxyRes, req) => {
          const type = String(proxyRes.headers['content-type'] || '');
          if (type.includes('text/html')) {
            let html = buffer.toString('utf8');
            const base = `<base href="${req.baseUrl}/">`;
            html = /<head[^>]*>/i.test(html)
              ? html.replace(/<head[^>]*>/i, (m) => m + base)
              : base + html;
            return html;
          }
          return buffer;
        }),
        error: (err, req, res) => {
          if (res && res.writeHead && !res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(page('Error de preview', `<p>${err.message}</p>`));
          }
        },
      },
    })
  );
}

module.exports = { setupPreview };
