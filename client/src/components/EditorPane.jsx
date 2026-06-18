import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { api } from '../api';
import { languageForPath } from '../utils/language';

// Estado compartido con los proveedores de Monaco (que se registran una sola
// vez a nivel de módulo, no por instancia del editor).
// - heuristic: ghost text instantáneo desde el propio archivo (siempre on).
// - aiEnabled: respaldo con IA (lento ~3s), opcional vía el toggle.
const inlineState = { aiEnabled: true, language: 'javascript' };
let providersRegistered = false;

// ---------------------------------------------------------------------------
// Tema oscuro alineado con los tokens del rediseño.
// ---------------------------------------------------------------------------
function defineTheme(monaco) {
  monaco.editor.defineTheme('nodepilot-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'B98AE8' },
      { token: 'string', foreground: '8FD98F' },
      { token: 'number', foreground: 'E8A13A' },
      { token: 'type', foreground: '9BD1FF' },
      { token: 'function', foreground: '6DA8FF' },
      { token: 'comment', foreground: '5A616A', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#0F1216',
      'editor.foreground': '#C9CED4',
      'editorLineNumber.foreground': '#3D434B',
      'editorLineNumber.activeForeground': '#5A616A',
      'editor.lineHighlightBackground': '#FFFFFF06',
      'editor.selectionBackground': '#E0352A40',
      'editorCursor.foreground': '#E0352A',
      'editorGutter.background': '#0F1216',
      'editorWidget.background': '#15181C',
      'editorSuggestWidget.background': '#15181C',
      'editorSuggestWidget.border': '#FFFFFF12',
      'editorSuggestWidget.selectedBackground': '#FFFFFF12',
      'editorGhostText.foreground': '#6B727B',
      'editor.inactiveSelectionBackground': '#FFFFFF12',
    },
  });
}

// ---------------------------------------------------------------------------
// CAPA 1 (sin IA): snippets deterministas de Node.js / Express / Sequelize.
// Aparecen en el popup de IntelliSense al escribir su prefijo.
// ---------------------------------------------------------------------------
function snippetItems(monaco, range) {
  const K = monaco.languages.CompletionItemKind.Snippet;
  const asSnippet = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
  const snip = (label, detail, insertText) => ({
    label,
    kind: K,
    detail,
    insertText,
    insertTextRules: asSnippet,
    range,
  });
  return [
    snip('npreq', 'require(...)', "const ${1:mod} = require('${2:module}');"),
    snip(
      'nproute',
      'Ruta Express',
      "router.${1|get,post,put,delete|}('${2:/ruta}', (req, res) => {\n\t${3:res.json({});}\n});"
    ),
    snip(
      'nprouter',
      'Router Express completo',
      "const express = require('express');\nconst router = express.Router();\n\nrouter.get('/', (req, res) => {\n\t${1:res.json({});}\n});\n\nmodule.exports = router;\n"
    ),
    snip(
      'npapp',
      'App Express básica',
      "const express = require('express');\nconst app = express();\napp.use(express.json());\n\n${1}\n\nconst PORT = process.env.PORT ?? ${2:4000};\napp.listen(PORT, () => console.log(`API en :${PORT}`));\n"
    ),
    snip(
      'npmw',
      'Middleware Express',
      "function ${1:nombre}(req, res, next) {\n\t${2}\n\tnext();\n}"
    ),
    snip(
      'npmodel',
      'Modelo Sequelize',
      "const { DataTypes } = require('sequelize');\nconst sequelize = require('${1:../db/connection}');\n\nconst ${2:Modelo} = sequelize.define('${3:modelo}', {\n\t${4:nombre}: { type: DataTypes.STRING, allowNull: false },\n});\n\nmodule.exports = ${2:Modelo};\n"
    ),
    snip('npasync', 'Handler async', "async (req, res) => {\n\ttry {\n\t\t${1}\n\t} catch (err) {\n\t\tres.status(500).json({ error: err.message });\n\t}\n}"),
    snip('npjson', 'res.json', 'res.json(${1:data});'),
    snip('npstatus', 'res.status().json', 'res.status(${1:400}).json({ error: ${2:msg} });'),
  ];
}

