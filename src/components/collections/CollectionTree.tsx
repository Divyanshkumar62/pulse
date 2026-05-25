import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useTabStore } from '../../stores/useTabStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { useAppStore } from '../../stores/useAppStore';
import ContextMenu, { ContextMenuItem } from '../ui/ContextMenu';
import ConfirmModal from '../ui/ConfirmModal';
import CollectionRunner from './CollectionRunner';
import CollectionDocs from './CollectionDocs';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

type TreeItem = 
  | { type: 'collection'; id: string; name: string; data: any; level: number }
  | { type: 'folder'; id: string; name: string; data: any; level: number; collectionId: string }
  | { type: 'request'; id: string; name: string; method: string; data: any; level: number; collectionId: string }
  | { type: 'creating'; itemType: 'request' | 'folder'; parentId: string; parentType: 'collection' | 'folder'; level: number };

export default function CollectionTree() {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const { openTab, updateTabRequestName } = useTabStore();
  const { collections, addCollection, addFolder, addRequest, updateCollection, updateRequest, deleteCollection, deleteFolder, deleteRequest } = useCollectionStore();
  const { isImportModalOpen, setImportModalOpen } = useAppStore();
  
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, items: ContextMenuItem[]} | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TreeItem[]>([]);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [runnerCollection, setRunnerCollection] = useState<any | null>(null);
  const [docsCollection, setDocsCollection] = useState<any | null>(null);
  
  const [creatingInline, setCreatingInline] = useState<{ parentId: string; parentType: 'collection' | 'folder'; itemType: 'request' | 'folder' } | null>(null);
  const [creatingName, setCreatingName] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'collection' | 'folder' | 'request', name: string, collectionId?: string } | null>(null);
  
  const editInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (creatingInline && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [creatingInline]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMenuDropdown && menuDropdownRef.current && !menuDropdownRef.current.contains(e.target as Node)) {
        setShowMenuDropdown(false);
      }
    };
    if (showMenuDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenuDropdown]);

  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results: TreeItem[] = [];
    const lowerQuery = query.toLowerCase();

    collections.forEach(collection => {
      if (collection.name.toLowerCase().includes(lowerQuery)) {
        results.push({ type: 'collection', id: collection.id, name: collection.name, data: collection, level: 0 });
      }

      collection.requests.forEach(req => {
        if (req.name.toLowerCase().includes(lowerQuery)) {
          results.push({ type: 'request', id: req.id, name: req.name, method: req.method, data: req, level: 1, collectionId: collection.id });
        }
      });

      const searchInFolders = (folders: any[], level: number, collectionId: string) => {
        folders.forEach(folder => {
          if (folder.name.toLowerCase().includes(lowerQuery)) {
            results.push({ type: 'folder', id: folder.id, name: folder.name, data: folder, level, collectionId });
          }
          folder.requests.forEach((req: any) => {
            if (req.name.toLowerCase().includes(lowerQuery)) {
              results.push({ type: 'request', id: req.id, name: req.name, method: req.method, data: req, level: level + 1, collectionId });
            }
          });
          if (folder.folders) {
            searchInFolders(folder.folders, level + 1, collectionId);
          }
        });
      };

      if (collection.folders) {
        searchInFolders(collection.folders, 1, collection.id);
      }
    });

    setSearchResults(results);
  }, [collections]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

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

  const handleCreateRequest = (collectionId: string, folderId: string | null) => {
    setCreatingInline({ parentId: folderId || collectionId, parentType: folderId ? 'folder' : 'collection', itemType: 'request' });
    setCreatingName('');
  };

  const handleCreateFolder = (collectionId: string, parentFolderId: string | null) => {
    setCreatingInline({ parentId: parentFolderId || collectionId, parentType: parentFolderId ? 'folder' : 'collection', itemType: 'folder' });
    setCreatingName('');
  };

  const confirmCreate = () => {
    if (!creatingInline || !creatingName.trim()) return;
    
    const { parentId, parentType, itemType } = creatingInline;
    
    if (itemType === 'request') {
      const newReq = {
        id: uuidv4(),
        name: creatingName.trim(),
        method: 'GET' as any,
        url: '',
        headers: [],
        body: { type: 'none' as any, content: '' }
      };
      
      const colId = parentType === 'collection' ? parentId : collections.find(c => c.folders.some(f => f.id === parentId))?.id || '';
      addRequest(colId, parentType === 'folder' ? parentId : null, newReq);
      openTab(newReq);
    } else {
      const newFolder = {
        id: uuidv4(),
        name: creatingName.trim(),
        requests: [],
        folders: []
      };
      const colId = parentType === 'collection' ? parentId : collections.find(c => c.folders.some(f => f.id === parentId))?.id || '';
      addFolder(colId, parentType === 'folder' ? parentId : null, newFolder);
      setExpandedItems(prev => new Set([...prev, parentId]));
    }
    
    setCreatingInline(null);
    setCreatingName('');
  };

  const cancelCreate = () => {
    setCreatingInline(null);
    setCreatingName('');
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingValue(name);
  };

  const saveEdit = () => {
    if (!editingId || !editingValue.trim()) {
      setEditingId(null);
      return;
    }
    
    const newName = editingValue.trim();
    
    const collection = collections.find(c => c.id === editingId);
    if (collection) {
      updateCollection(editingId, { name: newName }, '');
      setEditingId(null);
      toast.success('Collection renamed');
      return;
    }
    
    for (const col of collections) {
      const req = col.requests.find(r => r.id === editingId);
      if (req) {
        updateRequest(col.id, editingId, { name: newName });
        if (updateTabRequestName) {
            updateTabRequestName(editingId, newName);
        }
        setEditingId(null);
        toast.success('Request renamed');
        return;
      }
      
      const updateInFolders = (folders: any[]): boolean => {
        for (const f of folders) {
          const r = f.requests?.find((r: any) => r.id === editingId);
          if (r) {
            updateRequest(col.id, editingId, { name: newName });
            if (updateTabRequestName) {
                updateTabRequestName(editingId, newName);
            }
            return true;
          }
          if (f.folders && updateInFolders(f.folders)) return true;
        }
        return false;
      };
      
      if (updateInFolders(col.folders)) {
        setEditingId(null);
        toast.success('Request renamed');
        return;
      }
    }
    
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    const { id, type, collectionId } = confirmDelete;

    if (type === 'collection') {
        deleteCollection(id);
        toast.success('Collection deleted');
    } else if (type === 'folder' && collectionId) {
        deleteFolder(collectionId, id);
        toast.success('Folder deleted');
    } else if (type === 'request' && collectionId) {
        deleteRequest(collectionId, id);
        toast.success('Request deleted');
    }
    setConfirmDelete(null);
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'collection' | 'folder' | 'request', data: any) => {
    e.preventDefault();
    const menuX = e.clientX;
    const menuY = e.clientY;
    
    const items: ContextMenuItem[] = [];
    
    if (type === 'collection') {
      items.push({ label: 'Run Collection', onClick: () => setRunnerCollection(data) });
      items.push({ label: 'View Documentation', onClick: () => setDocsCollection(data) });
      items.push({ label: 'New Request', onClick: () => handleCreateRequest(data.id, null) });
      items.push({ label: 'New Folder', onClick: () => handleCreateFolder(data.id, null) });
      items.push({ label: 'Rename', onClick: () => startEdit(data.id, data.name) });
      items.push({ label: 'Duplicate', onClick: () => toast('Duplicate coming soon') });
      items.push({ label: data.pinned ? 'Unpin' : 'Pin', onClick: () => { 
        updateCollection(data.id, { pinned: !data.pinned }, '');
      }});
      items.push({ label: 'Delete', danger: true, onClick: () => setConfirmDelete({ id: data.id, type: 'collection', name: data.name }) });
    } else if (type === 'folder') {
      items.push({ label: 'Run Folder', onClick: () => setRunnerCollection({ ...data, requests: data.requests || [] }) });
      items.push({ label: 'New Request', onClick: () => handleCreateRequest(data.collectionId, data.id) });
      items.push({ label: 'New Folder', onClick: () => handleCreateFolder(data.collectionId, data.id) });
      items.push({ label: 'Rename', onClick: () => startEdit(data.id, data.name) });
      items.push({ label: 'Delete', danger: true, onClick: () => setConfirmDelete({ id: data.id, type: 'folder', name: data.name, collectionId: data.collectionId }) });
    } else if (type === 'request') {
      items.push({ label: 'Rename', onClick: () => startEdit(data.id, data.name) });
      items.push({ label: 'Duplicate', onClick: () => toast('Duplicate coming soon') });
      items.push({ label: data.pinned ? 'Unpin' : 'Pin', onClick: () => { 
        const col = collections.find(c => c.id === data.collectionId);
        if (col) {
          updateRequest(col.id, data.id, { pinned: !data.pinned });
        }
      }});
      items.push({ label: 'Delete', danger: true, onClick: () => setConfirmDelete({ id: data.id, type: 'request', name: data.name, collectionId: data.collectionId }) });
    }
    
    setContextMenu({ x: menuX, y: menuY, items });
  };

  const renderTreeItem = (item: TreeItem, idx: number) => {
    const paddingLeft = item.level * 12 + 8;

    if (item.type === 'creating') {
      return (
        <div key={`creating-${item.parentId}-${idx}`} style={{ paddingLeft, display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}>
          <span style={{ width: '14px' }}></span>
          <input
            ref={createInputRef}
            type="text"
            value={creatingName}
            onChange={(e) => setCreatingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmCreate();
              if (e.key === 'Escape') cancelCreate();
            }}
            onBlur={confirmCreate}
            placeholder={`New ${item.itemType}...`}
            style={{
              flex: 1,
              padding: '4px 8px',
              background: 'var(--bg-input)',
              border: '1px solid var(--accent-primary)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none'
            }}
          />
        </div>
      );
    }

    if (item.type === 'collection' || item.type === 'folder') {
      if (editingId === item.id) {
        return (
          <div key={`editing-${item.id}-${idx}`} style={{ paddingLeft, display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}>
            <span style={{ width: '14px' }}></span>
            <input
              ref={editInputRef}
              type="text"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              onBlur={saveEdit}
              style={{
                flex: 1,
                padding: '4px 8px',
                background: 'var(--bg-input)',
                border: '1px solid var(--accent-primary)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: item.type === 'collection' ? '13px' : '12px',
                outline: 'none',
                fontWeight: item.type === 'collection' ? 600 : 500
              }}
            />
          </div>
        );
      }

      const isExpanded = expandedItems.has(item.id);
      return (
        <div 
          key={`${item.type}-${item.id}-${idx}`}
          onClick={() => toggleExpand(item.id)}
          onContextMenu={(e) => handleContextMenu(e, item.type, item.data)}
          onDoubleClick={() => startEdit(item.id, item.name)}
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
          className="tree-item-hover"
        >
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '14px',
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            opacity: 0.5
          }}>
            ▶
          </span>
          <span style={{ opacity: 0.7 }}>{item.type === 'collection' ? '📦' : '📁'}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
          {item.data.pinned && <span style={{ fontSize: '10px' }}>📌</span>}
        </div>
      );
    }

    if (item.type === 'request') {
      if (editingId === item.id) {
        return (
          <div key={`editing-${item.id}-${idx}`} style={{ paddingLeft: paddingLeft + 14, display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}>
            <input
              ref={editInputRef}
              type="text"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              onBlur={saveEdit}
              style={{
                flex: 1,
                padding: '4px 8px',
                background: 'var(--bg-input)',
                border: '1px solid var(--accent-primary)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>
        );
      }

      const methodColors: Record<string, string> = {
        GET: '#22c55e',
        POST: '#3b82f6',
        PUT: '#f59e0b',
        DELETE: '#ef4444',
        PATCH: '#8b5cf6'
      };

      return (
        <div 
          key={`${item.type}-${item.id}-${idx}`}
          onClick={() => openTab(item.data)}
          onContextMenu={(e) => handleContextMenu(e, 'request', item.data)}
          onDoubleClick={() => startEdit(item.id, item.name)}
          style={{ 
            paddingLeft: paddingLeft + 14,
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            height: '32px',
            cursor: 'pointer', 
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}
          className="tree-item-hover"
        >
          <span style={{ 
            fontSize: '9px', 
            fontWeight: 800, 
            color: methodColors[item.method] || 'var(--text-tertiary)',
            width: '32px'
          }}>
            {item.method}
          </span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
          {item.data.pinned && <span style={{ fontSize: '10px' }}>📌</span>}
        </div>
      );
    }

    return null;
  };

  const visibleItems = useMemo(() => {
    if (searchQuery.trim()) return searchResults;

    const items: TreeItem[] = [];

    collections.forEach(collection => {
      items.push({ type: 'collection', id: collection.id, name: collection.name, data: collection, level: 0 });
      
      if (expandedItems.has(collection.id)) {
        if (creatingInline && creatingInline.parentId === collection.id) {
           items.push({ type: 'creating', itemType: creatingInline.itemType, parentId: collection.id, parentType: 'collection', level: 1 });
        }

        collection.requests.forEach(req => {
          items.push({ type: 'request', id: req.id, name: req.name, method: req.method, data: req, level: 1, collectionId: collection.id });
        });

        const pushFolders = (folders: any[], level: number, collectionId: string) => {
          folders.forEach(folder => {
            items.push({ type: 'folder', id: folder.id, name: folder.name, data: { ...folder, collectionId }, level, collectionId });
            
            if (expandedItems.has(folder.id)) {
                if (creatingInline && creatingInline.parentId === folder.id) {
                    items.push({ type: 'creating', itemType: creatingInline.itemType, parentId: folder.id, parentType: 'folder', level: level + 1 });
                }
                folder.requests.forEach((req: any) => {
                    items.push({ type: 'request', id: req.id, name: req.name, method: req.method, data: req, level: level + 1, collectionId });
                });
                if (folder.folders) {
                    pushFolders(folder.folders, level + 1, collectionId);
                }
            }
          });
        };

        if (collection.folders) {
          pushFolders(collection.folders, 1, collection.id);
        }
      }
    });

    return items;
  }, [collections, expandedItems, searchQuery, searchResults, creatingInline]);

  return (
    <div className="collection-tree" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="tree-header" style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Collections</h3>
            <div style={{ position: 'relative' }}>
                <button 
                    onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}
                >
                    + New
                </button>
                {showMenuDropdown && (
                    <div 
                        ref={menuDropdownRef}
                        style={{ 
                            position: 'absolute', top: '100%', right: 0, marginTop: '4px', 
                            background: 'var(--bg-deep)', border: '1px solid var(--border-default)', 
                            borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 100,
                            minWidth: '150px', overflow: 'hidden'
                        }}
                    >
                        <button 
                            onClick={() => { setIsCreatingCollection(true); setShowMenuDropdown(false); }}
                            style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '12px' }}
                            className="dropdown-item-hover"
                        >
                            📦 New Collection
                        </button>
                        <button 
                            onClick={() => { setImportModalOpen(true); setShowMenuDropdown(false); }}
                            style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '12px' }}
                            className="dropdown-item-hover"
                        >
                            📥 Import
                        </button>
                    </div>
                )}
            </div>
        </div>

        <div style={{ position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Search collections..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
                width: '100%', padding: '6px 10px', 
                background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', 
                borderRadius: '6px', fontSize: '12px', outline: 'none'
            }}
          />
          {searchQuery && (
            <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)' }}
            >
                ×
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px', overflowY: 'auto' }} className="custom-scrollbar-mini">
        {isCreatingCollection && (
            <div style={{ marginBottom: '8px' }}>
                <input 
                    autoFocus
                    placeholder="Collection Name..."
                    value={newCollectionName}
                    onChange={e => setNewCollectionName(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateCollection();
                        if (e.key === 'Escape') setIsCreatingCollection(false);
                    }}
                    onBlur={() => {
                        if (!newCollectionName.trim()) setIsCreatingCollection(false);
                        else handleCreateCollection();
                    }}
                    style={{ 
                        width: '100%', padding: '8px', 
                        background: 'var(--bg-input)', border: '1px solid var(--accent-primary)', 
                        borderRadius: '6px', fontSize: '13px', outline: 'none'
                    }}
                />
            </div>
        )}

        {visibleItems.length === 0 && !isCreatingCollection ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                {searchQuery ? 'No results found' : 'No collections yet'}
            </div>
        ) : (
            <div className="tree-items">
                {visibleItems.map((item, idx) => renderTreeItem(item, idx))}
            </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      <ConfirmModal 
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Delete ${confirmDelete?.type.charAt(0).toUpperCase()}${confirmDelete?.type.slice(1)}`}
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDanger={true}
      />

      {runnerCollection && (
        <CollectionRunner 
          collection={runnerCollection} 
          onClose={() => setRunnerCollection(null)} 
        />
      )}

      {docsCollection && (
        <CollectionDocs 
            collection={docsCollection}
            onClose={() => setDocsCollection(null)}
        />
      )}

      <style>{`
        .tree-item-hover:hover {
            background: rgba(255,255,255,0.03);
        }
        .dropdown-item-hover:hover {
            background: var(--accent-subtle) !important;
        }
      `}</style>
    </div>
  );
}
