# Handoff: Rediseño visual de NodePilot

> **Para Claude Code / desarrollador:** este paquete es **solo una referencia visual**. El objetivo es **reaplicar este aspecto sobre la app NodePilot ya existente (React + Bootstrap) sin cambiar su funcionalidad**. No copies el HTML tal cual: traduce los estilos a los componentes React que ya tienes.

---

## ⚠️ Regla nº 1 — No romper la funcionalidad

Esto es **solo un re-skin** (cambio de CSS/estructura visual). NO toques:

- Llamadas a la API REST (`/api/projects/:id/tree`, `/files`, etc.).
- Conexión WebSocket de logs/estado en vivo.
- Handlers de los botones **Instalar / Compilar / Ejecutar / Detener** y la lógica del `RunnerService` / `ProcessManager`.
- Integración de **Monaco** (editor), **xterm.js** (terminal), el proxy de **Preview** (`/preview/:id`).
- Lógica del asistente IA (envío de prompt, selección de modelo Flash/Pro, historial en MySQL).
- Estado de la app, rutas, autenticación JWT.

Trabaja **componente por componente**: mantén los mismos `props`, `state`, `onClick`, refs y data-flow; cambia únicamente `className`/estilos/markup contenedor. Si dudas si algo es lógica o presentación, pregunta antes de tocarlo.

---

## Overview

NodePilot es un IDE web + asistente IA para proyectos Node.js. Este rediseño reemplaza la interfaz Bootstrap clara actual por una UI **dark-mode premium** (estilo Linear / Cursor / Warp / Arc) manteniendo exactamente las mismas zonas funcionales: barra superior, sidebar de archivos, editor central con pestañas, dock de terminal/controlador y panel de IA a la derecha.

## About the Design Files

- `NodePilot.dc.html` — prototipo en HTML del rediseño. Es una **referencia de aspecto y comportamiento**, no código de producción. Contiene **dos variaciones de layout** conmutables con el selector flotante inferior:
  - **A · Paneles flotantes** (recomendado): tres superficies "glass" separadas por márgenes sobre fondo grafito.
  - **B · Workspace unificado**: superficie continua con *activity rail* a la izquierda, divisores *hairline* y terminal Warp permanente.
- Recrea la variación que el equipo elija en los componentes React existentes, usando tu sistema actual (o reemplazando Bootstrap por CSS modules / styled-components / Tailwind si así lo decidís).

## Fidelity

**Alta fidelidad (hi-fi).** Colores, tipografías, espaciados, radios y estados son finales. Recréalos con precisión.

---

## Design Tokens

### Color
| Token | Hex / valor | Uso |
|---|---|---|
| `--bg` | `#0B0D10` | Fondo base (grafito profundo) |
| `--bg-gradient` | radial `rgba(217,43,33,.10)` arriba-dcha + radial `rgba(40,52,66,.30)` abajo-izq sobre `#0B0D10` | Fondo con profundidad sutil |
| `--surface` | `rgba(18,21,25,.85–.9)` | Paneles (sidebar, IA) |
| `--surface-editor` | `rgba(15,18,22,.9)` | Panel del editor / dock |
| `--surface-raised` | `rgba(255,255,255,.025)` | Tarjetas internas, fila activa |
| `--border` | `rgba(255,255,255,.06)` | Bordes de panel |
| `--border-strong` | `rgba(255,255,255,.09)` | Divisores, inputs |
| `--text` | `#E8EAED` | Texto principal (blanco suave) |
| `--text-2` | `#969CA4` | Texto secundario (gris acero) |
| `--text-3` | `#5A616A` | Texto atenuado / placeholders |
| `--red` | `#E0352A` (de `#FF3B30`→`#D92B21`) | **Identidad de marca** |
| `--red-deep` | `#9E1B14` / `#B0211A` | Fin de gradiente del logo/botón enviar |
| `--red-soft-bg` | `rgba(224,53,42,.12)` | Fondo de acentos rojos sutiles |
| `--green` | `#30B85C` (texto `#8FE0AB`) | Estado **activo / ejecutar / OK** |
| `--blue` | `#6DA8FF` | Puertos, métodos HTTP, git |
| `--amber` | `#E8A13A` | Avisos, números, iconos JS |
| Sintaxis código | kw `#B98AE8` · string `#8FD98F` · func `#6DA8FF` · prop `#9BD1FF` · plano `#C9CED4` · gutter `#3D434B` |