// ---------------------------------------------------------------------------
// CAPA 2a (SIN IA): ghost text heurístico estilo fish/Warp.
// Mientras escribes una línea, busca en el resto del archivo otra línea que
// empiece igual y sugiere el resto en gris. Instantáneo, offline, no alucina.
// ---------------------------------------------------------------------------
function heuristicCompletion(model, position) {
  const line = model.getLineContent(position.lineNumber);
  const after = line.slice(position.column - 1);
  if (after.trim().length) return ''; // sólo sugerimos al final del contenido
  const prefix = line.slice(0, position.column - 1);
  const trimmed = prefix.replace(/^\s+/, '');
  if (trimmed.length < 3) return ''; // evita ruido con prefijos muy cortos

  const total = model.getLineCount();
  // Recorre primero hacia arriba (lo más reciente) y luego hacia abajo.
  const order = [];
  for (let i = position.lineNumber - 1; i >= 1; i--) order.push(i);
  for (let i = position.lineNumber + 1; i <= total; i++) order.push(i);
  for (const ln of order) {
    const t = model.getLineContent(ln).replace(/^\s+/, '');
    if (t.length > trimmed.length && t.startsWith(trimmed)) {
      return t.slice(trimmed.length); // resto de esa línea
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// CAPA 2b (con IA): inline completions contra el backend DeepSeek (respaldo).
// ---------------------------------------------------------------------------
function registerProviders(monaco) {
  if (providersRegistered) return;
  providersRegistered = true;
  const langs = ['javascript', 'typescript', 'json', 'html', 'css'];

  // Snippets deterministas. (Todo envuelto: una excepción aquí, al venir de
  // Monaco cargado por CDN, llegaría como "Script error." sin traza.)
  monaco.languages.registerCompletionItemProvider(['javascript', 'typescript'], {
    provideCompletionItems(model, position) {
      try {
        const word = model.getWordUntilPosition(position);
        const range = new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        );
        return { suggestions: snippetItems(monaco, range) };
      } catch {
        return { suggestions: [] };
      }
    },
  });

  // Ghost text: heurística primero (instantánea), IA después (respaldo opcional).
  monaco.languages.registerInlineCompletionsProvider(langs, {
    provideInlineCompletions: async (model, position, _ctx, token) => {
      try {
        const cursor = new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        );

        // (1) Heurística instantánea desde el propio archivo — sin red.
        const h = heuristicCompletion(model, position);
        if (h) return { items: [{ insertText: h, range: cursor }] };

        // (2) Respaldo con IA (sólo si el toggle está activo).
        if (!inlineState.aiEnabled) return { items: [] };

        // Debounce: si el usuario sigue escribiendo, Monaco cancela este token.
        await new Promise((r) => setTimeout(r, 350));
        if (token.isCancellationRequested) return { items: [] };

        let prefix = model.getValueInRange(
          new monaco.Range(1, 1, position.lineNumber, position.column)
        );
        const lastLine = model.getLineCount();
        let suffix = model.getValueInRange(
          new monaco.Range(position.lineNumber, position.column, lastLine, model.getLineMaxColumn(lastLine))
        );
        // No molestar al inicio de un archivo casi vacío.
        if (prefix.trim().length < 2) return { items: [] };
        // Limita tamaño para latencia/costo.
        if (prefix.length > 2000) prefix = prefix.slice(-2000);
        if (suffix.length > 1000) suffix = suffix.slice(0, 1000);

        const controller = new AbortController();
        token.onCancellationRequested(() => controller.abort());

        let completion = '';
        try {
          const res = await api.aiComplete(
            { prefix, suffix, language: inlineState.language },
            controller.signal
          );
          completion = (res.completion || '').replace(/\s+$/, '');
        } catch {
          return { items: [] }; // sin API key / error / abort => sin sugerencia
        }
        if (token.isCancellationRequested || !completion) return { items: [] };

        return { items: [{ insertText: completion, range: cursor }] };
      } catch {
        return { items: [] }; // nunca propagamos hacia Monaco
      }
    },
    freeInlineCompletions() {},
  });
}

function handleBeforeMount(monaco) {
  defineTheme(monaco);
  // Mejora el IntelliSense nativo de JS (capa 1).
  if (monaco.languages.typescript) {
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      allowJs: true,
      checkJs: false,
      allowNonTsExtensions: true,
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true, // no marcamos errores de tipos en JS suelto
      noSyntaxValidation: false,
    });
  }
  registerProviders(monaco);
}

