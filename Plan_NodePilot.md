# NodePilot — Plan de Desarrollo

**Qué es:** una app web full-stack que es a la vez (a) un **IDE en el navegador** capaz de crear/editar archivos, compilar, ejecutar y previsualizar proyectos Node.js, y (b) un **asistente de IA experto en el ecosistema Node.js** (Express, REST, middleware, rutas, Sequelize, MySQL, JWT, WebSockets) guiado por patrones de prompt engineering.

**Stack obligatorio (NodePilot.md):** Node.js · React (ES6) · Bootstrap · MySQL · Express.js · Sequelize · Babel · Webpack.
**Referencia del profe:** Spring AI — prompt engineering patterns → el componente "con prompt" es parte central, no decorativa.

---

## 0. Principio rector arquitectónico

> La maquinaria del IDE vive en el **backend** (Express, con `fs` y `child_process`). El **navegador** (React) solo manda órdenes y muestra resultados.

Es el modelo de Replit/StackBlitz/Gitpod. "Es web" limita al navegador, no al servidor: el backend corre en una máquina real con Node completo y puede hacer todo lo que un IDE de escritorio.

```
┌─ Navegador (React + Bootstrap, ES6, build con Babel+Webpack) ──────────┐
│  Explorador de archivos · Editor (Monaco) · Pestaña Terminal/Logs       │
│  Pestaña Preview (<iframe>) · Pestaña Controlador (procesos) · Chat IA   │
└───────────────┬──────────────────────────────────┬─────────────────────┘
                │ REST (archivos, comandos)         │ WebSocket (logs/estado en vivo)
┌───────────────▼──────────────────────────────────▼─────────────────────┐
│  Backend NodePilot — Express                                            │
│   ├─ FileService    (fs: crear/leer/editar/borrar dentro de workspace/) │
│   ├─ RunnerService  (child_process: npm install/build/start)            │
│   ├─ ProcessManager (registro {pid,puerto,estado,logs} = mini-PM2)      │
│   ├─ ProxyService   (/preview/:id → puerto interno del proyecto)        │
│   ├─ AuthService    (JWT) + persistencia (Sequelize → MySQL)            │
│   └─ AIService      (construye prompt con patrones → LLM)               │
│                                                                        │
│  workspace/<projectId>/   ← proyectos del usuario en disco             │
│  MySQL: usuarios, proyectos, historial de chat, metadatos              │
└────────────────────────────────────────────────────────────────────────┘
                (Fase 6, opcional) ──► Qopa RAG como microservicio externo
```

**Decisiones de alcance ya tomadas:**
- Terminal = **solo logs** (stdout/stderr vía WebSocket + xterm.js de solo lectura). Sin `node-pty` (dependencia nativa problemática en Windows).
- Preview = **proceso hijo + reverse proxy** a `<iframe>`.
- Seguridad: un usuario, en `localhost` → ejecutar código del usuario es aceptable. (Multiusuario requeriría Docker por proyecto; fuera de alcance.)

---

## 1. Stack de implementación (con su porqué)

| Capa | Selección | Justificación |
|---|---|---|
| Backend | **Express.js** (obligatorio) | Núcleo del IDE: `fs`, `child_process`, proxy |
| ORM / BD | **Sequelize → MySQL** (obligatorios) | Usuarios, proyectos, historial de chat |
| Auth | **JWT** | Sesiones; en el dominio que pide el profe |
| Tiempo real | **WebSocket** (`ws` o Socket.IO) | Logs y estado de procesos en vivo |
| Frontend | **React 18 (ES6)** + **Bootstrap** (obligatorios) | UI del IDE |
| Build front | **Babel + Webpack** (obligatorios) | Transpila ES6/JSX y empaqueta |
| Editor de código | **Monaco** (`@monaco-editor/react`) | Motor de VS Code; resaltado, autocompletado |
| Terminal (display) | **xterm.js** | Render de logs en pestaña terminal |
| Proxy de preview | **http-proxy-middleware** | `/preview/:id` → puerto interno del hijo |
| IA | LLM vía API **DeepSeek V4** (`pro` y `flash`) | Genera/explica código Node.js; `flash` para tareas rápidas/baratas, `pro` para razonamiento complejo |
| RAG (opcional, F6) | **Qopa** como microservicio externo | Grounding + citas + abstención |

---

## 2. Fases de desarrollo

Cada fase termina con una **salida verificable**. Orden pensado para tener algo demostrable cuanto antes y dejar lo difícil (procesos/preview) a media obra, con el RAG al final.

### F0 — Cimientos (1-2 días)
- Monorepo: `/server` (Express) y `/client` (React + Babel + Webpack).
- Express con `GET /healthz`; Sequelize conectado a MySQL (`sequelize.authenticate()` ok).
- React arrancando con Webpack dev server + Bootstrap cargado.
- **Salida:** `/healthz` responde; la UI vacía carga y consume `/healthz`.

