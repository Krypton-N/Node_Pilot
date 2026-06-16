import Editor from '@monaco-editor/react';
import { languageForPath } from '../utils/language';

export default function EditorPane({ file, value, dirty, onChange, onSave }) {
  if (!file) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 text-muted">
        Selecciona un archivo del explorador para editarlo.
      </div>
    );
  }

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-light">
        <span className="fw-semibold">{file}</span>
        {dirty && <span className="badge bg-warning text-dark">sin guardar</span>}
        <button
          className="btn btn-sm btn-primary ms-auto"
          onClick={onSave}
          disabled={!dirty}
          title="Guardar (Ctrl+S)"
        >
          Guardar
        </button>
      </div>
      <div className="flex-grow-1">
        <Editor
          height="100%"
          theme="vs-dark"
          path={file}
          language={languageForPath(file)}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