> **Regla de color crítica (pedida por el cliente):** el rojo es **identidad**, NO se usa en todos los botones. **Ejecutar** debe ser **verde sobrio** (un "ejecutando" en rojo parece error). El rojo se reserva para: logo, archivo/tab activo, selector de modelo activo, botón **Enviar** del chat y **Detener**.

### Tipografía
- **UI:** `Inter` (pesos 400 / 450 / 500 / 600 / 700).
- **Código, terminal, métricas, puertos, pids:** `JetBrains Mono` (400 / 500 / 700).
- Tamaños: base UI `13px`; labels secundarios `11–12px`; uppercase de sección `10.5–11px` con `letter-spacing .06–.08em`; código del editor `13px / line-height 1.85`.

### Forma, sombra, espaciado
- **Radio:** paneles `14px`; tarjetas/inputs `9–12px`; chips/botones `7–9px`; pills de estado `20px`. (Sin esquinas cuadradas duras.)
- **Sombra de panel:** `0 8px 30px rgba(0,0,0,.35)` (panel IA `.40`).
- **Glass:** `backdrop-filter: blur(18–20px)` en barra superior y selector flotante.
- **Gap entre paneles (layout A):** `10px`, padding del contenedor `10px`.
- **Bordes:** hairline `1px` `rgba(255,255,255,.06)`; evita líneas divisorias de más.

### Animaciones (discretas)
- `np-pulse` 2.4s — punto de estado verde (latido suave).
- `np-caret` 1.1s steps — cursor parpadeante en editor/terminal.
- `np-fade` 0.4s — entrada de mensajes del chat.
- Hover: `transition .16s`; `np-lift` sube `translateY(-1px)` + sombra en tarjetas/botones primarios.

---

## Screens / Views (zonas de la pantalla)

### 1. Barra superior (≈50px, full-width, glass)
- **Izquierda:** logo NodePilot (cuadro `25px` radio `8px`, gradiente `#E0352A→#9E1B14`, punto blanco central) + wordmark 700 `-0.02em`; divisor; selector de proyecto "NavyProject" (chip con cuadro de color + `▾`).
- **Derecha:** chip "backend activo" (verde, punto con `np-pulse`) · chip "build ok · 1.2s" (✓ verde) · chip rama git "main" (icono branch) · icono ajustes · avatar circular `28px` "JL".
- Mapea: estado real del backend (WebSocket), estado de build, rama git activa, usuario, ajustes. **Mantén la fuente de datos actual.**

### 2. Sidebar izquierda (266px, panel flotante) — *layout A*
- Buscador rápido (`⌘K`) → conecta a tu búsqueda existente.
- **Explorador de archivos:** árbol con `src/ > routes/ > users.js`, `db/`, `index.js` (activo, fondo `rgba(224,53,42,.13)` + barra roja `inset 2px 0 0 #E0352A`), `package.json`, etc. Iconos = etiqueta mono (`JS`, `{}`, `md`) coloreada; badges git `M`/`A`. **El árbol y el archivo activo vienen del estado real.**
- **Cambios (git status):** contador + lista de archivos modificados con `M`/`A`.
- *Layout B:* lo mismo pero como columna plana con borde derecho + un **activity rail** de 52px a la izquierda (iconos: explorador [activo, barra roja], buscar, git, ejecutar, ajustes abajo).

