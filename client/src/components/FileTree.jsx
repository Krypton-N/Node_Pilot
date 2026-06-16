import { useState } from 'react';

function iconFor(node, open) {
  if (node.type === 'dir') return open ? '📂' : '📁';
  return '📄';
}

function TreeNode({ node, depth, activePath, onOpen, onDelete }) {
  const [open, setOpen] = useState(depth < 1); // raíz expandida por defecto
  const isDir = node.type === 'dir';
  const isActive = node.path === activePath;

  const handleClick = () => {
    if (isDir) setOpen((o) => !o);
    else onOpen(node);
  };

  return (
    <div>
      <div
        className={`d-flex align-items-center gap-1 px-2 py-1 rounded tree-row ${
          isActive ? 'bg-primary-subtle' : ''
        }`}
        style={{ paddingLeft: 8 + depth * 14, cursor: 'pointer' }}
        onClick={handleClick}
      >
        <span>{iconFor(node, open)}</span>
        <span className="text-truncate flex-grow-1" title={node.name}>
          {node.name}
        </span>
        <button
          className="btn btn-sm btn-link text-danger p-0 tree-del"
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
    return <p className="text-muted small px-2">Proyecto vacío.</p>;
  }
  return (
    <div className="file-tree small">
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
