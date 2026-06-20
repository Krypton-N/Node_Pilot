import { useState } from 'react';
import logoImg from '../assets/logo.jpg';
import NewProjectModal from './NewProjectModal';

// Iconos en SVG (sin emojis), con el mismo trazo que el resto de la app.
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);
const PlayIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4l14 8-14 8z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);
const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);
const WarnIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

// Ventana intermedia entre el login y el IDE: panel de administración de
// ejercicios (CRUD) sobre los proyectos del workspace.
export default function Dashboard({ user, projects, onOpen, onProbar, onDelete, onRefresh, onLogout }) {
  const [showNew, setShowNew] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [probingId, setProbingId] = useState(null);
  const [error, setError] = useState('');

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await onDelete(pendingDelete);
      setPendingDelete(null);
    } finally {
      setBusy(false);
    }
  }

  // Probar: instala y ejecuta el proyecto, luego abre su localhost en otra
  // pestaña. La pestaña se abre de inmediato (gesto del usuario) para que el
  // navegador no la bloquee como pop-up; su URL se fija cuando el server responde.
  async function probar(p) {
    if (probingId) return;
    setError('');
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(
        `<title>Iniciando ${p}</title><body style="margin:0;height:100vh;display:flex;` +
          `align-items:center;justify-content:center;font-family:system-ui,sans-serif;` +
          `background:#0b0d10;color:#e8eaed"><div>Iniciando <b>${p}</b>… instalando y ` +
          `arrancando el servidor.</div></body>`
      );
    }
    setProbingId(p);
    try {
      const url = await onProbar(p);
      if (win) win.location.href = url;
      else window.open(url, '_blank');
    } catch (e) {
      if (win) win.close();
      setError(`No se pudo probar “${p}”: ${e.message}`);
    } finally {
      setProbingId(null);
    }
  }

  return (
    <div className="np-dash">
      <div className="np-dash-shell">
        {/* Barra superior: marca + salir */}
        <div className="np-dash-top">
          <div className="np-dash-brand">
            <img src={logoImg} alt="NodePilot" />
            <span className="np-wordmark">NodePilot</span>
          </div>
          <button className="np-dash-exit np-hov" onClick={onLogout}>
            <LogoutIcon />
            Salir de la aplicación
          </button>
        </div>

        {/* Encabezado */}
        <div className="np-dash-head">
          <div className="np-dash-welcome">
            Welcome: <strong>{user}</strong>
          </div>
          <h1 className="np-dash-title">Crear, altas, bajas y cambios de ejercicios</h1>
        </div>

        {/* Acciones globales */}
        <div className="np-dash-toolbar">
          <button className="np-btn np-btn--green np-lift" onClick={() => setShowNew(true)}>
            <PlusIcon />
            Crear nuevo ejercicio
          </button>
          <span className="np-dash-count">
            {projects.length} {projects.length === 1 ? 'ejercicio' : 'ejercicios'}
          </span>
        </div>

        {error && (
          <div className="np-dash-error">
            <span>{error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* Tabla de ejercicios */}
        <div className="np-dash-tablewrap">
          <table className="np-table">
            <thead>
              <tr>
                <th className="np-table-col-name">Ejercicio</th>
                <th className="np-table-col-act">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr>
                  <td colSpan={2} className="np-table-empty">
                    No hay ejercicios todavía. Crea el primero con “Crear nuevo ejercicio”.
                  </td>
                </tr>
              )}
              {projects.map((p) => (
                <tr key={p}>
                  <td className="np-table-name">
                    <span className="np-table-dot" />
                    {p}
                  </td>
                  <td>
                    <div className="np-act-group">
                      <button className="np-act" onClick={() => onOpen(p, 'view')} title="Abrir en el IDE">
                        <EyeIcon />
                        Ver ejercicio
                      </button>
                      <button className="np-act" onClick={() => onOpen(p, 'edit')} title="Abrir en el IDE para editar">
                        <PencilIcon />
                        Modificar ejercicio
                      </button>
                      <button
                        className="np-act np-act--run"
                        onClick={() => probar(p)}
                        disabled={probingId === p}
                        title="Instalar, ejecutar y abrir en el navegador"
                      >
                        <PlayIcon />
                        {probingId === p ? 'Iniciando…' : 'Probar ejercicio'}
                      </button>
                      <button className="np-act np-act--danger" onClick={() => setPendingDelete(p)} title="Eliminar del workspace">
                        <TrashIcon />
                        Eliminar ejercicio
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de creación (reutiliza el selector de plantillas del IDE) */}
      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={async () => {
            setShowNew(false);
            await onRefresh();
          }}
        />
      )}

      {/* Alerta de confirmación de baja, centrada */}
      {pendingDelete && (
        <div className="np-modal-backdrop" onClick={() => !busy && setPendingDelete(null)}>
          <div className="np-alert" onClick={(e) => e.stopPropagation()}>
            <div className="np-alert-icon">
              <WarnIcon />
            </div>
            <div className="np-alert-title">Alerta</div>
            <p className="np-alert-text">¿Buscas eliminar el siguiente ejercicio?</p>
            <div className="np-alert-target">{pendingDelete}</div>
            <div className="np-alert-actions">
              <button className="np-btn np-btn--red" disabled={busy} onClick={confirmDelete}>
                {busy ? 'Eliminando…' : 'Sí'}
              </button>
              <button className="np-btn" disabled={busy} onClick={() => setPendingDelete(null)}>
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
