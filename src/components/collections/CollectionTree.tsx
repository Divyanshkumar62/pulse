import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useTabStore } from '../../stores/useTabStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { useAppStore } from '../../stores/useAppStore';
import { usePresenceStore } from '../../stores/usePresenceStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import ContextMenu, { ContextMenuItem } from '../ui/ContextMenu';
import ConfirmModal from '../ui/ConfirmModal';
import EmptyState from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { MoreVertical, Pin, FolderOpen, Eye, Folder as FolderIcon, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { getGravatarUrl } from '../../utils/gravatar';
import VirtualList from '../ui/VirtualList';

type TreeItem = 
  | { type: 'collection'; id: string; name: string; data: any; level: number }
  | { type: 'folder'; id: string; name: string; data: any; level: number; collectionId: string }
  | { type: 'request'; id: string; name: string; method: string; data: any; level: number; collectionId: string }
  | { type: 'creating'; itemType: 'request' | 'folder'; parentId: string; parentType: 'collection' | 'folder'; level: number };

export default function CollectionTree() {
  const { workspaces, activeWorkspaceId, linkWorkspaceToFolder } = useWorkspaceStore();
  const { openTab, openRunnerTab, openDocsTab, updateTabRequestName } = useTabStore();
  const { 
    collections, addCollection, addFolder, addRequest, 
    updateCollection, updateRequest, updateFolder, 
    duplicateCollection, duplicateFolder, duplicateRequest,
    deleteCollection, deleteFolder, deleteRequest,
    isLoading: collectionsLoading
  } = useCollectionStore();
  const { setImportModalOpen } = useAppStore();
  const { presence } = usePresenceStore();
  const { settings } = useSettingsStore();

  const renderSkeleton = () => (
    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="skeleton" style={{ width: '14px', height: '14px', borderRadius: '3px' }} />
          <div className="skeleton skeleton-text" style={{ width: i % 2 === 0 ? '70%' : '50%' }} />
        </div>
      ))}
    </div>
  );

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const isTeamWorkspaceUnlinked = activeWorkspace?.type === 'team' && !activeWorkspace?.path;

  const [contextMenu, setContextMenu] = useState<{x: number, y: number, items: ContextMenuItem[]} | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TreeItem[]>([]);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  
  const [creatingInline, setCreatingInline] = useState<{ parentId: string; parentType: 'collection' | 'folder'; itemType: 'request' | 'folder' } | null>(null);
  const [creatingName, setCreatingName] = useState('');
  
  // Use unique editing key that includes index to prevent collisions
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'collection' | 'folder' | 'request', name: string, collectionId?: string } | null>(null);
  
  const editInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingKey && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingKey]);

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
    if (folderId) {
        setExpandedItems(prev => new Set([...prev, folderId]));
    } else {
        setExpandedItems(prev => new Set([...prev, collectionId]));
    }
  };

  const handleCreateFolder = (collectionId: string, parentFolderId: string | null) => {
    setCreatingInline({ parentId: parentFolderId || collectionId, parentType: parentFolderId ? 'folder' : 'collection', itemType: 'folder' });
    setCreatingName('');
    if (parentFolderId) {
        setExpandedItems(prev => new Set([...prev, parentFolderId]));
    } else {
        setExpandedItems(prev => new Set([...prev, collectionId]));
    }
  };

  const confirmCreate = () => {
    if (!creatingInline || !creatingName.trim()) {
        setCreatingInline(null);
        return;
    }
    
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
      
      let colId = '';
      if (parentType === 'collection') colId = parentId;
      else {
          for (const c of collections) {
              const findInFolders = (folders: any[]): boolean => {
                  return folders.some(f => f.id === parentId || (f.folders && findInFolders(f.folders)));
              }
              if (findInFolders(c.folders)) {
                  colId = c.id;
                  break;
              }
          }
      }

      addRequest(colId, parentType === 'folder' ? parentId : null, newReq);
      openTab(newReq, colId);
    } else {
      const newFolder = {
        id: uuidv4(),
        name: creatingName.trim(),
        requests: [],
        folders: []
      };
      
      let colId = '';
      if (parentType === 'collection') colId = parentId;
      else {
          for (const c of collections) {
              const findInFolders = (folders: any[]): boolean => {
                  return folders.some(f => f.id === parentId || (f.folders && findInFolders(f.folders)));
              }
              if (findInFolders(c.folders)) {
                  colId = c.id;
                  break;
              }
          }
      }

      addFolder(colId, parentType === 'folder' ? parentId : null, newFolder);
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

  const startEdit = (type: string, id: string, idx: number, name: string) => {
    setEditingKey(`${type}-${id}-${idx}`);
    setEditingValue(name);
  };

  const saveEdit = () => {
    if (!editingKey || !editingValue.trim()) {
      setEditingKey(null);
      return;
    }
    
    // Key format: type-id-idx
    const parts = editingKey.split('-');
    const type = parts[0];
    const id = parts.slice(1, -1).join('-'); // Extract full ID back
    const newName = editingValue.trim();
    
    const collection = collections.find(c => c.id === id);
    if (collection) {
      updateCollection(id, { name: newName }, '');
      setEditingKey(null);
      toast.success('Collection renamed');
      return;
    }
    
    for (const col of collections) {
      const req = col.requests.find(r => r.id === id);
      if (req) {
        updateRequest(col.id, id, { name: newName });
        if (updateTabRequestName) {
            updateTabRequestName(id, newName);
        }
        setEditingKey(null);
        toast.success('Request renamed');
        return;
      }
      
      const findFolderAndRename = (folders: any[]): boolean => {
        for (const f of folders) {
          if (f.id === id) {
             updateFolder(col.id, id, { name: newName });
             return true;
          }
          const r = f.requests?.find((r: any) => r.id === id);
          if (r) {
            updateRequest(col.id, id, { name: newName });
            if (updateTabRequestName) {
                updateTabRequestName(id, newName);
            }
            return true;
          }
          if (f.folders && findFolderAndRename(f.folders)) return true;
        }
        return false;
      };
      
      if (findFolderAndRename(col.folders)) {
        setEditingKey(null);
        return;
      }
    }
    
    setEditingKey(null);
  };

  const cancelEdit = () => {
    setEditingKey(null);
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

  const handleContextMenu = (e: React.MouseEvent, type: 'collection' | 'folder' | 'request', idx: number, data: any) => {
    e.preventDefault();
    const menuX = e.clientX;
    const menuY = e.clientY;
    
    const items: ContextMenuItem[] = [];
    
    if (type === 'collection') {
      items.push({ label: 'Run Collection', onClick: () => openRunnerTab(data) });
      items.push({ label: 'View Documentation', onClick: () => openDocsTab(data) });
      items.push({ label: 'Add Folder', onClick: () => handleCreateFolder(data.id, null) });
      items.push({ label: 'Rename', onClick: () => startEdit('collection', data.id, idx, data.name) });
      items.push({ label: 'Duplicate', onClick: () => {
          duplicateCollection(data.id);
          toast.success('Collection duplicated');
      }});
      items.push({ label: data.pinned ? 'Unpin' : 'Pin', onClick: () => { 
        updateCollection(data.id, { pinned: !data.pinned }, '');
      }});
      items.push({ label: 'Delete', danger: true, onClick: () => setConfirmDelete({ id: data.id, type: 'collection', name: data.name }) });
    } else if (type === 'folder') {
      items.push({ label: 'Run Folder', onClick: () => openRunnerTab({ ...data, requests: data.requests || [] }) });
      items.push({ label: 'Add Request', onClick: () => handleCreateRequest(data.collectionId, data.id) });
      items.push({ label: 'Add Folder', onClick: () => handleCreateFolder(data.collectionId, data.id) });
      items.push({ label: 'Rename', onClick: () => startEdit('folder', data.id, idx, data.name) });
      items.push({ label: 'Duplicate', onClick: () => {
          duplicateFolder(data.collectionId, data.id);
          toast.success('Folder duplicated');
      }});
      items.push({ label: data.pinned ? 'Unpin' : 'Pin', onClick: () => { 
        updateFolder(data.collectionId, data.id, { pinned: !data.pinned });
      }});
      items.push({ label: 'Delete', danger: true, onClick: () => setConfirmDelete({ id: data.id, type: 'folder', name: data.name, collectionId: data.collectionId }) });
    } else if (type === 'request') {
      items.push({ label: 'Rename', onClick: () => startEdit('request', data.id, idx, data.name) });
      items.push({ label: 'Duplicate', onClick: () => {
          duplicateRequest(data.collectionId, data.id);
          toast.success('Request duplicated');
      }});
      items.push({ label: data.pinned ? 'Unpin' : 'Pin', onClick: () => { 
        updateRequest(data.collectionId, data.id, { pinned: !data.pinned });
      }});
      items.push({ label: 'Delete', danger: true, onClick: () => setConfirmDelete({ id: data.id, type: 'request', name: data.name, collectionId: data.collectionId }) });
    }
    
    setContextMenu({ x: menuX, y: menuY, items });
  };

  const renderTreeItem = (item: TreeItem, idx: number) => {
    const paddingLeft = item.level * 12 + 8;
    const isEditing = item.type !== 'creating' && editingKey === `${item.type}-${item.id}-${idx}`;

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
      if (isEditing) {
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
          onDoubleClick={(e) => { e.stopPropagation(); startEdit(item.type, item.id, idx, item.name); }}
          onContextMenu={(e) => handleContextMenu(e, item.type, idx, item.data)}
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
          className="tree-item-group tree-item-hover"
        >
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '14px',
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            opacity: 0.6
          }}>
            <ChevronRight size={14} strokeWidth={2} />
          </span>
          {item.type === 'folder' && (
            <FolderIcon size={14} strokeWidth={2} style={{ opacity: 0.6, color: 'var(--text-secondary)', fill: 'transparent', marginLeft: '2px' }} />
          )}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
          
          <div className="tree-item-actions">
            {presence
              .filter(p => p.item_id === item.id && p.email !== settings?.email)
              .map(p => (
                <Avatar 
                  key={p.email}
                  src={getGravatarUrl(p.email, 32)} 
                  alt={p.email}
                  title={`${p.email} is viewing this`}
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '50%', 
                    marginLeft: '4px',
                    border: '1px solid var(--accent-primary)',
                    boxShadow: '0 0 8px var(--accent-subtle)'
                  }}
                />
              ))
            }
            {item.data.pinned && <Pin size={10} style={{ opacity: 0.6, marginRight: '4px', color: '#f59e0b' }} />}
            <button 
                className="tree-action-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e, item.type, idx, item.data);
                }}
            >
                <MoreVertical size={14} />
            </button>
          </div>
        </div>
      );
    }

    if (item.type === 'request') {
      if (isEditing) {
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
          onClick={() => openTab(item.data, item.collectionId)}
          onDoubleClick={(e) => { e.stopPropagation(); startEdit('request', item.id, idx, item.name); }}
          onContextMenu={(e) => handleContextMenu(e, 'request', idx, item.data)}
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
          className="tree-item-group tree-item-hover"
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
          
          <div className="tree-item-actions">
            {presence
              .filter(p => p.item_id === item.id && p.email !== settings?.email)
              .map(p => (
                <Avatar 
                  key={p.email}
                  src={getGravatarUrl(p.email, 32)} 
                  alt={p.email}
                  title={`${p.email} is viewing this`}
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '50%', 
                    marginLeft: '4px',
                    border: '1px solid var(--accent-primary)',
                    boxShadow: '0 0 8px var(--accent-subtle)'
                  }}
                />
              ))
            }
            {item.data.pinned && <Pin size={10} style={{ opacity: 0.6, marginRight: '4px', color: '#f59e0b' }} />}
            <button 
                className="tree-action-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e, item.type, idx, item.data);
                }}
            >
                <MoreVertical size={14} />
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const visibleItems = useMemo(() => {
    if (searchQuery.trim()) return searchResults;

    const items: TreeItem[] = [];

    // Sort: pinned collections first
    const sortedCollections = [...collections].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return a.name.localeCompare(b.name);
    });

    sortedCollections.forEach(collection => {
      items.push({ type: 'collection', id: collection.id, name: collection.name, data: collection, level: 0 });
      
      if (expandedItems.has(collection.id)) {
        if (creatingInline && creatingInline.parentId === collection.id) {
           items.push({ type: 'creating', itemType: creatingInline.itemType, parentId: collection.id, parentType: 'collection', level: 1 });
        }

        // Sort: pinned requests first
        const sortedRequests = [...collection.requests].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return a.name.localeCompare(b.name);
        });

        sortedRequests.forEach(req => {
          items.push({ type: 'request', id: req.id, name: req.name, method: req.method, data: req, level: 1, collectionId: collection.id });
        });

        const pushFolders = (folders: any[], level: number, collectionId: string) => {
          // Sort: pinned folders first
          const sortedFolders = [...folders].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return a.name.localeCompare(b.name);
          });

          sortedFolders.forEach(folder => {
            items.push({ type: 'folder', id: folder.id, name: folder.name, data: { ...folder, collectionId }, level, collectionId });
            
            if (expandedItems.has(folder.id)) {
                if (creatingInline && creatingInline.parentId === folder.id) {
                    items.push({ type: 'creating', itemType: creatingInline.itemType, parentId: folder.id, parentType: 'folder', level: level + 1 });
                }
                
                // Sort: pinned requests in folder
                const sortedSubRequests = [...(folder.requests || [])].sort((a, b) => {
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;
                    return a.name.localeCompare(b.name);
                });

                sortedSubRequests.forEach((req: any) => {
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
            <h3 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Collections</h3>
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
                            borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 100,
                            minWidth: '150px', overflow: 'hidden'
                        }}
                    >
                        <button 
                            onClick={() => { setIsCreatingCollection(true); setShowMenuDropdown(false); }}
                            style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '12px' }}
                            className="dropdown-item-hover"
                        >
                            New Collection
                        </button>
                        <button 
                            onClick={() => { setImportModalOpen(true); setShowMenuDropdown(false); }}
                            style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '12px' }}
                            className="dropdown-item-hover"
                        >
                            Import
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

      <div style={{ flex: 1, padding: '8px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="custom-scrollbar-mini">
        {isTeamWorkspaceUnlinked ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
            margin: 'auto',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '40px',
              marginBottom: '16px',
              filter: 'drop-shadow(0 0 10px rgba(187, 154, 247, 0.4))'
            }}>
              👥
            </div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '8px'
            }}>
              Folder Required
            </h3>
            <p style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              marginBottom: '20px',
              maxWidth: '180px'
            }}>
              To sync collections, link this team workspace to a local folder.
            </p>
            <button 
              className="btn-primary"
              style={{
                width: '100%',
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #bb9af7, #9b6ef3)',
                boxShadow: '0 4px 12px rgba(155, 110, 243, 0.25)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
              onClick={() => linkWorkspaceToFolder(activeWorkspaceId || '')}
            >
              Select Folder
            </button>
          </div>
        ) : (
          <>
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
                collectionsLoading ? renderSkeleton() : (
                <EmptyState 
                    icon={FolderOpen}
                    title="Organize Your Work"
                    description="Group your requests into collections for faster development and easier team sharing."
                    compact
                />
                )
            ) : (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <VirtualList
                        items={visibleItems}
                        itemHeight={32}
                        height="100%"
                        renderItem={(item, idx) => renderTreeItem(item, idx)}
                    />
                </div>
            )}
          </>
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

      <style>{`
        .tree-item-group {
            position: relative;
        }
        .tree-item-actions {
            display: flex;
            align-items: center;
            opacity: 0;
            transition: opacity 0.1s;
        }
        .tree-item-group:hover .tree-item-actions {
            opacity: 1;
        }
        .tree-action-btn {
            background: transparent;
            border: none;
            color: var(--text-tertiary);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .tree-action-btn:hover {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
        }
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
