import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

export default function PreviewPanel({ project, active }) {
  const [status, setStatus] = useState({ running: false });
  const [nonce, setNonce] = useState(0); // fuerza recarga del iframe
  const iframeRef = useRef(null);

  // Sondea el estado para saber si hay algo que previsualizar y en qué puerto.
  useEffect(() => {
    if (!project) {
      setStatus({ running: false });
      return;
    }
    let on = true;
    const poll = async () => {
      try {
        const st = await api.getStatus(project);
        if (on) setStatus(st);
      } catch {
        /* backend reiniciándose */
      }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, [project]);

  const reload = () => setNonce((n) => n + 1);
  const canPreview = status.running && status.port;

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex align-items-center" style={{ gap: 9, padding: '9px 12px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <button className="np-iconbtn np-hov" onClick={reload} disabled={!canPreview} title="Recargar">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
        <div className="np-url">
          <span style={{ color: canPreview ? '#30b85c' : '#5a616a' }}>●</span>
          {canPreview ? (
            <span>
              localhost:{status.port}
              <span style={{ color: '#5a616a' }}>/</span>
            </span>
          ) : (
            <span style={{ color: '#5a616a' }}>sin ejecución</span>
          )}
          {canPreview && (
            <a
              className="ms-auto np-hov"
              href={`/preview/${project}/`}
              target="_blank"
              rel="noreferrer"
              title="Abrir en pestaña"
              style={{ color: '#969ca4', padding: '2px 4px', borderRadius: 6 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <path d="M15 3h6v6M10 14L21 3" />
              </svg>
            </a>
          )}
        </div>
        {canPreview && <span className="np-pill np-pill--green">● activo</span>}
      </div>

      <div className="np-iframe-wrap">
        {canPreview ? (
          <iframe
            ref={iframeRef}
            key={`${status.port}-${nonce}`}
            title="preview"
            src={`/preview/${project}/?t=${nonce}`}
            style={{ width: '100%', height: '100%', border: 0 }}
          />
        ) : (
          <div className="np-empty" style={{ background: 'transparent' }}>
            <div>
              <p style={{ marginBottom: 6, color: '#969ca4' }}>No hay nada que previsualizar.</p>
              <p className="np-hint" style={{ margin: 0 }}>
                Ejecuta el proyecto con <b style={{ color: '#8fe0ab' }}>▶ Ejecutar</b> en la terminal y vuelve aquí.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
