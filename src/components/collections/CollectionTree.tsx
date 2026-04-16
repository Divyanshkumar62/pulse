import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useTabStore } from '../../stores/useTabStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { useAppStore } from '../../stores/useAppStore';
import ContextMenu, { ContextMenuItem } from '../ui/ContextMenu';
import VirtualList from '../ui/VirtualList';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

type TreeItem = 
  | { type: 'collection'; id: string; name: string; data: any; level: number }
  | { type: 'folder'; id: string; name: string; data: any; level: number; collectionId: string }
  | { type: 'request'; id: string; name: string; method: string; data: any; level: number; collectionId: string }
  | { type: 'creating'; itemType: 'request' | 'folder'; parentId: string; parentType: 'collection' | 'folder'; level: number };

export default function CollectionTree() {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const { openTab } = useTabStore();
  const { collections, addCollection, addFolder, addRequest, updateCollection, updateRequest } = useCollectionStore();
  const { isImportModalOpen, setImportModalOpen } = useAppStore();
  
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, items: ContextMenuItem[]} | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [containerHeight, setContainerHeight] = useState(500);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TreeItem[]>([]);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  
  const [creatingInline, setCreatingInline] = useState<{ parentId: string; parentType: 'collection' | 'folder'; itemType: 'request' | 'folder' } | null>(null);
  const [creatingName, setCreatingName] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  
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
      const newRequest = {
        id: uuidv4(),
        name: creatingName.trim(),
        method: 'GET' as const,
        url: '',
        headers: [],
        body: { type: 'none' as const, content: '' }
      };
      
      if (parentType === 'collection') {
        addRequest(parentId, null, newRequest);
        openTab(newRequest, parentId);
      } else {
        const collection = collections.find(c => c.folders?.some(f => f.id === parentId));
        if (collection) {
          addRequest(collection.id, parentId, newRequest);
          openTab(newRequest, collection.id);
        }
      }
      toast.success('Request created');
    } else {
      const newFolder = {
        id: uuidv4(),
        name: creatingName.trim(),
        requests: [],
        folders: []
      };
      
      if (parentType === 'collection') {
        addFolder(parentId, null, newFolder);
      } else {
        const collection = collections.find(c => c.folders?.some(f => f.id === parentId));
        if (collection) {
          addFolder(collection.id, parentId, newFolder);
        }
      }
      setExpandedItems(prev => new Set([...prev, parentId]));
      toast.success('Folder created');
    }
    
    setCreatingInline(null);
    setCreatingName('');
  };

  const cancelCreate = () => {
    setCreatingInline(null);
    setCreatingName('');
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
    
    const collection = collections.find(c => c.id === editingId);
    if (collection) {
      updateCollection(editingId, { name: editingValue.trim() }, '');
      setEditingId(null);
      toast.success('Collection renamed');
      return;
    }
    
    for (const col of collections) {
      const req = col.requests.find(r => r.id === editingId);
      if (req) {
        updateRequest(col.id, editingId, { name: editingValue.trim() });
        setEditingId(null);
        toast.success('Request renamed');
        return;
      }
      const findInFolders = (folders: any[]): boolean => {
        for (const f of folders) {
          const r = f.requests?.find((r: any) => r.id === editingId);
          if (r) {
            updateRequest(col.id, editingId, { name: editingValue.trim() });
            return true;
          }
          if (f.folders && findInFolders(f.folders)) return true;
        }
        return false;
      };
      if (findInFolders(col.folders)) {
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
    const collectionItems: TreeItem[] = [];
    const requestItems: TreeItem[] = [];

    const processFolders = (folders: any[], level: number, collectionId: string) => {
      folders.forEach(folder => {
        const folderWithCollectionId = { ...folder, collectionId };
        items.push({ type: 'folder', id: folder.id, name: folder.name, data: folderWithCollectionId, level, collectionId });
        
        if (creatingInline && creatingInline.parentId === folder.id && creatingInline.itemType === 'request') {
          items.push({ type: 'creating', itemType: 'request', parentId: folder.id, parentType: 'folder', level: level + 1 });
        }
        
        if (expandedItems.has(folder.id)) {
          folder.requests.forEach((req: any) => {
            requestItems.push({ type: 'request', id: req.id, name: req.name, method: req.method, data: { ...req, collectionId }, level: level + 1, collectionId });
          });
          
          if (folder.folders && folder.folders.length > 0) {
            processFolders(folder.folders, level + 1, collectionId);
          }
        }
      });
    };

    collections.forEach(collection => {
      collectionItems.push({ type: 'collection', id: collection.id, name: collection.name, data: collection, level: 0 });
      
      if (creatingInline && creatingInline.parentId === collection.id) {
        if (creatingInline.itemType === 'request') {
          items.push({ type: 'creating', itemType: 'request', parentId: collection.id, parentType: 'collection', level: 1 });
        } else {
          items.push({ type: 'creating', itemType: 'folder', parentId: collection.id, parentType: 'collection', level: 1 });
        }
      }
      
      if (expandedItems.has(collection.id)) {
        collection.requests.forEach(req => {
          requestItems.push({ type: 'request', id: req.id, name: req.name, method: req.method, data: { ...req, collectionId: collection.id }, level: 1, collectionId: collection.id });
        });
        
        if (collection.folders && collection.folders.length > 0) {
          processFolders(collection.folders, 1, collection.id);
        }
      }
    });

    collectionItems.sort((a, b) => {
      const aPinned = (a.type === 'collection' && collections.find(c => c.id === a.id)?.pinned) || false;
      const bPinned = (b.type === 'collection' && collections.find(c => c.id === b.id)?.pinned) || false;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

    requestItems.sort((a, b) => {
      const aPinned = a.type === 'request' && a.data?.pinned || false;
      const bPinned = b.type === 'request' && b.data?.pinned || false;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

    return [...collectionItems, ...items, ...requestItems];
  }, [collections, expandedItems, creatingInline]);

  const handleContextMenu = (e: React.MouseEvent, type: 'collection' | 'folder' | 'request', data: any, fromDotButton = false) => {
    e.preventDefault();
    e.stopPropagation();
    
    let menuX = e.clientX;
    let menuY = e.clientY;
    
    if (fromDotButton) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      menuX = rect.left - 150;
      menuY = rect.bottom + 5;
    }
    
    const items: ContextMenuItem[] = [];
    if (type === 'collection') {
      items.push({ label: 'New Request', onClick: () => handleCreateRequest(data.id, null) });
      items.push({ label: 'New Folder', onClick: () => handleCreateFolder(data.id, null) });
      items.push({ label: 'Rename', onClick: () => startEdit(data.id, data.name) });
      items.push({ label: data.pinned ? 'Unpin' : 'Pin', onClick: () => { updateCollection(data.id, { pinned: !data.pinned }, ''); } });
      items.push({ label: 'Delete', danger: true, onClick: () => toast('Delete coming soon') });
    } else if (type === 'folder') {
      items.push({ label: 'New Request', onClick: () => handleCreateRequest(data.collectionId, data.id) });
      items.push({ label: 'New Folder', onClick: () => handleCreateFolder(data.collectionId, data.id) });
      items.push({ label: 'Rename', onClick: () => startEdit(data.id, data.name) });
      items.push({ label: data.pinned ? 'Unpin' : 'Pin', onClick: () => { 
        const col = collections.find(c => c.id === data.collectionId);
        if (col) {
          const folder = col.folders?.find(f => f.id === data.id);
          if (folder) {
            updateCollection(data.collectionId, { folders: col.folders.map(f => f.id === data.id ? { ...f, pinned: !f.pinned } : f) }, '');
          }
        }
      }});
      items.push({ label: 'Delete', danger: true, onClick: () => toast('Delete coming soon') });
    } else if (type === 'request') {
      items.push({ label: 'Rename', onClick: () => startEdit(data.id, data.name) });
      items.push({ label: 'Duplicate', onClick: () => toast('Duplicate coming soon') });
      items.push({ label: data.pinned ? 'Unpin' : 'Pin', onClick: () => { 
        const col = collections.find(c => c.id === data.collectionId);
        if (col) {
          updateRequest(col.id, data.id, { pinned: !data.pinned });
        }
      }});
      items.push({ label: 'Delete', danger: true, onClick: () => toast('Delete coming soon') });
    }
    
    setContextMenu({ x: menuX, y: menuY, items });
  };

  const renderTreeItem = (item: TreeItem) => {
    const paddingLeft = item.level * 12 + 8;

    if (item.type === 'creating') {
      return (
        <div style={{ paddingLeft, display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}>
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
          <div style={{ paddingLeft, display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}>
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
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.name}
          </span>
          {item.type === 'collection' && collections.find(c => c.id === item.id)?.pinned && (
            <span style={{ color: '#8b5cf6', marginRight: '4px', fontSize: '12px' }} title="Pinned">★</span>
          )}
          {item.type === 'folder' && item.data?.pinned && (
            <span style={{ color: '#8b5cf6', marginRight: '4px', fontSize: '12px' }} title="Pinned">★</span>
          )}
          <button 
            className="tree-actions"
            onClick={(e) => {
              e.stopPropagation();
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

    if (editingId === item.id) {
      return (
        <div style={{ paddingLeft: paddingLeft + 18, display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}>
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

    return (
      <div 
        className="tree-request-item"
        style={{ paddingLeft: paddingLeft + 18, height: '32px' }}
        onClick={() => openTab(item.data, item.collectionId)}
        onContextMenu={(e) => handleContextMenu(e, 'request', item.data)}
        onDoubleClick={() => startEdit(item.id, item.name)}
      >
        <span className={`method-badge method-${item.method.toLowerCase()}`} style={{ width: '36px', textAlign: 'center', fontSize: '9px' }}>{item.method}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Search collections..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
          onClick={(e) => {
            e.stopPropagation();
            setShowMenuDropdown(!showMenuDropdown);
          }}
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 10px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            position: 'relative'
          }}
          title="Menu"
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="19" r="2"/>
          </svg>
          {showMenuDropdown && (
            <div 
              ref={menuDropdownRef}
              style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 1000,
              minWidth: '150px',
              overflow: 'hidden'
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreatingCollection(true);
                  setShowMenuDropdown(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  <line x1="12" y1="11" x2="12" y2="17"/>
                  <line x1="9" y1="14" x2="15" y2="14"/>
                </svg>
                Add Collection
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImportModalOpen(true);
                  setShowMenuDropdown(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                cURL Import
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeWorkspaceId) {
                    useWorkspaceStore.getState().linkWorkspaceToFolder(activeWorkspaceId);
                  }
                  setShowMenuDropdown(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontWeight: 600
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5L15 8V2H9v6l1 6.5a4.8 4.8 0 0 0-1 3.5v4"/>
                  <path d="M9 18h6"/>
                </svg>
                Connect Git Folder
              </button>
            </div>
          )}
        </button>
      </div>

      {isCreatingCollection ? (
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
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
                border: '1px solid var(--accent-primary)',
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
        {searchQuery.trim() ? (
          searchResults.length > 0 ? (
            <div style={{ padding: '0 8px' }}>
              {searchResults.map((item: any) => (
                <div 
                  key={`${item.type}-${item.id}`}
                  style={{ 
                    paddingLeft: item.level * 12 + 8,
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    height: '32px',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                  onClick={() => item.type === 'request' ? openTab(item.data, item.collectionId) : setExpandedItems(prev => new Set([...prev, item.id]))}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {item.type === 'collection' && <span style={{ fontSize: '11px' }}>📁</span>}
                  {item.type === 'folder' && <span style={{ fontSize: '11px' }}>📂</span>}
                  {item.type === 'request' && (
                    <span className={`method-badge method-${item.method.toLowerCase()}`} style={{ width: '36px', textAlign: 'center', fontSize: '9px' }}>{item.method}</span>
                  )}
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              No results found for "{searchQuery}"
            </div>
          )
        ) : flattenedItems.length > 0 ? (
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '60px', gap: '16px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1" opacity="0.4">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', fontSize: '13px', fontWeight: 500 }}>
              {activeWorkspace ? 'No collections yet' : 'Initialising environment...'}
              {!activeWorkspace && <div className="loading-spinner" style={{ margin: '20px auto' }}></div>}
            </div>
            <button 
              onClick={() => setIsCreatingCollection(true)}
              style={{
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                width: '180px'
              }}
            >
              Create Collection
            </button>
            {!activeWorkspace?.path && (
              <button 
                onClick={() => activeWorkspaceId && useWorkspaceStore.getState().linkWorkspaceToFolder(activeWorkspaceId)}
                style={{
                  background: 'transparent',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--accent-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '180px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Connect Git Folder
              </button>
            )}
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}
