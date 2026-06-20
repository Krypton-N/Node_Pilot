const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, exec, execSync } = require('child_process');
const { WORKSPACE_ROOT } = require('../config/workspace');

// Comandos permitidos. `long: true` = proceso de larga duración (servidor).
const COMMANDS = {
  install: { cmd: 'npm', args: ['install'], long: false, label: 'npm install' },
  build: { cmd: 'npm', args: ['run', 'build'], long: false, label: 'npm run build' },
  start: { cmd: 'npm', args: ['start'], long: true, label: 'npm start' },
};

const LOG_LIMIT = 500; // líneas guardadas por proyecto para reconstruir la terminal
// Registro persistente de PIDs vivos, para matar huérfanos si el backend se reinicia.
// Se guarda en workspace/ (oculto: no es un directorio, no aparece como proyecto).
const RUNTIME_FILE = path.join(WORKSPACE_ROOT, '.runtime.json');

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

// Encuentra el PID que escucha en un puerto (Windows). Útil para matar un
// proceso huérfano cuyo PID original (el wrapper cmd.exe) ya murió.
function pidOnPort(port) {
  if (!port) return null;
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    for (const line of out.split('\n')) {
      const cols = line.trim().split(/\s+/);
      // Proto  LocalAddress  ForeignAddress  State  PID
      if (cols.length >= 5 && /LISTENING/i.test(cols[3]) && cols[1].endsWith(':' + port)) {
        if (cols[4] && cols[4] !== '0') return cols[4];
      }
    }
  } catch {
    /* netstat falló */
  }
  return null;
}

class ProcessManager {
  constructor() {
    this.procs = new Map(); // projectId -> { child, projectId, action, startedAt, port, pid, health, everUp }
    this.logs = new Map(); // projectId -> [{ stream, line }]
    this.emit = () => {}; // lo conecta la capa WebSocket
    this.nextPort = 4001;
    this.healthTimer = null;
  }

  setEmitter(fn) {
    this.emit = fn;
  }

  listCommands() {
    return Object.entries(COMMANDS).map(([id, c]) => ({ id, label: c.label, long: c.long }));
  }

  // --- Persistencia / limpieza de huérfanos --------------------------------

  // Al arrancar: mata cualquier proceso que quedara vivo de una sesión previa
  // (p. ej. si el backend crasheó o nodemon reinició sin limpiar).
  cleanupOrphans() {
    try {
      const arr = JSON.parse(fs.readFileSync(RUNTIME_FILE, 'utf8'));
      let killed = 0;
      for (const r of arr) {
        if (r.pid) killTree(r.pid);
        // El wrapper cmd.exe pudo morir dejando el node huérfano re-parentado;
        // por eso también matamos lo que siga escuchando en su puerto.
        const byPort = pidOnPort(r.port);
        if (byPort) killTree(byPort);
        if (r.pid || byPort) killed++;
      }
      if (killed) console.log(`[NodePilot] Limpiados ${killed} proceso(s) huérfano(s) de una sesión previa.`);
    } catch {
      /* no había registro previo */
    }
    this._persist();
  }

  _persist() {
    const arr = [...this.procs.values()].map((r) => ({
      projectId: r.projectId,
      pid: r.pid,
      port: r.port,
      action: r.action,
    }));
    try {
      fs.writeFileSync(RUNTIME_FILE, JSON.stringify(arr));
    } catch {
      /* best effort */
    }
  }

  // --- Health checks --------------------------------------------------------

  startHealthChecks() {
    if (!this.healthTimer) this.healthTimer = setInterval(() => this._checkHealth(), 3000);
  }

  _checkHealth() {
    for (const [projectId, rec] of this.procs) {
      if (!rec.port) continue; // solo procesos servidor tienen puerto
      const req = http.get(
        { host: '127.0.0.1', port: rec.port, path: '/', timeout: 1000 },
        (res) => {
          res.destroy();
          this._setHealth(projectId, 'up');
        }
      );
      req.on('error', () => this._setHealth(projectId, rec.everUp ? 'down' : 'starting'));
      req.on('timeout', () => {
        req.destroy();
        this._setHealth(projectId, rec.everUp ? 'down' : 'starting');
      });
    }
  }

  _setHealth(projectId, health) {
    const rec = this.procs.get(projectId);
    if (!rec) return;
    if (health === 'up') rec.everUp = true;
    if (rec.health !== health) {
      rec.health = health;
      this.emit({ type: 'status', ...this.status(projectId) });
    }
  }

