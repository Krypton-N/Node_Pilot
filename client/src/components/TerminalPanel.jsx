import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { api } from '../api';

export default function TerminalPanel({ project }) {
  const elRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const [status, setStatus] = useState({ running: false });
  const [busy, setBusy] = useState(false);

  // Inicializa xterm una sola vez.
  useEffect(() => {
    const term = new Terminal({
      convertEol: true, // trata \n como \r\n (evita el efecto escalera)
      fontSize: 13,
      cursorBlink: false,
      disableStdin: true,
      theme: { background: '#1e1e1e', foreground: '#e0e0e0' },
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

  // Reajusta el tamaño al montar (el contenedor ya existe).
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        fitRef.current?.fit();
      } catch {
        /* noop */
      }
    }, 50);
    return () => clearTimeout(t);
  }, [project]);

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
      <div className="d-flex align-items-center gap-2 px-2 py-1 bg-dark text-white border-bottom">
        <span className="small fw-semibold me-2">Terminal</span>
        <div className="btn-group btn-group-sm">
          <button className="btn btn-outline-light" disabled={disabled} onClick={() => run('install')}>
            Instalar
          </button>
          <button className="btn btn-outline-light" disabled={disabled} onClick={() => run('build')}>
            Compilar
          </button>
          <button className="btn btn-success" disabled={disabled} onClick={() => run('start')}>
            ▶ Ejecutar
          </button>
        </div>
        <button className="btn btn-sm btn-danger" disabled={!status.running} onClick={stop}>
          ■ Detener
        </button>
        <span className="ms-auto small">
          {status.running ? (
            <span className="badge bg-success">
              ▶ {status.action}
              {status.port ? ` · :${status.port}` : ''}
            </span>
          ) : (
            <span className="badge bg-secondary">detenido</span>
          )}
        </span>
      </div>
      <div ref={elRef} className="flex-grow-1" style={{ overflow: 'hidden', background: '#1e1e1e' }} />
    </div>
  );
}
