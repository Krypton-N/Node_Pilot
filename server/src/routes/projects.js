const express = require('express');
const fileService = require('../services/fileService');
const processManager = require('../services/processManager');
const { listTemplates } = require('../services/templates');

const router = express.Router();

// Envuelve handlers async para centralizar el manejo de errores.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --- Plantillas -------------------------------------------------------------
router.get('/templates', (req, res) => {
  res.json({ templates: listTemplates() });
});

// --- Proyectos --------------------------------------------------------------
router.get(
  '/projects',
  wrap(async (req, res) => {
    res.json({ projects: await fileService.listProjects() });
  })
);

router.post(
  '/projects',
  wrap(async (req, res) => {
    const { name, template } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Falta el nombre del proyecto.' });
    const created = await fileService.createProject(name, template);
    res.status(201).json(created);
  })
);

router.delete(
  '/projects/:id',
  wrap(async (req, res) => {
    await fileService.deleteProject(req.params.id);
    res.status(204).end();
  })
);

router.get(
  '/projects/:id/tree',
  wrap(async (req, res) => {
    res.json(await fileService.buildTree(req.params.id));
  })
);

// --- Archivos dentro de un proyecto -----------------------------------------
router.get(
  '/projects/:id/file',
  wrap(async (req, res) => {
    const { path: relPath } = req.query;
    if (!relPath) return res.status(400).json({ error: 'Falta el parámetro path.' });
    res.json(await fileService.readFile(req.params.id, relPath));
  })
);

router.put(
  '/projects/:id/file',
  wrap(async (req, res) => {
    const { path: relPath, content } = req.body || {};
    if (!relPath) return res.status(400).json({ error: 'Falta el parámetro path.' });
    res.json(await fileService.writeFile(req.params.id, relPath, content ?? ''));
  })
);

router.post(
  '/projects/:id/file',
  wrap(async (req, res) => {
    const { path: relPath, type } = req.body || {};
    if (!relPath) return res.status(400).json({ error: 'Falta el parámetro path.' });
    const created = await fileService.createEntry(req.params.id, relPath, type);
    res.status(201).json(created);
  })
);

router.delete(
  '/projects/:id/file',
  wrap(async (req, res) => {
    const { path: relPath } = req.query;
    if (!relPath) return res.status(400).json({ error: 'Falta el parámetro path.' });
    res.json(await fileService.deleteEntry(req.params.id, relPath));
  })
);

router.post(
  '/projects/:id/rename',
  wrap(async (req, res) => {
    const { from, to } = req.body || {};
    if (!from || !to) return res.status(400).json({ error: 'Faltan from/to.' });
    res.json(await fileService.renameEntry(req.params.id, from, to));
  })
);

// --- Ejecución de procesos (F2) ---------------------------------------------
router.get('/commands', (req, res) => {
  res.json({ commands: processManager.listCommands() });
});

router.post(
  '/projects/:id/run',
  wrap(async (req, res) => {
    const { action } = req.body || {};
    res.json(processManager.run(req.params.id, action));
  })
);

router.post(
  '/projects/:id/stop',
  wrap(async (req, res) => {
    res.json(processManager.stop(req.params.id));
  })
);

router.get(
  '/projects/:id/status',
  wrap(async (req, res) => {
    res.json(processManager.status(req.params.id));
  })
);

module.exports = router;
