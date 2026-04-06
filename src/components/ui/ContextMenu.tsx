import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) menuRef.current.style.left = `${window.innerWidth - rect.width}px`;
      if (rect.bottom > window.innerHeight) menuRef.current.style.top = `${window.innerHeight - rect.height}px`;
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (items.length === 0) return null;

  return (
    <div 
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 20000,
        minWidth: '160px',
        display: 'flex',
        flexDirection: 'column'
      }}
      onContextMenu={e => e.preventDefault()}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={(e) => { e.stopPropagation(); item.onClick(); onClose(); }}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '8px 12px',
            textAlign: 'left',
            color: item.danger ? 'var(--status-error)' : 'var(--text-primary)',
            fontSize: '12px',
            cursor: 'pointer',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = item.danger ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-overlay)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {item.icon && <span style={{ width: '16px', textAlign: 'center' }}>{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
}