  // --- Estado ---------------------------------------------------------------

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
      health: rec.health,
    };
  }

  listAll() {
    return [...this.procs.keys()].map((id) => this.status(id));
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

  // --- Ejecución ------------------------------------------------------------

  run(projectId, action) {
    if (!/^[A-Za-z0-9_-]+$/.test(projectId || '')) throw httpError('Proyecto inválido.', 400);
    if (!COMMANDS[action]) throw httpError('Acción inválida.', 400);
    if (this.procs.has(projectId))
      throw httpError('Ya hay un proceso corriendo en este proyecto.', 409);

    const cwd = path.join(WORKSPACE_ROOT, projectId);
    if (!fs.existsSync(cwd)) throw httpError('Proyecto no encontrado.', 404);

    // AISLAMIENTO: si el proyecto no tiene su propio package.json, `npm` subiría
    // por el árbol de directorios hasta el package.json de la raíz de NodePilot
    // y ejecutaría el MONOREPO (instalaría/arrancaría el propio NodePilot) en
    // lugar del proyecto del usuario. Lo bloqueamos con un error claro.
    if (!fs.existsSync(path.join(cwd, 'package.json'))) {
      throw httpError(
        'Este proyecto no tiene package.json. Pídele al asistente que cree uno (o crea el proyecto con la plantilla Express) antes de Instalar/Ejecutar.',
        400
      );
    }

    const def = COMMANDS[action];
    const port = def.long ? this._allocPort() : undefined;
    const env = { ...process.env };

    // Aislamiento: NO filtrar la configuración interna del IDE a los proyectos
    // del usuario. El backend carga su backend/.env (DB_NAME=nodepilot, claves
    // de IA, PORT) en process.env; sin esto, esas variables se heredarían al
    // proceso hijo y —como dotenv no sobrescribe variables ya existentes— el
    // .env propio del proyecto quedaría ignorado, haciendo que todos los
    // proyectos escribieran en la base `nodepilot`. Las quitamos para que cada
    // proyecto use su propio .env (su base de datos, su puerto, sus claves).
    for (const key of Object.keys(env)) {
      if (/^(DB_|DEEPSEEK_|GEMINI_|OPENROUTER_)/.test(key) || key === 'PORT') {
        delete env[key];
      }
    }

    // Resolución robusta de Node/npm. Con nvm en Windows, `npm` es un .cmd que
    // invoca a `node` vía PATH; pero el prefijo global (AppData\Roaming\npm)
    // tiene un npm.cmd SIN node.exe al lado, y el directorio de nvm es un
    // symlink que no siempre resuelve. Resultado: '"node" no se reconoce'.
    // Para evitarlo, invocamos npm con la ruta ABSOLUTA del node real +
    // npm-cli.js (sin depender del PATH ni del shell), y además anteponemos la
    // carpeta del node real al PATH para los scripts del propio proyecto
    // (p. ej. `npm start` -> `node src/index.js`).
    let nodeExe;
    try {
      nodeExe = fs.realpathSync(process.execPath); // resuelve el symlink de nvm
    } catch {
      nodeExe = process.execPath;
    }
    const nodeDir = path.dirname(nodeExe);
    const pathKey = Object.keys(env).find((k) => k.toLowerCase() === 'path') || 'PATH';
    env[pathKey] = nodeDir + path.delimiter + (env[pathKey] || '');
    if (port) env.PORT = String(port);

    // Comando a ejecutar: si encontramos npm-cli.js junto al node real, lo
    // lanzamos como `node npm-cli.js <args>` (a prueba de PATH). Si no, caemos
    // al `npm` clásico vía shell.
    const npmCli = path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js');
    const hasNpmCli = fs.existsSync(npmCli);
    const spawnCmd = hasNpmCli ? nodeExe : def.cmd;
    const spawnArgs = hasNpmCli ? [npmCli, ...def.args] : def.args;

    // Limpia el log de la corrida anterior.
    this.logs.set(projectId, []);

    const child = spawn(spawnCmd, spawnArgs, {
      cwd,
      shell: !hasNpmCli, // sin shell cuando invocamos node+npm-cli por ruta absoluta
      env,
      windowsHide: true,
    });
    const rec = {
      child,
      projectId,
      action,
      startedAt: Date.now(),
      port,
      pid: child.pid,
      health: port ? 'starting' : undefined,
      everUp: false,
    };
    this.procs.set(projectId, rec);
    this._persist();

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
      this._persist();
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

  // Igual que stop() pero NO lanza si no hay proceso. Mata el árbol del proceso
  // y, por si el wrapper murió dejando un node escuchando, lo que siga en su
  // puerto. Devuelve true si había algo que matar, para que el llamador espere
  // a que Windows libere los archivos antes de borrar la carpeta del proyecto.
  stopSilently(projectId) {
    const rec = this.procs.get(projectId);
    if (!rec) return false;
    killTree(rec.pid);
    const byPort = pidOnPort(rec.port);
    if (byPort) killTree(byPort);
    this.procs.delete(projectId);
    this._persist();
    this.emit({ type: 'status', ...this.status(projectId) });
    return true;
  }

  async restart(projectId) {
    const rec = this.procs.get(projectId);
    const action = rec ? rec.action : 'start';
    if (rec) {
      killTree(rec.pid);
      await this._waitStopped(projectId, 5000);
    }
    return this.run(projectId, action);
  }

  _waitStopped(projectId, ms) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        if (!this.procs.has(projectId) || Date.now() - t0 > ms) {
          clearInterval(iv);
          resolve();
        }
      }, 150);
    });
  }

  stopAll() {
    for (const rec of this.procs.values()) {
      try {
        killTree(rec.pid);
      } catch {
        /* best effort */
      }
    }
    this.procs.clear();
    this._persist();
  }
}

module.exports = new ProcessManager();
