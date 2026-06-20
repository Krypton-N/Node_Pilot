// Mapea la extensión de un archivo al lenguaje que entiende Monaco.
const MAP = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  html: 'html',
  css: 'css',
  scss: 'scss',
  md: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  sql: 'sql',
  sh: 'shell',
  env: 'ini',
};

export function languageForPath(path = '') {
  const ext = path.split('.').pop().toLowerCase();
  return MAP[ext] || 'plaintext';
}
