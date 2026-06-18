import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import FileTree from './components/FileTree';
import logoImg from './assets/logo.jpg';
import MainTabs from './components/MainTabs';
import BottomPanel from './components/BottomPanel';
import AssistantPanel from './components/AssistantPanel';
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

  const backendState =
    backendOk == null ? 'idle' : backendOk ? 'green' : 'red';

  return (
    <div className="np-app">
      {/* ============ BARRA SUPERIOR ============ */}
      <div className="np-topbar">
        <div className="d-flex align-items-center" style={{ gap: 14 }}>
          <div className="d-flex align-items-center" style={{ gap: 9 }}>
            <img src={logoImg} alt="NodePilot Logo" style={{ width: 25, height: 25, borderRadius: 8, objectFit: 'cover' }} />
            <span className="np-wordmark">NodePilot</span>
          </div>
          <div className="np-divider" />
          {/* selector de proyecto (lógica real conservada) */}
          <div className="np-project np-hov">
            <div className="np-project-swatch" />
            <select value={project} onChange={(e) => selectProject(e.target.value)}>
              {projects.length === 0 && <option value="">(sin proyectos)</option>}
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <button
            className="np-mini-btn np-hov"
            title="Nuevo proyecto"
            onClick={() => setShowNew(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <div className="d-flex align-items-center" style={{ gap: 8 }}>
          <div className={`np-chip ${backendState === 'green' ? 'np-chip--green' : backendState === 'red' ? 'np-chip--red' : ''}`}>
            <span className={`np-dot np-dot--${backendState === 'green' ? 'green' : backendState === 'red' ? 'red' : 'idle'}`} />
            <span>
              backend {backendOk == null ? '…' : backendOk ? 'activo' : 'down'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="np-toast">
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* ============ CUERPO (Variación A · paneles flotantes) ============ */}
      <div className="np-body">
        {/* SIDEBAR */}
        <div className="np-sidebar np-col">
          <div className="np-panel" style={{ flex: 1 }}>


            <div className="np-section">
              <span className="np-section-title">Explorador</span>
              <div className="d-flex" style={{ gap: 2 }}>
                <button
                  className="np-mini-btn np-hov"
                  title="Nuevo archivo"
                  disabled={!project}
                  onClick={() => createEntry('file')}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 11v6M9 14h6" />
                  </svg>
                </button>
                <button
                  className="np-mini-btn np-hov"
                  title="Nueva carpeta"
                  disabled={!project}
                  onClick={() => createEntry('dir')}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </button>
                <button
                  className="np-mini-btn np-hov"
                  title="Eliminar proyecto"
                  disabled={!project}
                  onClick={deleteCurrentProject}
                  style={{ color: '#f0857c' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>
            </div>

            <FileTree tree={tree} activePath={openFile} onOpen={openNode} onDelete={deleteNode} />
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: '10.5px', color: '#5a616a', display: 'flex', justifyContent: 'space-between', opacity: 0.7 }}>
              <span>v0.1.0</span>
              <span>
                Hecho por <a href="https://krypton-n.github.io/Portafolio/" target="_blank" rel="noreferrer" style={{ color: '#969ca4', textDecoration: 'none' }}>Noe Rodriguez</a>
              </span>
            </div>
          </div>
        </div>

        {/* CENTRO: editor + dock */}
        <div className="np-center">
          <div className="np-panel np-panel--editor" style={{ flex: 1 }}>
            <MainTabs
              project={project}
              file={openFile}
              value={content}
              dirty={dirty}
              onChange={setContent}
              onSave={save}
            />
          </div>
          <div className="np-panel np-panel--editor np-dock" style={{ height: 230 }}>
            <BottomPanel project={project} />
          </div>
        </div>

        {/* ASISTENTE IA */}
        <AssistantPanel
          project={project}
          currentFile={openFile ? { path: openFile, content } : null}
          onApplied={() => project && loadTree(project)}
        />
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
