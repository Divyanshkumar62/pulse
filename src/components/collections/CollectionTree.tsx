import { useState, useMemo, useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useTabStore } from '../../stores/useTabStore';
import ContextMenu, { ContextMenuItem } from '../ui/ContextMenu';
import VirtualList from '../ui/VirtualList';
import { toast } from 'sonner';
import ExportModal from '../modals/ExportModal';
import VariablesModal from '../modals/VariablesModal';

type TreeItem = 
  | { type: 'collection'; id: string; name: string; data: any; level: number }
  | { type: 'folder'; id: string; name: string; data: any; level: number }
  | { type: 'request'; id: string; name: string; method: string; data: any; level: number };

export default function CollectionTree() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { openTab } = useTabStore();
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, items: ContextMenuItem[]} | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [containerHeight, setContainerHeight] = useState(500);
  const [exportingCollection, setExportingCollection] = useState<any | null>(null);
  const [variableCollection, setVariableCollection] = useState<any | null>(null);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  useEffect(() => {
    const updateHeight = () => setContainerHeight(window.innerHeight - 120);
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedItems(newExpanded);
  };

  const flattenedItems = useMemo(() => {
    const items: TreeItem[] = [];
    if (!activeWorkspace) return items;

    activeWorkspace.collections.forEach(collection => {
      items.push({ type: 'collection', id: collection.id, name: collection.name, data: collection, level: 0 });
      
      if (expandedItems.has(collection.id)) {
        collection.requests.forEach(req => {
          items.push({ type: 'request', id: req.id, name: req.name, method: req.method, data: req, level: 1 });
        });
        
        collection.folders.forEach(folder => {
          items.push({ type: 'folder', id: folder.id, name: folder.name, data: folder, level: 1 });
          if (expandedItems.has(folder.id)) {
            folder.requests.forEach(req => {
              items.push({ type: 'request', id: req.id, name: req.name, method: req.method, data: req, level: 2 });
            });
          }
        });
      }
    });

    return items;
  }, [activeWorkspace, expandedItems]);

  const handleContextMenu = (e: React.MouseEvent, type: 'collection' | 'folder' | 'request', data: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    const items: ContextMenuItem[] = [];
    if (type === 'collection') {
      items.push({ label: 'New Request', icon: '⚡', onClick: () => toast('New Request coming soon') });
      items.push({ label: 'New Folder', icon: '📁', onClick: () => toast('New Folder coming soon') });
      items.push({ label: 'Export', icon: '📤', onClick: () => setExportingCollection(data) });
      items.push({ label: 'Variables', icon: '🔧', onClick: () => setVariableCollection(data) });
      items.push({ label: 'Rename', icon: '✏️', onClick: () => toast('Rename coming soon') });
      items.push({ label: 'Delete', icon: '🗑️', danger: true, onClick: () => toast('Delete coming soon') });
    } else if (type === 'folder') {
      items.push({ label: 'New Request', icon: '⚡', onClick: () => toast('New Request coming soon') });
      items.push({ label: 'New Folder', icon: '📁', onClick: () => toast('New Folder coming soon') });
      items.push({ label: 'Rename', icon: '✏️', onClick: () => toast('Rename coming soon') });
      items.push({ label: 'Delete', icon: '🗑️', danger: true, onClick: () => toast('Delete coming soon') });
    } else if (type === 'request') {
      items.push({ label: 'Rename', icon: '✏️', onClick: () => toast('Rename coming soon') });
      items.push({ label: 'Duplicate', icon: '📄', onClick: () => toast('Duplicate coming soon') });
      items.push({ label: 'Delete', icon: '🗑️', danger: true, onClick: () => toast('Delete coming soon') });
    }
    
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const renderTreeItem = (item: TreeItem) => {
    const paddingLeft = item.level * 12 + 8;

    if (item.type === 'collection' || item.type === 'folder') {
      const isExpanded = expandedItems.has(item.id);
      return (
        <div 
          onClick={() => toggleExpand(item.id)}
          onContextMenu={(e) => handleContextMenu(e, item.type, item.data)}
          style={{ 
            paddingLeft,
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            height: '32px',
            cursor: 'pointer', 
            borderRadius: '4px',
            fontSize: item.type === 'collection' ? '13px' : '12px',
            fontWeight: item.type === 'collection' ? 600 : 500,
            color: item.type === 'collection' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-overlay)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'none', display: 'inline-block', fontSize: '10px' }}>▶</span>
          {item.type === 'collection' ? '📁' : '📂'} {item.name}
        </div>
      );
    }

    return (
      <div 
        className="tree-request-item"
        style={{ paddingLeft: paddingLeft + 18, height: '32px' }}
        onClick={() => openTab(item.data)}
        onContextMenu={(e) => handleContextMenu(e, 'request', item.data)}
      >
        <span className={`method-badge method-${item.method.toLowerCase()}`} style={{ width: '36px', textAlign: 'center', fontSize: '9px' }}>{item.method}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: 'var(--space-4) var(--space-3)', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.1)' }}>
        <select 
          style={{ 
            width: '100%', 
            background: 'var(--bg-elevated)', 
            border: '1px solid var(--border-subtle)', 
            color: 'var(--text-primary)', 
            padding: '10px 12px', 
            borderRadius: 'var(--radius-md)', 
            outline: 'none', 
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all var(--transition-base)',
            appearance: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          value={activeWorkspaceId || ''}
          onChange={(e) => setActiveWorkspace(e.target.value)}
        >
          {workspaces.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>
      
      <div style={{ flex: 1, padding: 'var(--space-2) 0' }}>
        {flattenedItems.length > 0 ? (
          <VirtualList
            items={flattenedItems}
            height={containerHeight}
            itemHeight={34}
            renderItem={(item) => (
              <div 
                style={{ height: '34px' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {renderTreeItem(item)}
              </div>
            )}
            overscan={10}
          />
        ) : (
          <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '60px', fontSize: '13px', fontWeight: 500 }}>
            {activeWorkspace ? 'No collections found.' : 'Initialising environment...'}
            {!activeWorkspace && <div className="loading-spinner" style={{ margin: '20px auto' }}></div>}
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />
      )}

      {exportingCollection && (
        <ExportModal 
          collection={exportingCollection} 
          onClose={() => setExportingCollection(null)} 
        />
      )}

      {variableCollection && (
        <VariablesModal 
          collection={variableCollection} 
          onClose={() => setVariableCollection(null)} 
        />
      )}
    </div>
  );
}
