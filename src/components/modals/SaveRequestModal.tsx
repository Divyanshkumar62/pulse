import { useState, useEffect } from 'react';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { useTabStore } from '../../stores/useTabStore';
import { Request } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';

interface SaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: Request | null;
}

export default function SaveRequestModal({ isOpen, onClose, request }: SaveRequestModalProps) {
  const { collections, addRequest, updateRequest } = useCollectionStore();
  const { updateActiveTabRequest } = useTabStore();
  
  const [name, setName] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');

  useEffect(() => {
    if (isOpen && request) {
      setName(request.name || 'New Request');
      // If collections exist and none selected, auto-select first
      if (collections.length > 0 && !selectedCollection) {
        setSelectedCollection(collections[0].id);
      }
    }
  }, [isOpen, request, collections, selectedCollection]);

  if (!isOpen || !request) return null;

  const selectedCol = collections.find(c => c.id === selectedCollection);
  const folders = selectedCol?.folders || [];

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a request name');
      return;
    }
    if (!selectedCollection) {
      toast.error('Please select a collection');
      return;
    }

    // Check if the request already exists in any collection
    let existingCollectionId = null;
    let existingFolderId = null;
    let requestExists = false;

    for (const col of collections) {
      if (col.requests.some(r => r.id === request.id)) {
        requestExists = true;
        existingCollectionId = col.id;
        break;
      }
      for (const f of col.folders || []) {
        if (f.requests.some(r => r.id === request.id)) {
          requestExists = true;
          existingCollectionId = col.id;
          existingFolderId = f.id;
          break;
        }
      }
      if (requestExists) break;
    }

    const finalRequest: Request = {
      ...request,
      name: name.trim()
    };

    if (requestExists && existingCollectionId === selectedCollection && existingFolderId === (selectedFolder || null)) {
      // Just update it if it's in the same location
      updateRequest(existingCollectionId, request.id, finalRequest);
      toast.success(`Request "${finalRequest.name}" updated`);
    } else {
      // Either it's new, or user chose a different collection/folder. We'll add it as new (or could move it, but adding is safer for now)
      // If you want to handle moving, that's more complex. We'll treat this as "Save As" if it exists, or "Save" if new.
      const newId = requestExists ? uuidv4() : request.id;
      const requestToSave = { ...finalRequest, id: newId };
      addRequest(selectedCollection, selectedFolder || null, requestToSave);
      
      // Update tab with new id and name
      updateActiveTabRequest({ id: newId, name: finalRequest.name });
      toast.success(`Request "${finalRequest.name}" saved to collection`);
    }
    
    onClose();
  };

  const renderHeader = () => (
    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h2 className="text-h2" style={{ margin: 0, fontSize: '16px' }}>Save Request</h2>
      <button 
        onClick={onClose}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '20px', padding: '4px' }}
      >
        ×
      </button>
    </div>
  );

  return createPortal(
    <div 
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} 
      onClick={onClose}
    >
      <div 
        style={{ width: '450px', backgroundColor: 'var(--bg-deep)', borderRadius: '12px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 48px rgba(0,0,0,0.5)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {renderHeader()}
        
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
              REQUEST NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter request name"
              style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
              SAVE TO COLLECTION
            </label>
            <select
              value={selectedCollection}
              onChange={(e) => {
                setSelectedCollection(e.target.value);
                setSelectedFolder('');
              }}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            >
              {collections.length === 0 && <option value="">No collections available</option>}
              {collections.map(col => (
                <option key={col.id} value={col.id}>{col.name}</option>
              ))}
            </select>
          </div>

          {folders.length > 0 && (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
                SAVE TO FOLDER (OPTIONAL)
              </label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
              >
                <option value="">Root of collection</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button 
              onClick={onClose}
              className="btn-secondary"
              style={{ flex: 1, padding: '12px' }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="btn-primary"
              style={{ flex: 1, padding: '12px' }}
              disabled={!name.trim() || !selectedCollection}
            >
              Save Request
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
