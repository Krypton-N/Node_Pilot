# Guía de Solución: Conexión MySQL y Generación de CRUD con Sequelize

Esta guía contiene el diagnóstico de tu problema de conexión, instrucciones para resolverlo en Windows y el prompt óptimo que debes darle al asistente de **NodePilot** para que genere el CRUD.

---

## 1. Diagnóstico de tu error de MySQL

Hemos realizado un diagnóstico en tu sistema y detectamos lo siguiente:

* **Servicio MySQL80:** Se encuentra en estado **Stopped** (Detenido).
* **Puerto 3306:** No hay ningún proceso escuchando en este puerto.
* **Error del Backend:** Al intentar conectar, Sequelize devuelve un error `ECONNREFUSED`, lo que confirma que el backend no puede comunicarse con la base de datos porque el servicio de MySQL está apagado.

### Cómo encender MySQL en Windows (Elige una opción)

#### Opción A: Desde la ventana de Servicios de Windows (Recomendada)
1. Presiona la combinación de teclas `Win + R`.
2. Escribe `services.msc` y presiona **Enter**.
3. En la lista, busca el servicio llamado **MySQL80** (o **MySQL**).
4. Haz clic derecho sobre él y selecciona **Iniciar** (o *Start*).

#### Opción B: Desde PowerShell como Administrador
1. Abre el menú de inicio, busca **PowerShell**, haz clic derecho sobre él y elige **Ejecutar como Administrador**.
2. Ejecuta el siguiente comando:
   ```powershell
   Start-Service -Name MySQL80
   ```

> [!IMPORTANT]
> **Crear la Base de Datos:** Una vez que inicies el servicio, recuerda que Sequelize **no crea la base de datos automáticamente**, solo crea las tablas dentro de ella. 
> Debes entrar a MySQL Workbench, MySQL Shell o phpMyAdmin y crear la base de datos vacía ejecutando:
> ```sql
> CREATE DATABASE IF NOT EXISTS nodepilot;
> ```

---

## 2. Qué plantilla elegir en el modal de NodePilot

En la pantalla de **Nuevo proyecto** de NodePilot (la que aparece en la imagen que subiste), debes elegir la plantilla:

### **`API REST (Express)`**

**¿Por qué?**
* **Ahorras tiempo:** Ya viene con `express` configurado, una estructura básica de carpetas (`src/index.js`), soporte para solicitudes JSON (`express.json()`) y un endpoint de ejemplo en memoria.
* **Es más fácil para la IA:** El asistente de NodePilot puede tomar este código como base y simplemente reemplazar el array en memoria por la conexión a Sequelize.

---

## 3. Prompt para el Asistente de IA de NodePilot

Una vez que hayas creado tu proyecto usando la plantilla **API REST (Express)**, abre el chat con el asistente de IA dentro de NodePilot y escribe el siguiente prompt (puedes copiar y pegar directamente):

```text
Quiero que modifiques este proyecto para agregar persistencia con una base de datos MySQL usando Sequelize. Por favor, realiza las siguientes tareas de forma automática en el workspace:

1. Agrega las dependencias "sequelize" y "mysql2" a package.json.
2. Crea un archivo src/config/database.js que configure Sequelize para conectarse a MySQL. Usa variables de entorno para la configuración:
   - DB_HOST (default: localhost)
   - DB_PORT (default: 3306)
   - DB_NAME (default: tu_nombre_de_bd)
   - DB_USER (default: root)
   - DB_PASSWORD (default: tu_password)
3. Crea un modelo de Sequelize en src/models/Product.js (o User.js) con al menos 4 campos (ej: id, nombre, precio, stock).
4. Modifica src/index.js para importar la conexión a la base de datos, sincronizar los modelos usando sequelize.sync() al iniciar, y reemplaza las rutas del CRUD en memoria por consultas reales de Sequelize (findAll, findByPk, create, update, destroy). **Asegúrate de agregar una ruta raíz `app.get('/', ...)` que devuelva una página HTML con el listado de todos los endpoints CRUD y un mensaje que indique que la sincronización con la base de datos se realizó con éxito, para que no de un error 'Cannot GET /' al abrir la pestaña de Preview.**
5. Crea un archivo .env de ejemplo en la raíz del proyecto para que yo pueda configurar mis credenciales de MySQL.
```

### ¿Qué hará el asistente de NodePilot al recibir este prompt?
Gracias a la arquitectura de NodePilot, el asistente generará los archivos estructurados en formato JSON y el backend los guardará automáticamente en el workspace de tu proyecto. Luego, solo tendrás que ejecutar el instalador de dependencias y levantar el servidor.
