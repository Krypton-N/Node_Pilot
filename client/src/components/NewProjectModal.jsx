import { useEffect, useState } from 'react';
import { api } from '../api';

export default function NewProjectModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('empty');
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listTemplates().then((d) => setTemplates(d.templates)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[A-Za-z0-9_-]+$/.test(name)) {
      setError('Solo letras, números, - y _ (sin espacios).');
      return;
    }
    setBusy(true);
    try {
      await api.createProject(name, template);
      onCreated(name);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <form className="modal-content" onSubmit={submit}>
          <div className="modal-header">
            <h5 className="modal-title">Nuevo proyecto</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <div className="mb-3">
              <label className="form-label">Nombre</label>
              <input
                className="form-control"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                placeholder="mi-proyecto"
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Plantilla</label>
              {templates.map((t) => (
                <div className="form-check" key={t.id}>
                  <input
                    className="form-check-input"
                    type="radio"
                    name="template"
                    id={`tpl-${t.id}`}
                    checked={template === t.id}
                    onChange={() => setTemplate(t.id)}
                  />
                  <label className="form-check-label" htmlFor={`tpl-${t.id}`}>
                    <strong>{t.label}</strong>
                    <span className="text-muted small d-block">{t.description}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Creando…' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
