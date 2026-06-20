const path = require('path');
const fs = require('fs/promises');
const { WORKSPACE_ROOT } = require('../config/workspace');
const { templates } = require('./templates');

// Directorios que nunca se muestran en el árbol (ruido / tamaño).
const IGNORE = new Set(['node_modules', '.git', 'dist']);

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// --- Seguridad de rutas -----------------------------------------------------

function projectRoot(projectId) {
  if (!/^[A-Za-z0-9_-]+$/.test(projectId || '')) {
    throw httpError('Nombre de proyecto inválido (solo letras, números, - y _).', 400);
  }
  return path.join(WORKSPACE_ROOT, projectId);
}

// Resuelve una ruta relativa dentro del proyecto y garantiza que no se sale
// de su carpeta (protección contra path traversal: ../../etc).
function resolveInProject(projectId, relPath = '') {
  const root = projectRoot(projectId);
  const target = path.resolve(root, relPath);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (target !== root && !target.startsWith(rootWithSep)) {
    throw httpError('Ruta fuera del proyecto.', 400);
  }
  return target;
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// --- Proyectos --------------------------------------------------------------

async function listProjects() {
  const entries = await fs.readdir(WORKSPACE_ROOT, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

async function createProject(name, template = 'empty') {
  const root = projectRoot(name);
  if (await pathExists(root)) {
    throw httpError(`Ya existe un proyecto llamado "${name}".`, 409);
  }
  const tpl = templates[template] || templates.empty;
  const files = tpl.files(name);

  await fs.mkdir(root, { recursive: true });
  for (const [relPath, content] of Object.entries(files)) {
    const dest = resolveInProject(name, relPath);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, content, 'utf8');
  }
  return { id: name, template: tpl === templates.empty ? 'empty' : template };
}

async function deleteProject(projectId) {
  const root = projectRoot(projectId);
  if (!(await pathExists(root))) {
    throw httpError('Proyecto no encontrado.', 404);
  }
  // En Windows, justo tras matar el servidor del proyecto el SO puede tardar un
  // instante en liberar los handles de node_modules; maxRetries/retryDelay
  // reintenta ante EBUSY/EPERM/ENOTEMPTY en lugar de fallar a la primera.
  await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

// --- Árbol de archivos ------------------------------------------------------

async function buildTree(projectId) {
  const root = projectRoot(projectId);
  if (!(await pathExists(root))) {
    throw httpError('Proyecto no encontrado.', 404);
  }

  async function walk(dir, rel) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const dirs = [];
    const files = [];
    for (const e of entries) {
      if (IGNORE.has(e.name)) continue;
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        dirs.push({
          name: e.name,
          path: childRel,
          type: 'dir',
          children: await walk(path.join(dir, e.name), childRel),
        });
      } else {
        files.push({ name: e.name, path: childRel, type: 'file' });
      }
    }
    const byName = (a, b) => a.name.localeCompare(b.name);
    return [...dirs.sort(byName), ...files.sort(byName)];
  }

  return { id: projectId, tree: await walk(root, '') };
}

// --- Operaciones de archivo -------------------------------------------------

async function readFile(projectId, relPath) {
  const target = resolveInProject(projectId, relPath);
  if (!(await pathExists(target))) throw httpError('Archivo no encontrado.', 404);
  const stat = await fs.stat(target);
  if (stat.isDirectory()) throw httpError('La ruta es un directorio.', 400);
  const content = await fs.readFile(target, 'utf8');
  return { path: relPath, content };
}

async function writeFile(projectId, relPath, content = '') {
  const target = resolveInProject(projectId, relPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, 'utf8');
  return { path: relPath };
}

async function createEntry(projectId, relPath, type = 'file') {
  const target = resolveInProject(projectId, relPath);
  if (await pathExists(target)) throw httpError('Ya existe esa ruta.', 409);
  if (type === 'dir') {
    await fs.mkdir(target, { recursive: true });
  } else {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, '', 'utf8');
  }
  return { path: relPath, type };
}

async function deleteEntry(projectId, relPath) {
  const target = resolveInProject(projectId, relPath);
  if (target === projectRoot(projectId)) {
    throw httpError('Usa el borrado de proyecto para eliminar la raíz.', 400);
  }
  if (!(await pathExists(target))) throw httpError('Ruta no encontrada.', 404);
  await fs.rm(target, { recursive: true, force: true });
  return { path: relPath };
}

async function renameEntry(projectId, from, to) {
  const src = resolveInProject(projectId, from);
  const dest = resolveInProject(projectId, to);
  if (!(await pathExists(src))) throw httpError('Origen no encontrado.', 404);
  if (await pathExists(dest)) throw httpError('El destino ya existe.', 409);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.rename(src, dest);
  return { from, to };
}

module.exports = {
  listProjects,
  createProject,
  deleteProject,
  buildTree,
  readFile,
  writeFile,
  createEntry,
  deleteEntry,
  renameEntry,
};