### F1 — Workspace y archivos (3-4 días)  · *complejidad: baja-media*
- `FileService` con `fs`: árbol de directorios, crear/leer/editar/borrar, **encerrado a `workspace/<projectId>/`** (validar path traversal).
- Endpoints REST: `GET /api/projects/:id/tree`, `GET/PUT/POST/DELETE /api/projects/:id/files`.
- UI: explorador de archivos + **Monaco** con guardado.
- Scaffolding: crear proyecto desde plantilla (Express básico / API REST / etc.).
- **Salida:** crear un proyecto, ver su árbol, editar un archivo y que persista en disco.

### F2 — Compilar y ejecutar (logs) (4-5 días)  · *complejidad: media*
- `RunnerService`: `child_process.spawn` para `npm install`, build (Webpack/Babel), `npm start`.
- Stream de stdout/stderr al front por **WebSocket**; render en **xterm.js** (pestaña Terminal).
- **Salida:** botón "Instalar/Compilar/Ejecutar"; los logs aparecen en vivo en la terminal.

### F3 — ProcessManager + Controlador (4-5 días)  · *complejidad: media — núcleo del proyecto*
- Registro de procesos: `{ projectId, pid, puerto, estado, logs[] }`.
- Asignación de puertos sin colisión; start/stop/restart; detección de crash; **kill al cerrar** (evitar zombies).
- Health-check (¿puerto abierto? ¿HTTP 200 en `/`?) → estado "activo/caído".
- UI: **pestaña Controlador** que lista procesos y su estado (¿Express activo?) en tiempo real vía WebSocket.
- **Salida:** levantar un Express dentro de NodePilot y ver en la pestaña que está corriendo; pararlo y verlo caer.

### F4 — Preview integrada (3-4 días)  · *complejidad: media-alta*
- `ProxyService` con **http-proxy-middleware**: `/preview/:id/*` → puerto interno del proceso hijo.
- UI: **pestaña Preview** con `<iframe src="/preview/:id">`; refrescar al reiniciar.
- Manejo de casos borde: assets con rutas absolutas, WebSockets internos de la app del usuario.
- **Salida:** ejecutar un proyecto Express con vista y verla renderizada dentro de NodePilot.

### F5 — Asistente de IA "con prompt" (4-5 días)  · *complejidad: media — diferenciador para la nota*
- `AIService`: cliente de **DeepSeek V4** (modelos `pro` y `flash`, seleccionables por tipo de tarea) que arma el prompt con **patrones (Spring AI):** role prompting ("eres experto en Node.js"), few-shot con ejemplos correctos de Express/Sequelize, salida estructurada, instrucción de "responde solo lo que sabes".
- Acciones del asistente sobre el workspace: generar archivos, explicar/corregir código.
- **Grounding empírico (anti-alucinación sin RAG):** el asistente ejecuta `eslint`/`tsc`/tests sobre lo que genera y, si falla, re-pide corrección.
- Persistir historial de chat en MySQL.
- **Salida:** pedir "crea una API REST con Express + Sequelize" y que genere, escriba y valide los archivos en el workspace.

### F6 — Integración RAG (opcional) (3-4 días)  · *complejidad: media — solo si hay tiempo*
- `AIService` consulta **Qopa** (HTTP/MCP) con corpus de docs Node/Express/Sequelize/JWT/ws/Bootstrap/React.
- Inyecta pasajes recuperados + citas en el prompt; muestra citas y abstención en la UI.
- Fallback de embeddings por API si la demo no corre en la máquina con GPU.
- **Salida:** respuestas del asistente citando documentación oficial; "no encontrado" cuando no hay evidencia.

---

## 3. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Procesos zombies / puertos ocupados | Cleanup en `process.on('exit')`; matar hijos al parar/cerrar; pool de puertos |
| Path traversal (escribir fuera del workspace) | Normalizar y validar que la ruta resuelta esté dentro de `workspace/<id>/` |
| Preview rota por rutas de assets | Documentar que el proyecto del usuario use rutas relativas; probar con plantilla propia |
| Alcance demasiado grande para el curso | F0–F5 es el entregable completo; F6 (RAG) es bonus |
| node-pty en Windows | Ya descartado: terminal de solo lectura |

---

## 4. Mínimo demostrable (si el tiempo aprieta)

F0 + F1 + F2 + F3 = **IDE web funcional** que crea proyectos, los compila/ejecuta y monitorea si Express está activo. Eso ya cumple el espíritu del `.md`. F4 (preview), F5 (IA) y F6 (RAG) suben la nota en ese orden de prioridad.
