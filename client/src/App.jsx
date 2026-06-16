import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import FileTree from './components/FileTree';
import EditorPane from './components/EditorPane';
import TerminalPanel from './components/TerminalPanel';
import NewProjectModal from './components/NewProjectModal';
import './app.css';

export default function App() {
  const [backendOk, setBackendOk] = useState(null);
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState('');
  const [tree, setTree] = useState([]);
  const [openFile, setOpenFile] = useState(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');

  const dirty = openFile !== null && content !== savedContent;

  // --- carga inicial ---
  useEffect(() => {
    api.health().then((h) => setBackendOk(h.status === 'ok')).catch(() => setBackendOk(false));
    refreshProjects();
  }, []);

  async function refreshProjects() {
    try {
      const { projects } = await api.listProjects();
      setProjects(projects);
      if (projects.length && !project) selectProject(projects[0]);
    } catch (e) {
      setError(e.message);
    }
  }

  async function loadTree(id) {
    const { tree } = await api.getTree(id);
    setTree(tree);
  }

  async function selectProject(id) {
    setProject(id);
    setOpenFile(null);
    setContent('');
    setSavedContent('');
    setError('');
    try {
      await loadTree(id);
    } catch (e) {
      setError(e.message);
    }
  }

  async function openNode(node) {
    try {
      const { content } = await api.readFile(project, node.path);
      setOpenFile(node.path);
      setContent(content);
      setSavedContent(content);
    } catch (e) {
      setError(e.message);
    }
  }

  const save = useCallback(async () => {
    if (!openFile || !dirty) return;
    try {
      await api.saveFile(project, openFile, content);
      setSavedContent(content);
    } catch (e) {
      setError(e.message);
    }
  }, [project, openFile, content, dirty]);

  // Ctrl+S para guardar
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save]);

  async function createEntry(type) {
    const path = window.prompt(
      type === 'dir' ? 'Ruta de la nueva carpeta:' : 'Ruta del nuevo archivo:',
      type === 'dir' ? 'nueva-carpeta' : 'nuevo.js'
    );
    if (!path) return;
    try {
      await api.createEntry(project, path, type);
      await loadTree(project);
      if (type === 'file') openNode({ path });
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteNode(node) {
    if (!window.confirm(`¿Eliminar "${node.path}"?`)) return;
    try {
      await api.deleteEntry(project, node.path);
      if (openFile === node.path) {
        setOpenFile(null);
        setContent('');
        setSavedContent('');
      }
      await loadTree(project);
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteCurrentProject() {
    if (!window.confirm(`¿Eliminar el proyecto "${project}" completo?`)) return;
    try {
      await api.deleteProject(project);
      setProject('');
      setTree([]);
      setOpenFile(null);
      await refreshProjects();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="d-flex flex-column vh-100">
      {/* Header */}
      <header className="d-flex align-items-center gap-3 px-3 py-2 bg-dark text-white">
        <span className="fw-bold fs-5">NodePilot</span>
        <span className="badge bg-secondary">Fase 2 — Ejecución</span>
        <span className="ms-auto small">
          backend:{' '}
          <span className={`badge bg-${backendOk == null ? 'secondary' : backendOk ? 'success' : 'danger'}`}>
            {backendOk == null ? '…' : backendOk ? 'ok' : 'down'}
          </span>
        </span>
      </header>

      {error && (
        <div className="alert alert-danger m-2 py-2 d-flex align-items-center">
          {error}
          <button className="btn-close ms-auto" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Cuerpo */}
      <div className="d-flex flex-grow-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="border-end d-flex flex-column" style={{ width: 280 }}>
          <div className="p-2 border-bottom">
            <div className="d-flex gap-2">
              <select
                className="form-select form-select-sm"
                value={project}
                onChange={(e) => selectProject(e.target.value)}
              >
                {projects.length === 0 && <option value="">(sin proyectos)</option>}
                {projects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button className="btn btn-sm btn-success" title="Nuevo proyecto" onClick={() => setShowNew(true)}>
                +
              </button>
            </div>
          </div>

          {project && (
            <div className="d-flex gap-1 p-2 border-bottom">
              <button className="btn btn-sm btn-outline-secondary flex-grow-1" onClick={() => createEntry('file')}>
                + Archivo
              </button>
              <button className="btn btn-sm btn-outline-secondary flex-grow-1" onClick={() => createEntry('dir')}>
                + Carpeta
              </button>
              <button className="btn btn-sm btn-outline-danger" title="Eliminar proyecto" onClick={deleteCurrentProject}>
                🗑
              </button>
            </div>
          )}

          <div className="flex-grow-1 overflow-auto py-1">
            <FileTree tree={tree} activePath={openFile} onOpen={openNode} onDelete={deleteNode} />
          </div>
        </aside>

        {/* Editor + Terminal */}
        <main className="flex-grow-1 d-flex flex-column overflow-hidden">
          <div className="flex-grow-1 overflow-hidden">
            <EditorPane file={openFile} value={content} dirty={dirty} onChange={setContent} onSave={save} />
          </div>
          <div className="border-top" style={{ height: 240 }}>
            <TerminalPanel project={project} />
          </div>
        </main>
      </div>

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={async (name) => {
            setShowNew(false);
            await refreshProjects();
            selectProject(name);
          }}
        />
      )}
    </div>
  );
}
