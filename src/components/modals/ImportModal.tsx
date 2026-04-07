import { useState, useRef, useEffect } from 'react';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { ImportService } from '../../services/importService';
import { CurlParser } from '../../services/curl';
import { Request } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportMode = 'file' | 'curl' | 'edit';

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { addCollection, addRequest } = useCollectionStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const collections = useCollectionStore(state => state.collections);
  
  const [mode, setMode] = useState<ImportMode>('file');
  const [isHovering, setIsHovering] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [curlInput, setCurlInput] = useState('');
  const [editRequest, setEditRequest] = useState<Request | null>(null);
  const [editName, setEditName] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setMode('file');
      setCurlInput('');
      setEditRequest(null);
      setEditName('');
      setSelectedCollection('');
      setSelectedFolder('');
      setIsHovering(false);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedCol = collections.find(c => c.id === selectedCollection);
  const folders = selectedCol?.folders || [];

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('Only .json files are supported');
      return;
    }

    setIsProcessing(true);
    try {
      const text = await file.text();
      const newCollection = await ImportService.importPostmanCollection(text);
      if (activeWorkspaceId) {
        await addCollection(newCollection, activeWorkspaceId);
      }
      toast.success(`Successfully imported ${newCollection.name}`);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to import collection');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(true);
  };

  const handleDragLeave = () => {
    setIsHovering(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleParseCurl = () => {
    if (!curlInput.trim()) {
      toast.error('Please enter a cURL command');
      return;
    }

    try {
      const parsedRequest = CurlParser.parse(curlInput);
      setEditRequest(parsedRequest);
      setEditName(parsedRequest.name);
      if (collections.length > 0) {
        setSelectedCollection(collections[0].id);
      }
      setMode('edit');
    } catch (error: any) {
      toast.error('Failed to parse cURL: ' + error.message);
    }
  };

  const handleSaveRequest = () => {
    if (!editRequest || !editName.trim() || !selectedCollection) {
      toast.error('Please fill in all required fields');
      return;
    }

    const finalRequest: Request = {
      ...editRequest,
      id: uuidv4(),
      name: editName.trim()
    };

    const folderId = selectedFolder || null;
    addRequest(selectedCollection, folderId, finalRequest);
    toast.success(`Request "${editName}" saved successfully`);
    onClose();
  };

  const renderHeader = () => (
    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h2 className="text-h2" style={{ margin: 0, fontSize: '16px' }}>
        {mode === 'file' ? 'Import Collection' : mode === 'curl' ? 'Import from cURL' : 'Edit Request'}
      </h2>
      <button 
        onClick={onClose}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '20px', padding: '4px' }}
      >
        ×
      </button>
    </div>
  );

  const renderTabs = () => (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => setMode('file')}
        style={{
          flex: 1,
          padding: '12px',
          background: mode === 'file' ? 'var(--accent-subtle)' : 'transparent',
          border: 'none',
          borderBottom: mode === 'file' ? '2px solid var(--accent-primary)' : '2px solid transparent',
          color: mode === 'file' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        File Import
      </button>
      <button
        onClick={() => setMode('curl')}
        style={{
          flex: 1,
          padding: '12px',
          background: mode === 'curl' ? 'var(--accent-subtle)' : 'transparent',
          border: 'none',
          borderBottom: mode === 'curl' ? '2px solid var(--accent-primary)' : '2px solid transparent',
          color: mode === 'curl' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        cURL Import
      </button>
    </div>
  );

  const renderFileImport = () => (
    <div style={{ padding: '24px' }}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${isHovering ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
          background: isHovering ? 'rgba(37, 99, 235, 0.05)' : 'rgba(0,0,0,0.2)',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        {isProcessing ? (
          <div className="loader-mini" style={{ margin: '0 auto', width: '24px', height: '24px' }}></div>
        ) : (
          <>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.8 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Drag and drop your file here
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>
              or click to browse your computer
            </p>
          </>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept=".json" 
          style={{ display: 'none' }} 
        />
      </div>
    </div>
  );

  const renderCurlImport = () => (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
          CURL COMMAND
        </label>
        <textarea
          value={curlInput}
          onChange={(e) => setCurlInput(e.target.value)}
          placeholder="curl -X GET https://api.example.com/users \\"
          style={{
            width: '100%',
            minHeight: '150px',
            padding: '12px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontFamily: 'monospace',
            outline: 'none',
            resize: 'vertical'
          }}
        />
      </div>
      <button 
        onClick={handleParseCurl}
        className="btn-primary"
        style={{ padding: '12px' }}
        disabled={!curlInput.trim()}
      >
        Parse cURL
      </button>
    </div>
  );

  const renderEditRequest = () => (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
          REQUEST NAME
        </label>
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Enter request name"
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none'
          }}
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
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none'
          }}
        >
          <option value="">Select a collection...</option>
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
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none'
            }}
          >
            <option value="">Root of collection</option>
            {folders.map(folder => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
        </div>
      )}

      {editRequest && (
        <div style={{ 
          padding: '12px', 
          background: 'rgba(0,0,0,0.2)', 
          borderRadius: '8px',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ 
              padding: '2px 8px', 
              borderRadius: '4px', 
              background: 'var(--accent-subtle)', 
              color: 'var(--accent-primary)',
              fontWeight: 600,
              fontSize: '11px'
            }}>
              {editRequest.method}
            </span>
            <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
              {editRequest.url}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button 
          onClick={() => setMode('curl')}
          className="btn-secondary"
          style={{ flex: 1, padding: '12px' }}
        >
          Back
        </button>
        <button 
          onClick={handleSaveRequest}
          className="btn-primary"
          style={{ flex: 1, padding: '12px' }}
          disabled={!editName.trim() || !selectedCollection}
        >
          Save Request
        </button>
      </div>
    </div>
  );

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0,0,0,0.8)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 10000 
      }} 
      onClick={onClose}
    >
      <div 
        style={{ 
          width: '450px', 
          backgroundColor: 'var(--bg-deep)', 
          borderRadius: '12px', 
          border: '1px solid var(--border-default)', 
          display: 'flex', 
          flexDirection: 'column', 
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {renderHeader()}
        {mode !== 'edit' && renderTabs()}
        {mode === 'file' && renderFileImport()}
        {mode === 'curl' && renderCurlImport()}
        {mode === 'edit' && renderEditRequest()}
      </div>
    </div>
  );
}
