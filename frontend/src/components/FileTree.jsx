import { useState } from 'react';

// Etiqueta mono coloreada según extensión (estilo del rediseño).
function extTag(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx'].includes(ext)) return ['JS', 'np-ext--js'];
  if (ext === 'json') return ['{}', 'np-ext--json'];
  if (['md', 'markdown'].includes(ext)) return ['md', 'np-ext--md'];
  if (['css', 'scss'].includes(ext)) return ['#', 'np-ext--json'];
  if (['html', 'htm'].includes(ext)) return ['<>', 'np-ext--default'];
  return ['•', 'np-ext--default'];
}

function FolderIcon() {
  return (
    <svg className="np-folder-ico" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function TreeNode({ node, depth, activePath, onOpen, onDelete }) {
  const [open, setOpen] = useState(depth < 1); // raíz expandida por defecto
  const isDir = node.type === 'dir';
  const isActive = node.path === activePath;
  const [tag, tagClass] = isDir ? [null, null] : extTag(node.name);

  const handleClick = () => {
    if (isDir) setOpen((o) => !o);
    else onOpen(node);
  };

  return (
    <div>
      <div
        className={`np-tree-row np-row ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={handleClick}
      >
        <span className="np-tree-caret">{isDir ? (open ? '▾' : '▸') : ''}</span>
        {isDir ? <FolderIcon /> : <span className={`np-ext ${tagClass}`}>{tag}</span>}
        <span className="np-tree-name" title={node.name}>
          {node.name}
        </span>
        <button
          className="np-tree-del"
          title="Eliminar"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node);
          }}
        >
          ✕
        </button>
      </div>
      {isDir && open && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ tree, activePath, onOpen, onDelete }) {
  if (!tree || tree.length === 0) {
    return (
      <div className="np-tree">
        <p className="np-hint" style={{ padding: '4px 8px' }}>
          Proyecto vacío.
        </p>
      </div>
    );
  }
  return (
    <div className="np-tree">
      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          activePath={activePath}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
