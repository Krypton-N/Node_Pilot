import { useEffect, useState } from 'react';
import { api } from '../api';

function healthInfo(p) {
  // install/build no tienen puerto -> mostramos la acción como pill neutra.
  if (!p.port) return { dotClass: 'np-dot--idle', pillClass: 'np-pill--idle', label: p.action };
  const map = {
    up: { dotClass: 'np-dot--green', pillClass: 'np-pill--green', label: 'activo' },
    starting: { dotClass: 'np-dot--idle', pillClass: 'np-pill--amber', label: 'iniciando' },
    down: { dotClass: 'np-dot--red', pillClass: 'np-pill--red', label: 'caído' },
  };
  return map[p.health] || { dotClass: 'np-dot--idle', pillClass: 'np-pill--idle', label: '—' };
}

function uptime(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - ts) / 1000);
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
}

function cmdLabel(action) {
  return action === 'install' ? 'npm install' : action === 'build' ? 'npm run build' : 'npm start';
}

export default function ControllerPanel({ active }) {
  const [procs, setProcs] = useState([]);

  useEffect(() => {
    if (!active) return;
    let on = true;
    const poll = async () => {
      try {
        const { processes } = await api.listProcesses();
        if (on) setProcs(processes);
      } catch {
        /* backend reiniciándose */
      }
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, [active]);

  const stop = (id) => api.stop(id).catch(() => {});
  const restart = (id) => api.restart(id).catch(() => {});

  if (procs.length === 0) {
    return (
      <div className="np-proc-list">
        <p className="np-hint" style={{ margin: 4 }}>
          No hay procesos en ejecución.
        </p>
      </div>
    );
  }

  return (
    <div className="np-proc-list">
      {procs.map((p) => {
        const h = healthInfo(p);
        return (
          <div key={p.projectId} className="np-proc np-lift">
            <div className="d-flex align-items-center" style={{ gap: 9, flex: 1, minWidth: 0 }}>
              <span className={`np-dot ${h.dotClass}`} style={{ width: 8, height: 8 }} />
              <span className="np-proc-name text-truncate">{p.projectId}</span>
              <span className="np-proc-meta np-mono">{cmdLabel(p.action)}</span>
              {p.port ? <span className="np-port">:{p.port}</span> : null}
              <span className={`np-pill ${h.pillClass}`}>{h.label}</span>
            </div>
            <div className="d-flex align-items-center" style={{ gap: 14 }}>
              <div className="np-metric">
                <div className="np-metric-val">{uptime(p.startedAt)}</div>
                <div className="np-metric-lbl">UPTIME</div>
              </div>
              <div className="d-flex" style={{ gap: 6 }}>
                {p.port && (
                  <a
                    className="np-btn"
                    href={`http://localhost:${p.port}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir
                  </a>
                )}
                {p.port && (
                  <button className="np-btn" onClick={() => restart(p.projectId)}>
                    Reiniciar
                  </button>
                )}
                <button className="np-btn np-btn--red" onClick={() => stop(p.projectId)}>
                  Detener
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