### 3. Zona central — editor con pestañas
- **Tab strip:** `Código` (activo) · `Vista previa` · `Terminal` · `Logs` · `Base de datos`. Cada tab tiene icono; el activo: texto blanco, fondo `rgba(255,255,255,.06)`, `inset 0 0 0 1px rgba(255,255,255,.08)`. "Cada pestaña se siente como una app independiente."
- **Tab Código:** fila de archivos abiertos (estilo navegador, activo con subrayado rojo `inset 0 -2px 0 #E0352A`), breadcrumb `src › index.js`, y editor Monaco con gutter de números (`46–48px`, color `#3D434B`), resaltado según tokens de arriba, línea activa `rgba(255,255,255,.025)` y caret rojo. **Sustituye este bloque por tu instancia de Monaco con el tema oscuro equivalente.**
- **Tab Vista previa:** barra de URL (`localhost:4000/api/users`) + chip `200 OK · 12ms`; contenido = `<iframe>` del proxy de preview. **Mantén el iframe/proxy.**
- **Tab Terminal / Logs / Base de datos:** ver prototipo; conecta a xterm.js, stream de logs y tu visor de BD respectivamente.

### 4. Dock inferior — pestañas **Terminal | Controlador** (layout A)
- Cabecera: pestañas `Terminal | Controlador` (mismo estilo que el tab strip) + a la derecha los controles **Instalar / Compilar** (sobrios, gris) · **Ejecutar** (verde) · **Detener** (rojo).
- **Terminal:** logs mono en vivo (xterm.js), prompt `❯` rojo, caret parpadeante.
- **Controlador:** tarjetas de proceso `{ nombre, pid, puerto, estado }` — Express `activo` (punto verde `np-pulse`, métricas Memoria/CPU/Uptime) y Webpack `inactivo` (con botón Iniciar). **Datos del ProcessManager vía WebSocket.**
- *Layout B:* la terminal es un dock Warp permanente (212px) con bloques de comando.

### 5. Panel derecho — Asistente IA (384px / 362px)
- Cabecera: avatar romboidal rojo + "Asistente Node.js" / "DeepSeek V4" + toggle **Flash / Pro** (segmentado; activo en rojo). **Conserva la selección de modelo.**
- Chip de **contexto** del archivo actual (`src/index.js` · tokens). En layout B además fila de estado del proyecto (Tests 18/18, Lint, Deploy).
- **Conversación:** burbuja de usuario (alineada dcha, fondo rojo sutil, radio `13/13/4/13`) + respuesta del asistente con: texto, **tarjeta de archivos generados/cambios propuestos** (`+ db/User.js`, `+ routes/users.js` con nº de líneas), bloque de código mini, y **acciones sugeridas** (chips: "Aplicar cambios" [verde], "Ver diff", "Ejecutar tests", "Explicar"). **Estos son los puntos de enganche con tu AIService y el workspace.**
- **Input:** toggle "Adjuntar archivo abierto" + textarea autoexpandible + botón Enviar (rojo, gradiente). `⌘↵` para enviar.

---

## Interactions & Behavior (en el prototipo)
- Cambio de pestañas central y de dock (Terminal/Controlador) por estado local.
- Toggle de modelo Flash/Pro y toggle de "Adjuntar archivo".
- Envío de chat: añade la burbuja del usuario a la conversación.
- Selector de variación A/B (solo para la demo de diseño; en producción elegís UNA).
- Hover en filas/botones, latido del estado, caret parpadeante.
> En la app real, estos enganches ya existen — solo reviste los elementos que los disparan; no reimplementes la lógica.

## State Management (mapeo, no reemplazo)
Reusa el estado/datos que ya maneja la app: árbol y archivo activo, contenido del editor, estado de procesos (WebSocket), logs, mensajes del chat + modelo seleccionado, estado de build/backend/git. El prototipo usa estado local solo para demostrar el aspecto.

## Assets
Sin imágenes externas. Todos los iconos son **SVG inline** (stroke `1.6–2`) y el logo es CSS (gradiente + punto). Fuentes vía Google Fonts (Inter, JetBrains Mono) — usa las equivalentes que ya cargue el proyecto si las hay.

## Files
- `NodePilot.dc.html` — prototipo del rediseño (layouts A y B). Ábrelo en el navegador para inspeccionar medidas/colores exactos con DevTools.
