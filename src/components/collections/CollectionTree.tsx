import { useState, useMemo, useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useTabStore } from '../../stores/useTabStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import ContextMenu, { ContextMenuItem } from '../ui/ContextMenu';
import VirtualList from '../ui/VirtualList';
import CustomSelect from '../ui/CustomSelect';
import { toast } from 'sonner';
import ExportModal from '../modals/ExportModal';
import { v4 as uuidv4 } from 'uuid';

type TreeItem = 
  | { type: 'collection'; id: string; name: string; data: any; level: number }
  | { type: 'folder'; id: string; name: string; data: any; level: number }
  | { type: 'request'; id: string; name: string; method: string; data: any; level: number };

export default function CollectionTree() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { openTab } = useTabStore();
  const { collections, addCollection, addFolder, addRequest } = useCollectionStore();
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, items: ContextMenuItem[]} | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [containerHeight, setContainerHeight] = useState(500);
  const [exportingCollection, setExportingCollection] = useState<any | null>(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [renamingItem, setRenamingItem] = useState<{ id: string; type: 'collection' | 'folder' | 'request'; name: string } | null>(null);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    
    const newCollection = {
      id: uuidv4(),
      name: newCollectionName.trim(),
      description: null,
      requests: [],
      folders: [],
      variables: []
    };
    
    await addCollection(newCollection, activeWorkspaceId || '');
    setNewCollectionName('');
    setIsCreatingCollection(false);
    toast.success(`Collection "${newCollectionName}" created`);
  };

  const handleCreateFolder = (collectionId: string) => {
    const newFolder = {
      id: uuidv4(),
      name: 'New Folder',
      requests: []
    };
    addFolder(collectionId, newFolder);
    setExpandedItems(prev => new Set([...prev, collectionId]));
    toast.success('Folder created');
  };

  const handleCreateRequest = (collectionId: string, folderId: string | null) => {
    const newRequest = {
      id: uuidv4(),
      name: 'New Request',
      method: 'GET' as const,
      url: '',
      headers: [],
      body: { type: 'none' as const, content: '' }
    };
    addRequest(collectionId, folderId, newRequest);
    openTab(newRequest);
    toast.success('Request created');
  };

  const handleRename = (id: string, type: 'collection' | 'folder' | 'request', currentName: string) => {
    setRenamingItem({ id, type, name: currentName });
  };

  const handleRenameSubmit = () => {
    if (!renamingItem) return;
    
    if (renamingItem.type === 'collection') {
      // Update collection name
      // For now just close the rename
    } else if (renamingItem.type === 'folder') {
      // Update folder name
    } else if (renamingItem.type === 'request') {
      // Update request name
    }
    
    setRenamingItem(null);
    toast.success('Item renamed');
  };

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

    collections.forEach(collection => {
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
  }, [collections, expandedItems]);

  const handleContextMenu = (e: React.MouseEvent, type: 'collection' | 'folder' | 'request', data: any, fromDotButton = false) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate position - if from dot button, position it closer
    let menuX = e.clientX;
    let menuY = e.clientY;
    
    if (fromDotButton) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      menuX = rect.left - 150; // Position to the left of the button
      menuY = rect.bottom + 5; // Just below the button
    }
    
    const items: ContextMenuItem[] = [];
    if (type === 'collection') {
      items.push({ label: 'New Request', icon: '⚡', onClick: () => handleCreateRequest(data.id, null) });
      items.push({ label: 'New Folder', icon: '📁', onClick: () => handleCreateFolder(data.id) });
      items.push({ label: 'Export', icon: '📤', onClick: () => setExportingCollection(data) });
      items.push({ label: 'Rename', icon: '✏️', onClick: () => handleRename(data.id, 'collection', data.name) });
      items.push({ label: 'Delete', icon: '🗑️', danger: true, onClick: () => toast('Delete coming soon') });
    } else if (type === 'folder') {
      items.push({ label: 'New Request', icon: '⚡', onClick: () => handleCreateRequest(data.collectionId, data.id) });
      items.push({ label: 'New Folder', icon: '📁', onClick: () => handleCreateFolder(data.id) });
      items.push({ label: 'Rename', icon: '✏️', onClick: () => handleRename(data.id, 'folder', data.name) });
      items.push({ label: 'Delete', icon: '🗑️', danger: true, onClick: () => toast('Delete coming soon') });
    } else if (type === 'request') {
      items.push({ label: 'Rename', icon: '✏️', onClick: () => handleRename(data.id, 'request', data.name) });
      items.push({ label: 'Duplicate', icon: '📄', onClick: () => toast('Duplicate coming soon') });
      items.push({ label: 'Delete', icon: '🗑️', danger: true, onClick: () => toast('Delete coming soon') });
    }
    
    setContextMenu({ x: menuX, y: menuY, items });
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
            gap: '6px', 
            height: '32px',
            cursor: 'pointer', 
            borderRadius: '4px',
            fontSize: item.type === 'collection' ? '13px' : '12px',
            fontWeight: item.type === 'collection' ? 600 : 500,
            color: item.type === 'collection' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-overlay)';
            e.currentTarget.querySelector('.tree-actions')?.setAttribute('style', 'opacity: 1');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.querySelector('.tree-actions')?.setAttribute('style', 'opacity: 0');
          }}
        >
          <span style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'none', display: 'inline-block', fontSize: '10px', color: 'var(--text-tertiary)' }}>▶</span>
          {item.type === 'collection' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" style={{ opacity: 0.5, flexShrink: 0 }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" style={{ opacity: 0.4, flexShrink: 0 }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          )}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
          <button 
            className="tree-actions"
            onClick={(e) => {
              e.stopPropagation();
              // Position popup closer to the button (offset x by -140, y by 10)
              handleContextMenu(e, item.type, item.data, true);
            }}
            style={{
              opacity: 0,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: '14px',
              transition: 'opacity 0.2s',
              borderRadius: '4px'
            }}
          >
            ⋮
          </button>
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
      {isCreatingCollection ? (
        <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Collection name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
              autoFocus
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button 
              onClick={handleCreateCollection}
              style={{
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Create
            </button>
            <button 
              onClick={() => { setIsCreatingCollection(false); setNewCollectionName(''); }}
              style={{
                background: 'transparent',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      
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
    </div>
  );
}

