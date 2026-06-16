const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const { WORKSPACE_ROOT } = require('../config/workspace');

// Comandos permitidos. `long: true` = proceso de larga duración (servidor).
const COMMANDS = {
  install: { cmd: 'npm', args: ['install'], long: false, label: 'npm install' },
  build: { cmd: 'npm', args: ['run', 'build'], long: false, label: 'npm run build' },
  start: { cmd: 'npm', args: ['start'], long: true, label: 'npm start' },
};

const LOG_LIMIT = 500; // líneas guardadas por proyecto para reconstruir la terminal

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Mata el árbol de procesos (en Windows un hijo con shell lanza cmd.exe -> node;
// hay que matar el árbol completo con taskkill /T, si no quedan zombies).
function killTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    exec(`taskkill /pid ${pid} /T /F`);
  } else {
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        /* ya no existe */
      }
    }
  }
}

class ProcessManager {
  constructor() {
    this.procs = new Map(); // projectId -> { child, action, startedAt, port, pid }
    this.logs = new Map(); // projectId -> [{ stream, line }]
    this.emit = () => {}; // lo conecta la capa WebSocket
    this.nextPort = 4001;
  }

  setEmitter(fn) {
    this.emit = fn;
  }

  listCommands() {
    return Object.entries(COMMANDS).map(([id, c]) => ({ id, label: c.label, long: c.long }));
  }

  status(projectId) {
    const rec = this.procs.get(projectId);
    if (!rec) return { projectId, running: false };
    return {
      projectId,
      running: true,
      action: rec.action,
      port: rec.port,
      pid: rec.pid,
      startedAt: rec.startedAt,
    };
  }

  getLogs(projectId) {
    return this.logs.get(projectId) || [];
  }

  _pushLog(projectId, stream, line) {
    let buf = this.logs.get(projectId);
    if (!buf) {
      buf = [];
      this.logs.set(projectId, buf);
    }
    buf.push({ stream, line });
    if (buf.length > LOG_LIMIT) buf.shift();
  }

  _log(projectId, stream, line) {
    this._pushLog(projectId, stream, line);
    this.emit({ type: 'log', projectId, stream, line });
  }

  _allocPort() {
    const p = this.nextPort++;
    if (this.nextPort > 4999) this.nextPort = 4001;
    return p;
  }

  run(projectId, action) {
    if (!/^[A-Za-z0-9_-]+$/.test(projectId || '')) throw httpError('Proyecto inválido.', 400);
    if (!COMMANDS[action]) throw httpError('Acción inválida.', 400);
    if (this.procs.has(projectId))
      throw httpError('Ya hay un proceso corriendo en este proyecto.', 409);

    const cwd = path.join(WORKSPACE_ROOT, projectId);
    if (!fs.existsSync(cwd)) throw httpError('Proyecto no encontrado.', 404);

    const def = COMMANDS[action];
    const port = def.long ? this._allocPort() : undefined;
    const env = { ...process.env };
    if (port) env.PORT = String(port);

    // Limpia el log de la corrida anterior.
    this.logs.set(projectId, []);

    const child = spawn(def.cmd, def.args, { cwd, shell: true, env, windowsHide: true });
    const rec = { child, action, startedAt: Date.now(), port, pid: child.pid };
    this.procs.set(projectId, rec);

    this._log(projectId, 'system', `$ ${def.label}${port ? `  (PORT=${port})` : ''}\n`);
    this.emit({ type: 'status', ...this.status(projectId) });

    child.stdout.on('data', (c) => this._log(projectId, 'stdout', c.toString()));
    child.stderr.on('data', (c) => this._log(projectId, 'stderr', c.toString()));

    child.on('error', (err) =>
      this._log(projectId, 'stderr', `\n[error al ejecutar: ${err.message}]\n`)
    );

    child.on('exit', (code, signal) => {
      this._log(projectId, 'system', `\n[proceso finalizado: código ${code ?? signal}]\n`);
      this.procs.delete(projectId);
      this.emit({ type: 'status', projectId, running: false, action, code });
    });

    return this.status(projectId);
  }

  stop(projectId) {
    const rec = this.procs.get(projectId);
    if (!rec) throw httpError('No hay proceso corriendo.', 409);
    killTree(rec.pid);
    return { projectId, stopping: true };
  }

  stopAll() {
    for (const rec of this.procs.values()) {
      try {
        killTree(rec.pid);
      } catch {
        /* best effort */
      }
    }
  }
}

module.exports = new ProcessManager();