// ---------------------------------------------------------------------------
function fileExtTag(file) {
  const ext = file.split('.').pop().toLowerCase();
  if (['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx'].includes(ext)) return ['JS', 'np-ext--js'];
  if (ext === 'json') return ['{}', 'np-ext--json'];
  if (['md', 'markdown'].includes(ext)) return ['md', 'np-ext--md'];
  return ['•', 'np-ext--default'];
}

export default function EditorPane({ file, value, dirty, onChange, onSave }) {
  const [aiOn, setAiOn] = useState(() => localStorage.getItem('np-ai-autocomplete') !== 'off');

  // Mantiene sincronizado el estado compartido con los proveedores de Monaco.
  useEffect(() => {
    inlineState.aiEnabled = aiOn;
    localStorage.setItem('np-ai-autocomplete', aiOn ? 'on' : 'off');
  }, [aiOn]);

  useEffect(() => {
    if (file) inlineState.language = languageForPath(file);
  }, [file]);

  if (!file) {
    return <div className="np-empty">Selecciona un archivo del explorador para editarlo.</div>;
  }

  const parts = file.split('/');
  const [tag, tagClass] = fileExtTag(file);

  return (
    <div className="d-flex flex-column h-100">
      <div className="np-editor-head">
        <div className="np-editor-file">
          <span className={`np-ext ${tagClass}`} style={{ width: 'auto' }}>
            {tag}
          </span>
          <span>{parts[parts.length - 1]}</span>
        </div>
        {dirty && <span className="np-pill np-pill--amber">sin guardar</span>}
        <div className="ms-auto d-flex align-items-center" style={{ gap: 8 }}>
          <button
            className="np-btn"
            onClick={() => setAiOn((v) => !v)}
            title={
              'Sugerencia gris (Tab para aceptar). Heurística siempre activa; ' +
              'este botón añade el respaldo con IA (más lento).'
            }
            style={
              aiOn
                ? { color: '#9bd1ff', borderColor: 'rgba(108,168,255,.4)', background: 'rgba(108,168,255,.1)' }
                : undefined
            }
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z" />
            </svg>
            IA {aiOn ? 'on' : 'off'}
          </button>
          <button
            className="np-btn np-btn--green"
            onClick={onSave}
            disabled={!dirty}
            title="Guardar (Ctrl+S)"
          >
            Guardar
          </button>
        </div>
      </div>
      <div className="np-breadcrumb">
        {parts.map((p, i) => (
          <span key={i} className="d-flex align-items-center" style={{ gap: 6 }}>
            {i > 0 && <span style={{ opacity: 0.5 }}>›</span>}
            <span style={{ color: i === parts.length - 1 ? '#969ca4' : undefined }}>{p}</span>
          </span>
        ))}
      </div>
      <div className="flex-grow-1">
        <Editor
          height="100%"
          theme="nodepilot-dark"
          beforeMount={handleBeforeMount}
          path={file}
          language={languageForPath(file)}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 22,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12 },
            quickSuggestions: { other: true, comments: false, strings: false },
            suggestOnTriggerCharacters: true,
            tabCompletion: 'on',
            inlineSuggest: { enabled: true },
          }}
        />
      </div>
    </div>
  );
}
