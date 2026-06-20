import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import agentImg from '../assets/agent.jpg';

function ValidationBadge({ validation, corrected }) {
  if (!validation) return null;
  if (validation.length === 0) {
    return (
      <span className="np-vbadge np-vbadge--ok" title="El código generado pasó ESLint">
        ✓ validado{corrected ? ` (autocorregido x${corrected})` : ''}
      </span>
    );
  }
  return (
    <span className="np-vbadge np-vbadge--warn" title="Quedaron errores tras autocorregir">
      ⚠ {validation.length} con errores
    </span>
  );
}

function extTag(path) {
  const ext = path.split('.').pop().toLowerCase();
  if (['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx'].includes(ext)) return ['JS', 'np-ext--js'];
  if (ext === 'json') return ['{}', 'np-ext--json'];
  if (['md', 'markdown'].includes(ext)) return ['md', 'np-ext--md'];
  return ['•', 'np-ext--default'];
}

function FileRow({ file }) {
  const [open, setOpen] = useState(false);
  const [tag, tagClass] = extTag(file.path);
  const lines = (file.content?.split('\n').length) || 0;
  return (
    <>
      <button className="np-file-row" onClick={() => setOpen((o) => !o)}>
        <span style={{ color: '#30b85c' }}>+</span>
        <span className={`np-ext ${tagClass}`} style={{ width: 'auto' }}>
          {tag}
        </span>
        <span>{file.path}</span>
        <span className="ms-auto" style={{ color: '#5a616a' }}>
          {open ? 'ocultar' : `${lines} líneas`}
        </span>
      </button>
      {open && <pre className="np-file-pre">{file.content}</pre>}
    </>
  );
}

function AssistantMessage({ msg, onApply, applied }) {
  return (
    <div className="np-msg np-assistant">
      <div className="d-flex align-items-center" style={{ gap: 8 }}>
        <ValidationBadge validation={msg.validation} corrected={msg.corrected} />
      </div>
      {msg.error ? (
        <div className="np-error">{msg.content}</div>
      ) : (
        <div className="np-assistant-text">{msg.content}</div>
      )}
      {msg.notes ? <div className="np-assistant-note">Nota: {msg.notes}</div> : null}

      {msg.files && msg.files.length > 0 && (
        <>
          <div className="np-files-card np-lift">
            <div className="np-files-head">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#969ca4" strokeWidth="1.7">
                <path d="M14 3v4a1 1 0 0 0 1 1h4M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
              </svg>
              <span>Archivos propuestos</span>
              <span className="ms-auto np-mono" style={{ fontSize: 10, color: '#30b85c' }}>
                +{msg.files.length}
              </span>
            </div>
            <div style={{ padding: '4px 0' }}>
              {msg.files.map((f) => (
                <FileRow key={f.path} file={f} />
              ))}
            </div>
          </div>

          <div className="np-actions">
            <button
              className={`np-btn ${applied ? 'np-btn--green' : 'np-btn--green'} np-lift`}
              onClick={() => onApply(msg.files)}
              disabled={applied}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 12l5 5L20 7" />
              </svg>
              {applied ? 'Aplicados' : 'Aplicar cambios'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AssistantPanel({ project, currentFile, onApplied }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('flash');
  const [busy, setBusy] = useState(false);
  const [appliedIdx, setAppliedIdx] = useState(new Set());
  const listRef = useRef(null);

  // Carga el historial persistido al cambiar de proyecto.
  useEffect(() => {
    setMessages([]);
    setAppliedIdx(new Set());
    if (!project) return;
    api
      .aiHistory(project)
      .then((d) => setMessages(d.messages.map((m) => ({ role: m.role, content: m.content }))))
      .catch(() => {});
  }, [project]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || !project || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setBusy(true);
    try {
      const context = currentFile?.path ? currentFile : undefined;
      const res = await api.aiChat(project, text, model, context);
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: res.explanation || '(sin explicación)',
          files: res.files,
          notes: res.notes,
          validation: res.validation,
          corrected: res.corrected,
        },
      ]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: e.message, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const apply = async (files, idx) => {
    try {
      await api.aiApply(project, files);
      setAppliedIdx((s) => new Set(s).add(idx));
      onApplied?.();
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `Error al aplicar: ${e.message}`, error: true }]);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const newConversation = async () => {
    if (busy) return;
    if (messages.length && !window.confirm('¿Empezar una conversación nueva? Se borrará el historial de este proyecto.')) {
      return;
    }
    setMessages([]);
    setAppliedIdx(new Set());
    setInput('');
    if (project) {
      try {
        await api.aiClearHistory(project);
      } catch {
        /* la UI ya quedó limpia aunque falle el borrado en el backend */
      }
    }
  };


  return (
    <aside className="np-ai np-panel np-panel--ai">
      {/* cabecera */}
      <div className="np-ai-head">
        <div className="d-flex align-items-center" style={{ gap: 9 }}>
          <img src={agentImg} alt="Agent Avatar" style={{ width: 26, height: 26, borderRadius: 8, objectFit: 'cover' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Asistente Node.js</div>
            <div style={{ fontSize: 10.5, color: '#5a616a' }}>DeepSeek V4</div>
          </div>
        </div>
        <div className="d-flex align-items-center" style={{ gap: 8 }}>
          <button
            className="np-iconbtn np-hov"
            title="Nueva conversación"
            onClick={newConversation}
            disabled={busy}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 20l1.4-4.2A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
              <path d="M12 8v6M9 11h6" />
            </svg>
          </button>
          {/* toggle de modelo (rojo = activo, regla de marca) */}
          <div className="np-toggle" title="Modelo DeepSeek">
            <button className={`np-toggle-opt ${model === 'flash' ? 'active' : ''}`} onClick={() => setModel('flash')}>
              Flash
            </button>
            <button className={`np-toggle-opt ${model === 'pro' ? 'active' : ''}`} onClick={() => setModel('pro')}>
              Pro
            </button>
          </div>
        </div>
      </div>
      {/* conversación */}
      <div ref={listRef} className="np-convo">
        {messages.length === 0 && !busy && (
          <p className="np-hint">
            Pídeme algo, p. ej.: <em>"Crea una API REST de usuarios con Express y Sequelize"</em>.
          </p>
        )}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="np-msg np-bubble-user">
              {m.content}
            </div>
          ) : (
            <AssistantMessage key={i} msg={m} applied={appliedIdx.has(i)} onApply={(files) => apply(files, i)} />
          )
        )}
        {busy && <div className="np-hint">Pensando…</div>}
      </div>

      {/* input */}
      <div className="np-ai-input">
        <div className="np-composer">
          <textarea
            rows={1}
            placeholder={project ? 'Escribe tu petición… (↵ para enviar)' : 'Selecciona un proyecto'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={!project || busy}
          />
          <button className="np-send np-lift" onClick={send} disabled={!project || busy || !input.trim()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
