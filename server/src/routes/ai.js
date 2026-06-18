const express = require('express');
const aiService = require('../services/aiService');
const fileService = require('../services/fileService');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Chat con el asistente: genera explicación + archivos propuestos (no escribe nada).
router.post(
  '/projects/:id/ai/chat',
  wrap(async (req, res) => {
    const { message, model, context } = req.body || {};
    const result = await aiService.chat({
      projectId: req.params.id,
      message,
      model,
      context,
    });
    res.json(result);
  })
);

// Aplica al workspace los archivos que el usuario aprobó.
router.post(
  '/projects/:id/ai/apply',
  wrap(async (req, res) => {
    const { files } = req.body || {};
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No hay archivos para aplicar.' });
    }
    const applied = [];
    for (const f of files) {
      if (!f || !f.path) continue;
      await fileService.writeFile(req.params.id, f.path, f.content ?? '');
      applied.push(f.path);
    }
    res.json({ applied });
  })
);

// Autocompletado inline (ghost text). Stateless: no toca el workspace ni el
// historial; sólo pide al modelo el fragmento que va en el cursor.
router.post(
  '/ai/complete',
  wrap(async (req, res) => {
    const { prefix, suffix, language, model } = req.body || {};
    const completion = await aiService.complete({ prefix, suffix, language, model });
    res.json({ completion });
  })
);

// Historial de conversación persistido.
router.get(
  '/projects/:id/ai/history',
  wrap(async (req, res) => {
    res.json({ messages: await aiService.getHistory(req.params.id) });
  })
);

// Nueva conversación: borra el historial del proyecto.
router.delete(
  '/projects/:id/ai/history',
  wrap(async (req, res) => {
    await aiService.clearHistory(req.params.id);
    res.status(204).end();
  })
);

module.exports = router;
