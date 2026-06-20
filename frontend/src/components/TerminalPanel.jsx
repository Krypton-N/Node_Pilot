import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { api } from '../api';

export default function TerminalPanel({ project, active = true }) {
  const elRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const [status, setStatus] = useState({ running: false });
  const [busy, setBusy] = useState(false);

  // Inicializa xterm una sola vez.
  useEffect(() => {
    const term = new Terminal({
      convertEol: true, // trata \n como \r\n (evita el efecto escalera)
      fontSize: 12.5,
      fontFamily: "'JetBrains Mono', monospace",
      lineHeight: 1.3,
      cursorBlink: true,
      disableStdin: true,
      theme: {
        background: '#0a0c0f',
        foreground: '#c9ced4',
        cursor: '#e0352a',
        selectionBackground: 'rgba(224,53,42,.25)',
        green: '#30b85c',
        brightGreen: '#8fe0ab',
        blue: '#6da8ff',
        yellow: '#e8a13a',
        red: '#e0352a',
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(elRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    const onResize = () => {
      try {
        fit.fit();
      } catch {
        /* el contenedor aún no tiene tamaño */
      }
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      term.dispose();
    };
  }, []);

  // Conecta el WebSocket (logs en vivo) con reconexión automática.
  useEffect(() => {
    if (!project || !termRef.current) return;
    const term = termRef.current;
    term.clear();

    let closed = false;
    let ws;
    let retry;

    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/np-ws`);
      ws.onopen = () => ws.send(JSON.stringify({ action: 'subscribe', projectId: project }));
      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === 'history') {
          term.clear();
          msg.logs.forEach((l) => term.write(l.line));
        } else if (msg.type === 'log') {
          term.write(msg.line);
        } else if (msg.type === 'status') {
          setStatus(msg);
        }
      };
      // Si el backend se reinicia (nodemon), reintenta y vuelve a suscribirse.
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 1500);
      };
      ws.onerror = () => ws.close();
    };
    connect();

    return () => {
      closed = true;
      clearTimeout(retry);
      if (ws) ws.close();
    };
  }, [project]);

  // Estado por REST cada 2s: fuente de verdad robusta para el badge/botones,
  // aunque el WebSocket se haya caído o perdido un evento.
  useEffect(() => {
    if (!project) {
      setStatus({ running: false });
      return;
    }
    let active = true;
    const poll = async () => {
      try {
        const st = await api.getStatus(project);
        if (active) setStatus(st);
      } catch {
        /* backend reiniciándose */
      }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [project]);

  // Reajusta el tamaño al montar o al volver a la pestaña Terminal.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      try {
        fitRef.current?.fit();
      } catch {
        /* noop */
      }
    }, 50);
    return () => clearTimeout(t);
  }, [project, active]);

  const run = async (action) => {
    if (!project) return;
    setBusy(true);
    try {
      await api.run(project, action);
    } catch (e) {
      termRef.current?.write(`\r\n[${e.message}]\r\n`);
      // Resincroniza el badge (p. ej. si ya había un proceso corriendo).
      try {
        setStatus(await api.getStatus(project));
      } catch {
        /* noop */
      }
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    try {
      await api.stop(project);
    } catch (e) {
      termRef.current?.write(`\r\n[${e.message}]\r\n`);
    }
  };

  const disabled = !project || status.running || busy;

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex align-items-center" style={{ gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
        <span className="ms-1">
          {status.running ? (
            <span className="np-pill np-pill--green">
              ▶ {status.action}
              {status.port ? ` · :${status.port}` : ''}
            </span>
          ) : (
            <span className="np-pill np-pill--idle">detenido</span>
          )}
        </span>
        {/* Controles sobrios; sólo Ejecutar es verde y Detener rojo (regla de marca). */}
        <div className="ms-auto d-flex align-items-center" style={{ gap: 6 }}>
          <button className="np-btn" disabled={disabled} onClick={() => run('install')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            Instalar
          </button>
          <button className="np-btn" disabled={disabled} onClick={() => run('build')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 3v4a1 1 0 0 0 1 1h4M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
            </svg>
            Compilar
          </button>
          <button className="np-btn np-btn--green np-lift" disabled={disabled} onClick={() => run('start')}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4l14 8-14 8z" />
            </svg>
            Ejecutar
          </button>
          <button className="np-btn np-btn--red" disabled={!status.running} onClick={stop}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="2" />
            </svg>
            Detener
          </button>
        </div>
      </div>
      <div ref={elRef} className="np-terminal flex-grow-1" />
    </div>
  );
}
