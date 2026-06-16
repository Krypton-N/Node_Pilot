// Cliente HTTP fino sobre la API de NodePilot. El proxy de Webpack reenvía
// /api y /healthz al backend (:3001), así que usamos rutas relativas.

async function request(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}`);
  }
  return data;
}

function json(method, url, body) {
  return request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export const api = {
  health: () => request('/healthz'),

  listTemplates: () => request('/api/templates'),
  listProjects: () => request('/api/projects'),
  createProject: (name, template) => json('POST', '/api/projects', { name, template }),
  deleteProject: (id) => request(`/api/projects/${id}`, { method: 'DELETE' }),

  getTree: (id) => request(`/api/projects/${id}/tree`),

  readFile: (id, path) =>
    request(`/api/projects/${id}/file?path=${encodeURIComponent(path)}`),
  saveFile: (id, path, content) => json('PUT', `/api/projects/${id}/file`, { path, content }),
  createEntry: (id, path, type) => json('POST', `/api/projects/${id}/file`, { path, type }),
  deleteEntry: (id, path) =>
    request(`/api/projects/${id}/file?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),

  // Ejecución de procesos (F2)
  listCommands: () => request('/api/commands'),
  run: (id, action) => json('POST', `/api/projects/${id}/run`, { action }),
  stop: (id) => request(`/api/projects/${id}/stop`, { method: 'POST' }),
  getStatus: (id) => request(`/api/projects/${id}/status`),
};
