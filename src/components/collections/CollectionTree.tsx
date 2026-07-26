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
import { MoreVertical, Pin, FolderOpen, Eye, Folder as FolderIcon, ChevronRight, GripVertical, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { getGravatarUrl } from '../../utils/gravatar';
import VirtualList from '../ui/VirtualList';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type TreeItem = 
  | { type: 'collection'; id: string; name: string; data: any; level: number }
  | { type: 'folder'; id: string; name: string; data: any; level: number; collectionId: string }
  | { type: 'request'; id: string; name: string; method: string; data: any; level: number; collectionId: string }
  | { type: 'creating'; itemType: 'request' | 'folder'; parentId: string; parentType: 'collection' | 'folder'; level: number };

interface SortableTreeItemProps {
  id: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  disabled?: boolean;
}

function SortableTreeItem({ id, children, style, disabled }: SortableTreeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const combinedStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
    width: '100%',
    zIndex: isDragging ? 1000 : 1,
    ...style,
  };

  return (
    <div ref={setNodeRef} style={combinedStyle} {...attributes} {...listeners} id={id}>
      {children}
    </div>
  );
}

const dropAnimationConfig: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.4',
            },
        },
    }),
};

export default function CollectionTree() {
  const { workspaces, activeWorkspaceId, linkWorkspaceToFolder } = useWorkspaceStore();
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const { openTab, openRunnerTab, openDocsTab, updateTabRequestName } = useTabStore();
  const { 
    collections, addCollection, addFolder, addRequest, 
    updateCollection, updateRequest, updateFolder, 
    duplicateCollection, duplicateFolder, duplicateRequest,
    deleteCollection, deleteFolder, deleteRequest,
    moveRequest, moveFolder, setCollections, saveAllCollectionsToDisk,
    isLoading: collectionsLoading
  } = useCollectionStore();
  const { setImportModalOpen } = useAppStore();
  const { presence } = usePresenceStore();
  const { settings } = useSettingsStore();

  const [contextMenu, setContextMenu] = useState<{x: number, y: number, items: ContextMenuItem[]} | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TreeItem[]>([]);
  const [creatingInline, setCreatingInline] = useState<{ parentId: string; parentType: 'collection' | 'folder'; itemType: 'request' | 'folder' } | null>(null);
  const [creatingName, setCreatingName] = useState('');

  const [activeDragItem, setActiveDragItem] = useState<TreeItem | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<{ 
    id: string; 
    name: string; 
    type: string; 
    action: 'nesting' | 'reordering';
    position: 'above' | 'below' | 'inside';
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'collection' | 'folder' | 'request', name: string, collectionId?: string } | null>(null);
  
  const editInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

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
          results.push({ type: 'request', id: req.id, name: req.name, method: req.method, data: { ...req, collectionId: collection.id }, level: 1, collectionId: collection.id });
        }
      });

      const searchInFolders = (folders: any[], level: number, collectionId: string) => {
        folders.forEach(folder => {
          if (folder.name.toLowerCase().includes(lowerQuery)) {
            results.push({ type: 'folder', id: folder.id, name: folder.name, data: { ...folder, collectionId }, level, collectionId });
          }
          folder.requests.forEach((req: any) => {
            if (req.name.toLowerCase().includes(lowerQuery)) {
              results.push({ type: 'request', id: req.id, name: req.name, method: req.method, data: { ...req, collectionId }, level: level + 1, collectionId });
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
    if (folderId) setExpandedItems(prev => new Set([...prev, folderId]));
    else setExpandedItems(prev => new Set([...prev, collectionId]));
  };

  const handleCreateFolder = (collectionId: string, parentFolderId: string | null) => {
    setCreatingInline({ parentId: parentFolderId || collectionId, parentType: parentFolderId ? 'folder' : 'collection', itemType: 'folder' });
    setCreatingName('');
    if (parentFolderId) setExpandedItems(prev => new Set([...prev, parentFolderId]));
    else setExpandedItems(prev => new Set([...prev, collectionId]));
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
      const newFolder = { id: uuidv4(), name: creatingName.trim(), requests: [], folders: [] };
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
    const parts = editingKey.split('-');
    const type = parts[0];
    const id = parts.slice(1, -1).join('-');
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
        if (updateTabRequestName) updateTabRequestName(id, newName);
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
            if (updateTabRequestName) updateTabRequestName(id, newName);
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
      items.push({ label: 'Duplicate', onClick: () => { duplicateCollection(data.id); toast.success('Collection duplicated'); }});
      items.push({ label: data.pinned ? 'Unpin' : 'Pin', onClick: () => { updateCollection(data.id, { pinned: !data.pinned }, ''); }});
      items.push({ label: 'Delete', danger: true, onClick: () => setConfirmDelete({ id: data.id, type: 'collection', name: data.name }) });
    } else if (type === 'folder') {
      items.push({ label: 'Run Folder', onClick: () => openRunnerTab({ ...data, requests: data.requests || [] }) });
      items.push({ label: 'Add Request', onClick: () => handleCreateRequest(data.collectionId, data.id) });
      items.push({ label: 'Add Folder', onClick: () => handleCreateFolder(data.collectionId, data.id) });
      items.push({ label: 'Rename', onClick: () => startEdit('folder', data.id, idx, data.name) });
      items.push({ label: 'Duplicate', onClick: () => { duplicateFolder(data.collectionId, data.id); toast.success('Folder duplicated'); }});
      items.push({ label: data.pinned ? 'Unpin' : 'Pin', onClick: () => { updateFolder(data.collectionId, data.id, { pinned: !data.pinned }); }});
      items.push({ label: 'Delete', danger: true, onClick: () => setConfirmDelete({ id: data.id, type: 'folder', name: data.name, collectionId: data.collectionId }) });
    } else if (type === 'request') {
      items.push({ label: 'Rename', onClick: () => startEdit('request', data.id, idx, data.name) });
      items.push({ label: 'Duplicate', onClick: () => { duplicateRequest(data.collectionId, data.id); toast.success('Request duplicated'); }});
      items.push({ label: data.pinned ? 'Unpin' : 'Pin', onClick: () => { updateRequest(data.collectionId, data.id, { pinned: !data.pinned }); }});
      items.push({ label: 'Delete', danger: true, onClick: () => setConfirmDelete({ id: data.id, type: 'request', name: data.name, collectionId: data.collectionId }) });
    }
    setContextMenu({ x: menuX, y: menuY, items });
  };

  const findCollectionId = (itemId: string, itemType: 'folder' | 'request' | 'collection'): string | null => {
    if (itemType === 'collection') return itemId;
    for (const c of collections) {
      if (itemType === 'request' && c.requests.some(r => r.id === itemId)) return c.id;
      if (itemType === 'folder' && c.folders.some(f => f.id === itemId)) return c.id;
      const checkFolders = (folders: any[]): boolean => {
        for (const f of folders) {
          if (itemType === 'request' && f.requests.some((r: any) => r.id === itemId)) return true;
          if (itemType === 'folder' && f.id === itemId) return true;
          if (f.folders && checkFolders(f.folders)) return true;
        }
        return false;
      };
      if (checkFolders(c.folders)) return c.id;
    }
    return null;
  };

  const findParentInfo = (id: string, type: 'folder' | 'request'): { parentId: string | null, parentType: 'collection' | 'folder', index: number, children: any[] } | null => {
    for (const c of collections) {
      if (type === 'request') {
        const rootIdx = c.requests.findIndex(r => r.id === id);
        if (rootIdx !== -1) return { parentId: null, parentType: 'collection', index: rootIdx, children: c.requests };
      }
      if (type === 'folder') {
        const rootIdx = c.folders.findIndex(f => f.id === id);
        if (rootIdx !== -1) return { parentId: null, parentType: 'collection', index: rootIdx, children: c.folders };
      }
      const searchFolders = (folders: any[], currentParentId: string): any => {
        for (const f of folders) {
          if (type === 'request') {
            const idx = f.requests.findIndex((r: any) => r.id === id);
            if (idx !== -1) return { parentId: currentParentId, parentType: 'folder', index: idx, children: f.requests };
          }
          if (type === 'folder') {
            const idx = f.folders?.findIndex((child: any) => child.id === id) ?? -1;
            if (idx !== -1) return { parentId: currentParentId, parentType: 'folder', index: idx, children: f.folders };
          }
          if (f.folders) {
            const res = searchFolders(f.folders, f.id);
            if (res) return res;
          }
        }
        return null;
      };
      const res = searchFolders(c.folders, c.id);
      if (res) {
        if (res.parentId === c.id) return { parentId: null, parentType: 'collection', index: res.index, children: res.children };
        return res;
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;
    const item = visibleItems.find(x => x.type !== 'creating' && (`${x.type}-${x.id}` === activeId || x.id === activeId));
    if (item && item.type !== 'creating') setActiveDragItem(item);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) { setHoveredTarget(null); return; }
    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;
    if (activeIdStr === overIdStr) { setHoveredTarget(null); return; }

    const activeItem = visibleItems.find(x => x.type !== 'creating' && `${x.type}-${x.id}` === activeIdStr);
    const overItem = visibleItems.find(x => x.type !== 'creating' && `${x.type}-${x.id}` === overIdStr);

    if (!activeItem || !overItem) { setHoveredTarget(null); return; }
    if (activeItem.type === 'creating' || overItem.type === 'creating') { setHoveredTarget(null); return; }

    if (activeItem.type === 'collection') {
      if (overItem.type === 'collection') {
        setHoveredTarget({
          id: overIdStr,
          name: overItem.name,
          type: overItem.type,
          action: 'reordering',
          position: 'above',
        });
      } else {
        setHoveredTarget(null);
      }
      return;
    }

    if (overItem.type === 'collection' || overItem.type === 'folder') {
      // Nesting style
      setHoveredTarget({
        id: overIdStr,
        name: overItem.name,
        type: overItem.type,
        action: 'nesting',
        position: 'inside',
      });
    } else if (overItem.type === 'request') {
      // Reordering style
      setHoveredTarget({
        id: overIdStr,
        name: overItem.name,
        type: overItem.type,
        action: 'reordering',
        position: 'above',
      });
    } else {
      setHoveredTarget(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const dragItem = activeDragItem;
    
    setActiveDragItem(null);
    setHoveredTarget(null);

    if (!over || !dragItem) return;
    if (dragItem.type === 'creating') return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;
    if (activeIdStr === overIdStr) return;

    const overItem = visibleItems.find(x => x.type !== 'creating' && `${x.type}-${x.id}` === overIdStr);
    if (!overItem || overItem.type === 'creating') return;

    const activeColId = findCollectionId(dragItem.id, dragItem.type as any);
    if (!activeColId) return;

    if (dragItem.type === 'collection') {
      if (overItem.type !== 'collection') return;
      const activeIdx = collections.findIndex(c => c.id === dragItem.id);
      const overIdx = collections.findIndex(c => c.id === overItem.id);
      if (activeIdx !== -1 && overIdx !== -1) {
        const newCollections = [...collections];
        const [removed] = newCollections.splice(activeIdx, 1);
        newCollections.splice(overIdx, 0, removed);
        setCollections(newCollections);
        await saveAllCollectionsToDisk();
        toast.success('Collections reordered');
      }
      return;
    }

    const targetColId = overItem.type === 'collection' ? overItem.id : findCollectionId(overItem.id, overItem.type as any);
    if (!targetColId) return;

    let targetFolderId: string | null = null;
    let newIndex = 0;

    if (overItem.type === 'collection') {
      targetFolderId = null;
      newIndex = 0;
    } else if (overItem.type === 'folder') {
      targetFolderId = overItem.id;
      newIndex = 0;
    } else if (overItem.type === 'request') {
      const parentInfo = findParentInfo(overItem.id, 'request');
      if (!parentInfo) return;
      targetFolderId = parentInfo.parentId;
      newIndex = parentInfo.index;
    }

    try {
      if (dragItem.type === 'request') {
        await moveRequest(activeColId, targetColId, dragItem.id, targetFolderId, newIndex);
        toast.success(`Request "${dragItem.name}" moved`);
      } else if (dragItem.type === 'folder') {
        await moveFolder(activeColId, targetColId, dragItem.id, targetFolderId, newIndex);
        toast.success(`Folder "${dragItem.name}" moved`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to move item');
    }
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
              flex: 1, padding: '4px 8px', background: 'var(--bg-input)', border: '1px solid var(--accent-primary)',
              borderRadius: '4px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none'
            }}
          />
        </div>
      );
    }

    if (isEditing) {
      const isCollectionOrFolder = item.type === 'collection' || item.type === 'folder';
      return (
        <div key={`editing-${item.id}-${idx}`} style={{ paddingLeft: isCollectionOrFolder ? paddingLeft : paddingLeft + 14, display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}>
          {isCollectionOrFolder && <span style={{ width: '14px' }}></span>}
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
              flex: 1, padding: '4px 8px', background: 'var(--bg-input)', border: '1px solid var(--accent-primary)',
              borderRadius: '4px', color: 'var(--text-primary)', fontSize: item.type === 'collection' ? '13px' : '12px',
              outline: 'none', fontWeight: item.type === 'collection' ? 600 : 500
            }}
          />
        </div>
      );
    }

    const isTarget = hoveredTarget?.id === `${item.type}-${item.id}`;
    const dropStyles: React.CSSProperties = {};
    if (isTarget && hoveredTarget) {
      if (hoveredTarget.action === 'nesting') {
        dropStyles.backgroundColor = 'rgba(59, 130, 246, 0.2)';
        dropStyles.borderRadius = '4px';
      } else if (hoveredTarget.action === 'reordering') {
        dropStyles.borderTop = '2px solid var(--accent-primary)';
      }
    }

    if (item.type === 'collection' || item.type === 'folder') {
      const isExpanded = expandedItems.has(item.id);
      return (
        <SortableTreeItem key={`${item.type}-${item.id}-${idx}`} id={`${item.type}-${item.id}`} style={dropStyles}>
          <div 
            onClick={() => toggleExpand(item.id)}
            onDoubleClick={(e) => { e.stopPropagation(); startEdit(item.type, item.id, idx, item.name); }}
            onContextMenu={(e) => handleContextMenu(e, item.type, idx, item.data)}
            style={{ 
              paddingLeft, display: 'flex', alignItems: 'center', gap: '6px', height: '32px',
              cursor: 'pointer', borderRadius: '4px', fontSize: item.type === 'collection' ? '13px' : '12px',
              fontWeight: item.type === 'collection' ? 600 : 500, color: item.type === 'collection' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
            className="tree-item-group tree-item-hover"
          >
            <span style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px',
              transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', opacity: 0.6
            }}>
              <ChevronRight size={14} strokeWidth={2} />
            </span>
            {item.type === 'folder' && (
              <FolderIcon size={14} strokeWidth={2} style={{ opacity: 0.6, color: 'var(--text-secondary)', fill: 'transparent', marginLeft: '2px' }} />
            )}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
            {item.data.pinned && <Pin size={10} style={{ marginRight: '8px', color: '#ef4444', fill: '#ef4444' }} />}
            <div className="tree-item-actions">
              {presence.filter(p => p.item_id === item.id && p.email !== settings?.email).map(p => (
                  <Avatar key={p.email} src={getGravatarUrl(p.email, 32)} alt={p.email} title={`${p.email} is viewing this`} style={{ width: '16px', height: '16px', borderRadius: '50%', marginLeft: '4px', border: '1px solid var(--accent-primary)', boxShadow: '0 0 8px var(--accent-subtle)' }} />
              ))}
              <button className="tree-action-btn" onClick={(e) => { e.stopPropagation(); handleContextMenu(e, item.type, idx, item.data); }}>
                  <MoreVertical size={14} />
              </button>
            </div>
          </div>
        </SortableTreeItem>
      );
    }

    if (item.type === 'request') {
      const methodColors: Record<string, string> = { GET: '#22c55e', POST: '#3b82f6', PUT: '#f59e0b', DELETE: '#ef4444', PATCH: '#8b5cf6' };
      return (
        <SortableTreeItem key={`${item.type}-${item.id}-${idx}`} id={`${item.type}-${item.id}`} style={dropStyles}>
          <div 
            onClick={() => openTab(item.data, item.collectionId)}
            onDoubleClick={(e) => { e.stopPropagation(); startEdit('request', item.id, idx, item.name); }}
            onContextMenu={(e) => handleContextMenu(e, 'request', idx, item.data)}
            style={{ 
              paddingLeft: paddingLeft + 14, display: 'flex', alignItems: 'center', gap: '8px', height: '32px',
              cursor: 'pointer', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)'
            }}
            className="tree-item-group tree-item-hover"
          >
            <span style={{ fontSize: '9px', fontWeight: 800, color: methodColors[item.method] || 'var(--text-tertiary)', width: '32px' }}>
              {item.method}
            </span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
            {item.data.pinned && <Pin size={10} style={{ marginRight: '8px', color: '#ef4444', fill: '#ef4444' }} />}
            <div className="tree-item-actions">
              {presence.filter(p => p.item_id === item.id && p.email !== settings?.email).map(p => (
                  <Avatar key={p.email} src={getGravatarUrl(p.email, 32)} alt={p.email} title={`${p.email} is viewing this`} style={{ width: '16px', height: '16px', borderRadius: '50%', marginLeft: '4px', border: '1px solid var(--accent-primary)', boxShadow: '0 0 8px var(--accent-subtle)' }} />
              ))}
              <button className="tree-action-btn" onClick={(e) => { e.stopPropagation(); handleContextMenu(e, item.type, idx, item.data); }}>
                  <MoreVertical size={14} />
              </button>
            </div>
          </div>
        </SortableTreeItem>
      );
    }
    return null;
  };

  const visibleItems = useMemo(() => {
    if (searchQuery.trim()) return searchResults;
    const items: TreeItem[] = [];
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
        const sortedRequests = [...collection.requests].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return a.name.localeCompare(b.name);
        });
        sortedRequests.forEach(req => {
          items.push({ type: 'request', id: req.id, name: req.name, method: req.method, data: { ...req, collectionId: collection.id }, level: 1, collectionId: collection.id });
        });
        const pushFolders = (folders: any[], level: number, collectionId: string) => {
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
                const sortedSubRequests = [...(folder.requests || [])].sort((a, b) => {
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;
                    return a.name.localeCompare(b.name);
                });
                sortedSubRequests.forEach((req: any) => {
                    items.push({ type: 'request', id: req.id, name: req.name, method: req.method, data: { ...req, collectionId }, level: level + 1, collectionId });
                });
                if (folder.folders) pushFolders(folder.folders, level + 1, collectionId);
            }
          });
        };
        if (collection.folders) pushFolders(collection.folders, 1, collection.id);
      }
    });
    return items;
  }, [collections, expandedItems, searchQuery, searchResults, creatingInline]);

  return (
    <div className="collection-tree" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="tree-header" style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Collections</h3>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button 
                  onClick={() => setIsCreatingCollection(true)} 
                  title="New Collection"
                  style={{ 
                    background: 'var(--bg-elevated)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '6px', 
                    padding: '4px 8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s'
                  }}
                  className="tree-action-btn-styled"
                >
                  <Plus size={14} />
                </button>
                <button 
                  onClick={() => setImportModalOpen(true, 'curl')} 
                  title="Import from cURL"
                  style={{ 
                    background: 'var(--bg-elevated)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '6px', 
                    padding: '4px 8px', 
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s'
                  }}
                  className="tree-action-btn-styled"
                >
                  cURL
                </button>
            </div>
        </div>
        <div style={{ position: 'relative' }}>
          <input type="text" placeholder="Search collections..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '12px', outline: 'none' }} />
          {searchQuery && <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)' }}>×</button>}
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="custom-scrollbar-mini">
        {!activeWorkspace?.path && activeWorkspace?.type === 'team' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', margin: 'auto', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px', filter: 'drop-shadow(0 0 10px rgba(187, 154, 247, 0.4))' }}>👥</div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Folder Required</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px', maxWidth: '180px' }}>To sync collections, link this team workspace to a local folder.</p>
            <button className="btn-primary" style={{ width: '100%', padding: '8px 16px', background: 'linear-gradient(135deg, #bb9af7, #9b6ef3)', boxShadow: '0 4px 12px rgba(155, 110, 243, 0.25)', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }} onClick={() => linkWorkspaceToFolder(activeWorkspaceId || '')}>Select Folder</button>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {isCreatingCollection && (
                <div style={{ marginBottom: '8px' }}>
                    <input autoFocus placeholder="Collection Name..." value={newCollectionName} onChange={e => setNewCollectionName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateCollection(); if (e.key === 'Escape') setIsCreatingCollection(false); }} onBlur={() => { if (!newCollectionName.trim()) setIsCreatingCollection(false); else handleCreateCollection(); }} style={{ width: '100%', padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--accent-primary)', borderRadius: '6px', fontSize: '13px', outline: 'none' }} />
                </div>
            )}
            {visibleItems.length === 0 && !isCreatingCollection ? (
                collectionsLoading ? <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>{[1,2,3,4,5,6].map(i => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div className="skeleton" style={{ width: '14px', height: '14px', borderRadius: '3px' }} /><div className="skeleton skeleton-text" style={{ width: i % 2 === 0 ? '70%' : '50%' }} /></div>)}</div> : (
                <EmptyState icon={FolderOpen} title="Organize Your Work" description="Group your requests into collections for faster development and easier team sharing." compact />
                )
            ) : (
                <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                    <SortableContext items={visibleItems.map(item => item.type === 'creating' ? `creating-${item.parentId}` : `${item.type}-${item.id}`)} strategy={verticalListSortingStrategy}>
                        <VirtualList items={visibleItems} itemHeight={32} height="100%" renderItem={(item, idx) => renderTreeItem(item, idx)} />
                    </SortableContext>
                    <DragOverlay dropAnimation={dropAnimationConfig}>
                        {activeDragItem && (
                            <div style={{ 
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                                background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)',
                                borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', 
                                fontSize: '12px', color: 'var(--text-primary)', width: 'fit-content',
                                minWidth: '180px', opacity: 0.8
                            }}>
                                <GripVertical size={14} style={{ color: 'var(--accent-primary)' }} />
                                {activeDragItem.type === 'folder' ? <FolderIcon size={14} /> : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }} />}
                                {activeDragItem.type !== 'creating' && <span style={{ fontWeight: 600 }}>{activeDragItem.name}</span>}
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            )}
          </div>
        )}
      </div>

      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />}
      <ConfirmModal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} title={`Delete ${confirmDelete?.type.charAt(0).toUpperCase()}${confirmDelete?.type.slice(1)}`} message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`} confirmLabel="Delete" isDanger={true} />

      <style>{`
        .tree-item-group { position: relative; }
        .tree-item-actions { display: flex; align-items: center; opacity: 0; transition: opacity 0.1s; }
        .tree-item-group:hover .tree-item-actions { opacity: 1; }
        .tree-action-btn { background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
        .tree-action-btn:hover { background: rgba(255, 255, 255, 0.05); color: var(--text-primary); }
        .tree-item-hover:hover { background: rgba(255,255,255,0.03); }
        .dropdown-item-hover:hover { background: var(--accent-subtle) !important; }
        .tree-action-btn-styled:hover { background: var(--bg-hover) !important; border-color: var(--accent-primary) !important; }
      `}</style>
    </div>
  );
}
