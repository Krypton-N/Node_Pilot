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
    <div className="np-modal-backdrop" onClick={onClose}>
      <form className="np-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="np-modal-head">
          <span>Nuevo proyecto</span>
          <button type="button" className="np-iconbtn np-hov" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="np-modal-body">
          {error && <div className="np-error">{error}</div>}
          <div>
            <label className="np-label">Nombre</label>
            <input
              className="np-input"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="mi-proyecto"
            />
          </div>
          <div>
            <label className="np-label">Plantilla</label>
            {templates.map((t) => (
              <label
                key={t.id}
                htmlFor={`tpl-${t.id}`}
                className={`np-tpl ${template === t.id ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="template"
                  id={`tpl-${t.id}`}
                  checked={template === t.id}
                  onChange={() => setTemplate(t.id)}
                  style={{ marginTop: 3, accentColor: '#e0352a' }}
                />
                <span>
                  <span className="np-tpl-title">{t.label}</span>
                  <span className="np-tpl-desc d-block">{t.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="np-modal-foot">
          <button type="button" className="np-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="np-btn np-btn--green" disabled={busy}>
            {busy ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  );
}
