# Guía de Git - Proyecto MesaFacil

Esta guía detalla los pasos para subir el proyecto a GitHub por primera vez y realizar operaciones comunes de Git.

## 1. Configuración Inicial (Primera vez)

Si aún no has iniciado Git en tu carpeta local:

```bash
# Inicializar el repositorio local
git init

# Agregar el repositorio remoto
git remote add origin https://github.com/Krypton-N/SaaS_MesaFacil.git

# Verificar que el remoto se agregó correctamente
git remote -v
```

## 2. Subir el proyecto por primera vez

Sigue estos pasos para realizar tu primer "push" a la rama principal:

```bash
# 1. Agregar todos los archivos al área de preparación (staging)
git add .

# 2. Crear el primer commit
git commit -m "Initial commit: Estructura base del proyecto MesaFacil"

# 3. Asegurarse de que la rama principal se llame 'main'
git branch -M main

# 4. Subir los cambios a GitHub
# El parámetro -u establece el seguimiento para que luego solo uses 'git push'
git push -u origin main
```

## 3. Trabajo con Ramas (Branches)

Las ramas permiten desarrollar nuevas funcionalidades sin afectar el código estable.

### Crear y cambiar de rama
```bash
# Crear una nueva rama
git branch nombre-de-la-rama

# Cambiar a la rama creada
git checkout nombre-de-la-rama

# Opcional: Crear y cambiar en un solo paso
git checkout -b nombre-de-la-rama
```

### Realizar commits en una rama
El proceso es el mismo que en `main`, pero afectará solo a la rama actual:
```bash
# 1. Realiza tus cambios en el código
# 2. Agrega los cambios
git add .
# 3. Haz el commit
git commit -m "Descripción de los cambios en la rama"
```

### Subir una rama a GitHub
```bash
git push origin nombre-de-la-rama
```

## 4. Comandos Frecuentes

| Comando | Descripción |
| :--- | :--- |
| `git status` | Ver el estado de los archivos (modificados, agregados, etc.) |
| `git log` | Ver el historial de commits |
| `git pull origin main` | Descargar los últimos cambios desde GitHub |
| `git branch` | Listar todas las ramas locales |
| `git diff` | Ver las diferencias exactas en el código antes de un commit |

---
**Nota:** Asegúrate de que los archivos sensibles (como `.env`) estén incluidos en el archivo `.gitignore` antes de hacer el primer `git add .` para evitar subirlos accidentalmente.
