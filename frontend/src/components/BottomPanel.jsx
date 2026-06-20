import { useState } from 'react';
import TerminalPanel from './TerminalPanel';
import ControllerPanel from './ControllerPanel';

const TermIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 7l4 4-4 4M12 16h7" />
  </svg>
);
const CtrlIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
    <rect x="3" y="4" width="18" height="6" rx="1.5" />
    <rect x="3" y="14" width="18" height="6" rx="1.5" />
    <path d="M7 7h.01M7 17h.01" />
  </svg>
);

export default function BottomPanel({ project }) {
  const [tab, setTab] = useState('terminal');

  return (
    <div className="d-flex flex-column h-100">
      <div className="np-dock-head">
        <button className={`np-tab ${tab === 'terminal' ? 'active' : ''}`} onClick={() => setTab('terminal')}>
          <TermIcon />
          Terminal
        </button>
        <button className={`np-tab ${tab === 'controller' ? 'active' : ''}`} onClick={() => setTab('controller')}>
          <CtrlIcon />
          Controlador
        </button>
      </div>
      <div className="flex-grow-1 overflow-hidden position-relative">
        {/* La terminal se mantiene montada (display:none) para no perder logs. */}
        <div className="h-100" style={{ display: tab === 'terminal' ? 'block' : 'none' }}>
          <TerminalPanel project={project} active={tab === 'terminal'} />
        </div>
        <div className="h-100" style={{ display: tab === 'controller' ? 'block' : 'none' }}>
          <ControllerPanel active={tab === 'controller'} />
        </div>
      </div>
    </div>
  );
}
