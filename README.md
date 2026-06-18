# NodePilot

**NodePilot** es un entorno de desarrollo integrado (IDE) web ligero y asistido por Inteligencia Artificial, diseñado especialmente para acelerar el desarrollo de aplicaciones en el ecosistema **Node.js** (Express, APIs, Sequelize, MySQL). 

Con una interfaz moderna de estética premium en modo oscuro, NodePilot integra un editor de código avanzado, una terminal interactiva en vivo, un controlador de procesos y un potente copiloto de IA con validación sintáctica integrada.

---

## Tecnologías y Stack del Proyecto

NodePilot está construido sobre un stack de tecnologías modernas, organizadas en una arquitectura monorepo de cliente y servidor:

### Frontend (Cliente)
* ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) **React (ES6):** Interfaz ágil basada en componentes interactivos y dinámicos.
* ![Bootstrap](https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white) **Bootstrap 5:** Sistema de diseño responsivo y rejillas de interfaz premium.
* ![Webpack](https://img.shields.io/badge/Webpack-8DD6F9?style=for-the-badge&logo=webpack&logoColor=black) **Webpack 5 & Babel:** Compilación y empaquetado del código del lado del cliente.
* **Monaco Editor:** Editor de código avanzado con autocompletado en 3 capas.
* **Xterm.js:** Consola interactiva de alta fidelidad que simula una terminal ANSI en el navegador.

### Backend (Servidor)
* ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white) **Node.js & Express.js:** API central y servidor HTTP para procesar comandos y archivos.
* ![MySQL](https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white) **MySQL & Sequelize:** Persistencia del historial de chat e integración de base de datos para proyectos.
* ![WebSockets](https://img.shields.io/badge/WebSockets-000000?style=for-the-badge&logo=socketdotio&logoColor=white) **WS (WebSockets):** Conexión persistente para la transmisión de logs del proceso en tiempo real.
* **DeepSeek V4 API:** Inteligencia Artificial avanzada que actúa como asistente de desarrollo y motor de autocompletado.
* **ESLint:** Linter integrado para validación de código en caliente (grounding sintáctico de IA).

---

## Características Principales

### Explorador de Archivos
* Navegación en árbol recursiva y rápida.
* Soporte para operaciones de archivo y carpeta completo (crear, renombrar, eliminar).
* Aislamiento seguro contra ataques de Path Traversal mediante verificaciones estrictas de rutas en backend.

### Editor Monaco Avanzado
* Resaltado de sintaxis dinámico según el lenguaje del archivo.
* Atajos de teclado nativos como Guardar (Ctrl+S).
* **Autocompletado en 3 capas:**
  1. *Snippets Locales:* Plantillas rápidas para rutas, middlewares y modelos de Express/Sequelize.
  2. *Heurística local:* Autocompletado gris offline leyendo el propio archivo en caliente.
  3. *Copiloto con IA:* Autocompletado asistido mediante la API FIM (Fill-In-the-Middle) de DeepSeek.

### Terminal y Controlador de Procesos
* Consola interactiva basada en Xterm.js para visualizar logs en vivo.
* **Controlador de ejecución:** Instala dependencias (npm i), compila (npm run build) o ejecuta el servidor (npm start) con un solo botón.
* **Asignación de puertos dinámica:** Los proyectos de usuario se inician en un puerto libre autodetectado para prevenir colisiones de puertos (EADDRINUSE).
* **Health Check Activo:** Un timer realiza solicitudes HTTP cada 3 segundos contra el servidor del usuario para comprobar si el servicio está activo, iniciando o caído.

### Copiloto de IA Inteligente (DeepSeek)
* Envía explicaciones de código detalladas y propone la estructura de archivos completa.
* Carga de contexto automático: lee automáticamente la terminal de logs, el historial del chat y el archivo activo del editor.
* **Bucle de Autocorrección (Grounding):** El backend verifica el código generado de forma invisible mediante ESLint antes de presentarlo al usuario. Si hay errores sintácticos, le pide a la IA que los corrija hasta lograr un código válido.
* **Botón "Aplicar cambios":** Modifica los archivos en el disco físico de manera atómica con un solo click.

---

## Instalación y Configuración Local

Sigue estos pasos para levantar el entorno de NodePilot en tu máquina local:

### Requisitos Previos
1. **Node.js** (v18 o superior recomendado)
2. **MySQL Server** activo localmente

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/NodePilot.git
cd NodePilot
```

### 2. Configurar el Backend (Servidor)
1. Navega al directorio del servidor:
   ```bash
   cd server
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno creando un archivo `.env` en la raíz de la carpeta `server` a partir de `.env.example`:
   ```env
   # Puerto del backend de NodePilot
   PORT=3001

   # Configuración de base de datos MySQL para historial
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=nodepilot
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña

   # Clave API de DeepSeek para el Asistente
   DEEPSEEK_API_KEY=tu_api_key_aquí
   ```
4. Arranca el backend en modo desarrollo:
   ```bash
   npm run dev
   ```

### 3. Configurar el Frontend (Cliente)
1. En otra terminal, navega al directorio del cliente:
   ```bash
   cd client
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo de Webpack:
   ```bash
   npm run dev
   ```
4. Abre http://localhost:3000 en tu navegador. El proxy redirigirá automáticamente las peticiones de API hacia el servidor en el puerto 3001.

---

## Licencia y Autoría

Desarrollado y mantenido por **Noe Rodriguez**. Puedes conocer más sobre mi trabajo y proyectos en mi [Portafolio Profesional](https://krypton-n.github.io/Portafolio/).

*Este proyecto es de código abierto bajo la licencia MIT.*
